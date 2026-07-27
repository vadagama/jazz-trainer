# AUTH-SETUP-GUIDE — Настройка окружений для аутентификации и авторизации

> **Версия:** v1.0 от 2026-07-26
> **Аудитория:** разработчики, DevOps
> **Охват:** dev-режим, Google OAuth, GitHub OAuth, Magic Link (Resend), production-развёртывание

---

## 1. Обзор

Сервис поддерживает три способа аутентификации:

| Способ | Где настроить | Обязателен для dev? |
|---|---|---|
| **Dev-login** | `AUTH_DEV_MODE=true` | Нет (но удобен) |
| **Google OAuth** | Google Cloud Console | Нет |
| **GitHub OAuth** | GitHub Developer Settings | Нет |
| **Magic Link** (email) | Resend | Нет |

Все переменные читаются из `.env` в корне проекта. Конфигурация — в `apps/api/src/config.ts`.

---

## 2. Быстрый старт: dev-режим без OAuth

Самый простой способ для локальной разработки — **dev-login**. Пользователь вводит email и сразу входит, без паролей и внешних сервисов.

### 2.1. `.env`

```env
AUTH_DEV_MODE=true
SESSION_SECRET=local-dev-secret-change-me
```

### 2.2. Запуск

```sh
npm run dev
```

### 2.3. Вход

Открой `http://localhost:5173/login` → секция **Dev mode** → введи email → **Dev sign-in**.

Пользователь создаётся с провайдером `'dev'`, ролью `user`.

> ⚠️ Dev-login отключён в production (`AUTH_DEV_MODE=false`). Эндпоинт `/api/auth/dev-login` возвращает 404.

---

## 3. Google OAuth

Google OAuth позволяет входить через аккаунт Google. Используется PKCE (Proof Key for Code Exchange) + nonce-верификация.

### 3.1. Создание приложения в Google Cloud Console

1. Открой [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Создай проект (или выбери существующий)
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
4. Тип приложения: **Web application**
5. **Authorized redirect URIs**:
   - Dev: `http://localhost:3999/api/auth/google/callback`
   - Prod: `https://твой-домен/api/auth/google/callback`

6. Сохрани — получишь **Client ID** и **Client Secret**

### 3.2. OAuth Consent Screen

1. **APIs & Services** → **OAuth consent screen**
2. Тип: **External** (если не Google Workspace)
3. Заполни: App name, User support email, Developer contact
4. Scopes: `openid`, `email`, `profile`
5. Добавь тестовых пользователей (для dev)

### 3.3. `.env`

```env
GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
# Опционально (совпадает с дефолтом):
# GOOGLE_CALLBACK_URL=http://localhost:3999/api/auth/google/callback
# GOOGLE_HD=your-company.com          # ограничить доменом Google Workspace
```

### 3.4. Проверка

На `http://localhost:5173/login` появится кнопка **Continue with Google**.

### 3.5. Возможные ошибки

| Ошибка | Причина | Решение |
|---|---|---|
| `redirect_uri_mismatch` | URI в запросе не совпадает с разрешённым в консоли | Проверь `GOOGLE_CALLBACK_URL` и Authorized redirect URIs |
| `access_denied` | Пользователь не в списке тестовых | Добавь email в OAuth consent screen → Test users |
| «Google OAuth not configured» (503) | Не заданы `GOOGLE_CLIENT_ID` | Добавь переменную в `.env` |

---

## 4. GitHub OAuth

### 4.1. Создание OAuth App в GitHub

1. Открой [GitHub Developer Settings](https://github.com/settings/developers)
2. **OAuth Apps** → **New OAuth App**
3. Заполни:
   - **Application name**: Amazilia (dev) / Amazilia
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:3999/api/auth/github/callback`
4. **Register application** → сгенерируй **Client Secret**

### 4.2. `.env`

```env
GITHUB_CLIENT_ID=Iv23xxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4.3. Scopes

Запрашивается `user:email` (read-only).

---

## 5. Magic Link (Resend)

### 5.1. Регистрация в Resend

1. [resend.com](https://resend.com) — бесплатный тир: 100 писем/день
2. **API Keys** → **Create API Key**

### 5.2. `.env`

```env
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@amazilia.app
# Для dev-тестов без подтверждённого домена:
# EMAIL_FROM=onboarding@resend.dev
```

### 5.3. Dev-режим без Resend

Если `RESEND_API_KEY` не задан, Magic Link печатается в консоль:

```
[email] DEV MODE — Magic link for user@example.com:
  http://localhost:5173/api/auth/magic-link/verify?token=eyJ...
```

Скопируй ссылку и открой в браузере.

### 5.4. Безопасность

| Угроза | Защита |
|---|---|
| Brute-force отправки | Rate limit: 3/5 мин / IP + email |
| Перехват токена | JWT подписан `SESSION_SECRET`, HTTPS |
| Повторное использование | Токен одноразовый (флаг `used` в БД) |
| Подделка токена | JWT-подпись проверяется на каждом запросе |

---

## 6. Production-развёртывание

### 6.1. Обязательные переменные

```env
NODE_ENV=production
SESSION_SECRET=<random-64-char-string>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://amazilia-api-production.up.railway.app/api/auth/google/callback
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=https://amazilia-api-production.up.railway.app/api/auth/github/callback
RESEND_API_KEY=...
EMAIL_FROM=noreply@amazilia.app
WEB_ORIGIN=https://amazilia-studio.vercel.app
```

> ⚠️ Сервер откажется запускаться, если `SESSION_SECRET` отсутствует или равен дефолтному `'dev-insecure-change-me'`.

### 6.2. Генерация SESSION_SECRET

```sh
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 6.3. Cookie Security (production)

`httpOnly: true`, `secure: true`, `sameSite: 'strict'`, `path: '/'`

---

## 7. Проверка эндпоинтов

```sh
# Me (без авторизации — публичные permissions)
curl http://localhost:3999/api/auth/me

# Google OAuth (302 → Google)
curl -v http://localhost:3999/api/auth/google

# GitHub OAuth (302 → GitHub)
curl -v http://localhost:3999/api/auth/github

# Magic Link send (без Resend ссылка в консоли сервера)
curl -X POST http://localhost:3999/api/auth/magic-link/send \
  -H 'Content-Type: application/json' -d '{"email":"test@example.com"}'

# Dev-login (только DEV)
curl -X POST http://localhost:3999/api/auth/dev-login \
  -H 'Content-Type: application/json' -d '{"email":"test@example.com"}'
```

---

## 8. Устранение неполадок

| Симптом | Причина | Действие |
|---|---|---|
| На `/login` нет кнопок OAuth | Не заданы `GOOGLE_CLIENT_ID` / `GITHUB_CLIENT_ID` | Добавь в `.env`, перезапусти |
| `?error=invalid_state` | CSRF: куки не сохранились | Проверь third-party куки для localhost |
| `?error=redirect_uri_mismatch` | Callback URL не совпадает | Сверь переменную с консолью провайдера |
| Magic Link не приходит | `RESEND_API_KEY` не задан | Ссылка в консоли сервера |
| Resend: 403 | Домен не подтверждён | Используй `onboarding@resend.dev` |
| Production не стартует | `SESSION_SECRET` дефолтный | Сгенерируй ключ (§6.2) |

---

## 9. Связанные документы

- [AUTH.md](../AUTH.md) — целевая архитектура аутентификации
- [ROLES.md](../ROLES.md) — роли и разрешения
- [ARCHITECTURE_BASE.md](../ARCHITECTURE_BASE.md) — текущая архитектура + ADR
- `apps/api/src/config.ts` — `ApiConfig` и `loadConfig`
- `apps/api/src/services/email.service.ts` — отправка Magic Link

---

_Документ подготовлен агентом `tech-writer`. Версия v1.0 от 2026-07-26._
