# AUTH-PLAN — План реализации: регистрация, аутентификация, авторизация

> **На основе:** [AUTH.md](./AUTH.md) v1.2 от 2026-07-26, [ROLES.md](./ROLES.md)
> **Дата:** 2026-07-26
> **Статус:** 🟡 Черновик → 🟢 Валидирован (software-architect, 2026-07-26) → Обновлён (analyst, 2026-07-26 — реприоритизация биллинга, v1.2 — админ-панель + профиль)
> **Суммарная оценка:** ~160 часов (~5 недель одним разработчиком, без учёта будущей Stripe-фазы)

---

## 1. Резюме

План декомпозирует целевое решение AUTH.md на 15 фаз → 61 конкретную задачу. Каждая задача привязана к файлам, имеет критерий готовности (typecheck + lint + test) и оценку сложности.

**Ключевые изменения v1.2:**
- Stripe-интеграция вынесена в отдельную будущую фазу (P3). На текущем этапе биллинг — ручной (email/Telegram).
- Добавлен раздел «Подписки» в админ-панель (аналог управления Каталогом) с обработкой запросов с лэндинга, approve/reject контролами.
- Добавлен раздел «Подписка» в профиле пользователя с текущим статусом и запросами на изменение.

**Текущее состояние (baseline):**

- ✅ Google OAuth (без PKCE, nonce, hd-верификации)
- ✅ RBAC: 4 роли, 27 permissions, `rbac.plugin.ts` middleware, `requirePermission()`
- ✅ Аудит: `withAudit()`, таблица `audit_log`
- ✅ Сессии: базовая модель, cookie `sid`, `httpOnly`, `sameSite: 'lax'`
- ✅ Dev-login (`AUTH_DEV_MODE=true`), `auth.routes.ts`
- 🔴 GitHub OAuth, Magic Link, ручной биллинг, подписки, админ-панель подписок, GDPR, device tracking — отсутствуют
- 🔴 Безопасность: нет rate limiting, Helmet, `secure`-флага, `sameSite: 'strict'`
- 🔴 Прогресс/статистика: не хранятся на сервере
- 🔴 Тема: только в `localStorage`

---

## 2. Задачи (Tasks)

### Фаза 1: Security Hardening

#### T-001. Rate Limiting на auth-эндпоинты

- **Родительский раздел:** AUTH.md §9.1
- **Приоритет:** P0 (безопасность)
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/plugins/rate-limit.plugin.ts` (новый)
- **Описание:**
  1. Установить `@fastify/rate-limit`
  2. Зарегистрировать плагин в `apps/api/src/app.ts`
  3. Настроить лимиты:
     - `POST /api/auth/magic-link/send` — 3 запроса / 5 мин (per IP + email)
     - `GET /api/auth/magic-link/verify` — 5 запросов / 1 мин
     - `POST /api/auth/google` — 10 запросов / 1 мин
     - `POST /api/auth/github` — 10 запросов / 1 мин
     - `POST /api/auth/dev-login` — 5 запросов / 1 мин
  4. Добавить `RATE_LIMIT_MAX` и `RATE_LIMIT_WINDOW_MS` в env
- **Критерий готовности:** `typecheck` + `lint` + интеграционный тест на превышение лимита
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

#### T-002. Security Headers (Helmet)

- **Родительский раздел:** AUTH.md §9.2
- **Приоритет:** P0 (безопасность)
- **Сложность:** XS (<1d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/app.ts`
- **Описание:**
  1. Установить `@fastify/helmet`
  2. Зарегистрировать с рекомендуемыми заголовками (HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- **Критерий готовности:** `typecheck` + `lint` + ручная проверка заголовков в DevTools
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

#### T-003. Усиление Cookie Security

- **Родительский раздел:** AUTH.md §9.3
- **Приоритет:** P0 (безопасность)
- **Сложность:** XS (<1d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/auth.routes.ts`
- **Описание:**
  1. Добавить `secure: process.env.NODE_ENV === 'production'` в cookie-опции
  2. Изменить `sameSite` с `'lax'` на `'strict'`
  3. Проверить, что cookie не ломается при OAuth-редиректах (тестирование)
- **Критерий готовности:** `typecheck` + `lint` + e2e-тест OAuth-потока
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

#### T-004. CORS Audit

- **Родительский раздел:** AUTH.md §9.4
- **Приоритет:** P1
- **Сложность:** XS (<1d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/config.ts`
- **Описание:**
  1. Проверить, что `webOrigin` в production — точное значение (не `*`)
  2. Убедиться, что CORS-заголовки корректны для OAuth-редиректов
- **Критерий готовности:** Ручная проверка в production-like окружении
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

#### T-005. Secrets Management Audit

- **Родительский раздел:** AUTH.md §9.5
- **Приоритет:** P1
- **Сложность:** XS (<1d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/config.ts` + `.env.example`
- **Описание:**
  1. Убедиться, что все секреты читаются из env (не захардкожены)
  2. Обновить `.env.example`
- **Критерий готовности:** Аудит кода — нет секретов в коде
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

---

### Фаза 2: Schema Migration

#### T-006. Миграция таблицы `users`

- **Родительский раздел:** AUTH.md §11.1
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/db/schema.ts` + миграция
- **Описание:**
  1. Добавить поля: `email_verified` (INTEGER DEFAULT 0), `deleted_at` (INTEGER), `providers` (TEXT DEFAULT '[]')
  2. Расширить CHECK constraint для `provider`: добавить `'github'`, `'magic_link'`
- **Критерий готовности:** `typecheck` + `lint` + миграция применяется без ошибок
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

#### T-007. Миграция таблицы `sessions`

- **Родительский раздел:** AUTH.md §11.1
- **Приоритет:** P0
- **Сложность:** XS (<1d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/db/schema.ts` + миграция
- **Описание:**
  1. Добавить поля: `device_name` (TEXT), `ip` (TEXT), `fingerprint` (TEXT), `last_used_at` (INTEGER)
- **Критерий готовности:** `typecheck` + `lint` + миграция применяется без ошибок
- **Зависит от задач:** T-006
- **Статус:** 🔴 Запланировано

#### T-008. Миграция `user_settings.theme`

- **Родительский раздел:** AUTH.md §6.4
- **Приоритет:** P1
- **Сложность:** XS (<1d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/db/schema.ts` + миграция
- **Описание:**
  1. `ALTER TABLE user_settings ADD COLUMN theme TEXT NOT NULL DEFAULT 'dark'`
  2. Обновить DTO в `shared/src/dto.ts`
- **Критерий готовности:** `typecheck` + `lint` + тест DTO-валидации
- **Зависит от задач:** T-006
- **Статус:** 🔴 Запланировано

#### T-009. Создание таблицы `magic_links`

- **Родительский раздел:** AUTH.md §11.2
- **Приоритет:** P0
- **Сложность:** XS (<1d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/db/schema.ts` + миграция
- **Описание:**
  1. Создать таблицу: `id`, `email`, `token_hash`, `used`, `expires_at`, `created_at`
- **Критерий готовности:** `typecheck` + `lint`
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

#### T-010. Создание таблиц платежей и подписок

- **Родительский раздел:** AUTH.md §4.5 + §11.2
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/db/schema.ts` + миграция
- **Описание:**
  1. Создать таблицы: `subscription_tiers`, `subscriptions`, `subscription_requests`, `subscription_history`
  2. Поля `stripe_subscription_id`, `stripe_customer_id` — nullable (будут заполнены при миграции на Stripe)
  3. Seed: создать записи для Free, Pro, Premium в `subscription_tiers`
- **Критерий готовности:** `typecheck` + `lint` + seed идемпотентен
- **Зависит от задач:** T-006
- **Статус:** 🔴 Запланировано

#### T-011. Создание таблиц прогресса и статистики

- **Родительский раздел:** AUTH.md §6.3 + §11.2
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/db/schema.ts` + миграция
- **Описание:**
  1. Создать таблицы: `exercise_progress`, `exercise_results`, `theory_progress`, `user_stats`
- **Критерий готовности:** `typecheck` + `lint`
- **Зависит от задач:** T-006
- **Статус:** 🔴 Запланировано

#### T-012. Создание таблицы `consent_records` (GDPR)

- **Родительский раздел:** AUTH.md §11.2
- **Приоритет:** P1
- **Сложность:** XS (<1d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/db/schema.ts` + миграция
- **Описание:**
  1. Создать таблицу: `id`, `user_id`, `consent_type`, `granted`, `ip`, `user_agent`, `created_at`
- **Критерий готовности:** `typecheck` + `lint`
- **Зависит от задач:** T-006
- **Статус:** 🔴 Запланировано

---

### Фаза 3: GitHub OAuth

#### T-013. GitHub OAuth — эндпоинты

- **Родительский раздел:** AUTH.md §2.3
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/auth.routes.ts` (расширение)
- **Описание:**
  1. `GET /api/auth/github` — редирект на GitHub OAuth (с PKCE, state)
  2. `GET /api/auth/github/callback` — обработка callback
  3. Логика account linking (совпадение email → объединение провайдеров)
- **Критерий готовности:** `typecheck` + `lint` + интеграционный тест
- **Зависит от задач:** T-006, T-007
- **Статус:** 🔴 Запланировано

#### T-014. GitHub OAuth — конфигурация и env

- **Родительский раздел:** AUTH.md §2.3
- **Приоритет:** P0
- **Сложность:** XS (<1d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/config.ts` + `.env.example`
- **Описание:**
  1. Добавить env: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`
  2. Зарегистрировать OAuth-приложение на GitHub
- **Критерий готовности:** Ручная проверка OAuth-потока
- **Зависит от задач:** T-013
- **Статус:** 🔴 Запланировано

---

### Фаза 4: Усиление Google OAuth

#### T-015. Усиление Google OAuth (PKCE, nonce, hd)

- **Родительский раздел:** AUTH.md §2.2
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/auth.routes.ts`
- **Описание:**
  1. Добавить PKCE в существующий Google OAuth-поток
  2. Добавить nonce-верификацию в ID Token
  3. Опционально: верификация `hd` (hosted domain)
- **Критерий готовности:** `typecheck` + `lint` + существующие e2e-тесты OAuth проходят
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

---

### Фаза 5: Magic Link

#### T-016. Email-сервис

- **Родительский раздел:** AUTH.md §12
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/services/email.service.ts` (новый)
- **Описание:**
  1. Реализовать `sendMagicLink(email, token, name?)` через Resend API
  2. Реализовать `sendSubscriptionNotification(email, type)` для уведомлений о подписке
  3. Добавить env: `EMAIL_FROM`, `EMAIL_PROVIDER`, `RESEND_API_KEY`
- **Критерий готовности:** `typecheck` + `lint` + юнит-тест с mock Resend API
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

#### T-017. Magic Link — эндпоинт отправки

- **Родительский раздел:** AUTH.md §2.4.2
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/auth.routes.ts` (расширение)
- **Описание:**
  1. `POST /api/auth/magic-link/send`:
     - Rate limit (см. T-001)
     - Генерация JWT (15 мин TTL, подпись `SESSION_SECRET`)
     - Сохранение `token_hash` в `magic_links`
     - Отправка email через `email.service.ts`
     - Аудит: `auth:magic_link:sent`
  2. `GET /api/auth/magic-link/verify`:
     - Валидация JWT (подпись, срок, не использован)
     - Создание/поиск пользователя по email
     - Пометить токен использованным
     - Создать сессию → cookie → редирект
     - Аудит: `auth:magic_link:verified`
- **Критерий готовности:** `typecheck` + `lint` + интеграционный тест полного потока
- **Зависит от задач:** T-009, T-016
- **Статус:** 🔴 Запланировано

#### T-018. Magic Link — почтовый шаблон

- **Родительский раздел:** AUTH.md §2.4.3
- **Приоритет:** P1
- **Сложность:** XS (<1d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/templates/magic-link.html` (новый)
- **Описание:**
    1. Создать HTML-шаблон письма с брендингом Amazilia
  2. Переменные: `{{name}}`, `{{magicLinkUrl}}`
- **Критерий готовности:** Ручная проверка в DevTools (письмо отображается корректно)
- **Зависит от задач:** T-017
- **Статус:** 🔴 Запланировано

---

### Фаза 6: Тема и настройки на сервере

#### T-019. Миграция темы из localStorage → сервер

- **Родительский раздел:** AUTH.md §6.4
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `apps/web` + `apps/api`
- **Модуль:** `apps/web/src/hooks/useTheme.ts` + `apps/api/src/routes/settings.routes.ts`
- **Описание:**
  1. Обновить `useTheme.ts`:
     - При загрузке: localStorage (мгновенно) → apply; API `/api/auth/me` → синхронизировать
     - При переключении: localStorage + PATCH `/api/settings` (фоновый запрос)
  2. Расширить `PATCH /api/settings` для поля `theme`
  3. `GET /api/auth/me` — возвращать `settings.theme`
- **Критерий готовности:** `typecheck` + `lint` + ручная проверка синхронизации
- **Зависит от задач:** T-008
- **Статус:** 🔴 Запланировано

---

### Фаза 7: Прогресс и статистика

#### T-020. API прогресса упражнений

- **Родительский раздел:** AUTH.md §6.3
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/progress.routes.ts` (новый)
- **Описание:**
  1. `POST /api/progress/exercise` — сохранить результат попытки:
     - Запись в `exercise_results`
     - Обновление `exercise_progress` (upsert)
     - Обновление `user_stats`
  2. `GET /api/progress/exercises` — прогресс по всем типам
  3. `GET /api/progress/stats` — агрегированная статистика (streak, total time)
  4. Streak-логика: обновляется при каждом `POST` (проверка `last_practice_date`)
- **Критерий готовности:** `typecheck` + `lint` + юнит-тесты streak-логики
- **Зависит от задач:** T-011
- **Статус:** 🔴 Запланировано

#### T-021. API прогресса теории

- **Родительский раздел:** AUTH.md §6.3
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/progress.routes.ts` (расширение)
- **Описание:**
  1. `POST /api/progress/theory` — обновить статус лекции (not_started / in_progress / completed)
  2. `GET /api/progress/theory` — прогресс по всем лекциям
- **Критерий готовности:** `typecheck` + `lint`
- **Зависит от задач:** T-011
- **Статус:** 🔴 Запланировано

#### T-022. Интеграция прогресса в плагины

- **Родительский раздел:** AUTH.md §6.3
- **Приоритет:** P1
- **Сложность:** L (1–2w)
- **Слой:** `packages/plugins/*`
- **Модуль:** Все плагины практики и теории
- **Описание:** В каждый плагин практики/теории добавить вызов `POST /api/progress/*` после завершения упражнения/лекции
- **Критерий готовности:** `typecheck` + `lint` + ручная проверка сохранения прогресса
- **Зависит от задач:** T-020, T-021
- **Статус:** 🔴 Запланировано

---

### Фаза 8: Ручной биллинг + Subscription → RBAC

> **Ключевое изменение v1.2:** Биллинг на текущем этапе — ручной (email/Telegram). Управление подписками — через раздел «Подписки» в админ-панели (аналог управления Каталогом) + раздел «Подписка» в профиле пользователя. Stripe — будущая фаза (см. Фазу 15).

#### T-023. API подписок и запросов (admin)

- **Родительский раздел:** AUTH.md §4.4
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/admin-subscriptions.routes.ts` (новый)
- **Описание:**
  1. `GET /api/admin/subscriptions` — список всех подписок (фильтры: статус, tier, поиск по email)
  2. `GET /api/admin/subscriptions/:userId` — просмотр подписки (требует `billing:manage`)
  3. `PUT /api/admin/subscriptions/:userId` — активация/изменение/отмена подписки:
     - `body: { tier: 'pro' | 'premium' | null, months?: number }`
     - Автоматически назначает/удаляет роль `subscriber_{tier}`
     - Пишет аудит + `subscription_history`
     - Отправляет email-уведомление пользователю
  4. `GET /api/admin/subscription-requests` — входящие запросы (пагинация, фильтр по статусу)
  5. `POST /api/admin/subscription-requests/:id/approve` — одобрить → создать подписку + роль + email
  6. `POST /api/admin/subscription-requests/:id/reject` — отклонить (body: `{ reason }`)
  7. `POST /api/admin/subscription-requests/:id/request-info` — запросить уточнение
- **Критерий готовности:** `typecheck` + `lint` + интеграционный тест
- **Зависит от задач:** T-010, T-025
- **Статус:** 🔴 Запланировано

#### T-024. Cron-задача деградации подписок

- **Родительский раздел:** AUTH.md §4.3 + §4.4.3
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/services/billing.service.ts` (новый) + cron
- **Описание:**
  1. Ежедневная cron-задача:
     - Проверяет подписки с истёкшим `current_period_end`
     - Если в grace period (7 дней) и он истёк → деградация до Free
     - Если не в grace period → вход в grace period, отправка уведомления
  2. Уведомления администратору о подписках, требующих внимания (email/Telegram)
  3. Аудит: `billing:degraded:to_free`
  4. Добавить env: `ADMIN_TELEGRAM_CHAT_ID`, `ADMIN_EMAIL`
- **Критерий готовности:** `typecheck` + `lint` + юнит-тесты на переходы состояний
- **Зависит от задач:** T-023, T-016
- **Статус:** 🔴 Запланировано

#### T-025. Новые роли подписчиков и permissions

- **Родительский раздел:** AUTH.md §5.1 + §5.2
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/services/rbac.service.ts` + `apps/api/src/db/seed.ts`
- **Описание:**
  1. В `RBAC_ROLES` добавить: `SUBSCRIBER_FREE`, `SUBSCRIBER_PRO`, `SUBSCRIBER_PREMIUM`
  2. В `RBAC_PERMISSIONS` добавить: `BILLING_READ`, `BILLING_MANAGE`
  3. В `SEED_ROLES` добавить seed-записи для трёх ролей подписчиков с матрицей permissions из AUTH.md §5.3
  4. В `SEED_PERMISSIONS` добавить `BILLING_READ`, `BILLING_MANAGE`
- **Критерий готовности:** `typecheck` + `lint` + `npm run test` (seed идемпотентен)
- **Зависит от задач:** T-010 (subscription_tiers)
- **Статус:** 🔴 Запланировано

#### T-026. Привязка подписки к ролям

- **Родительский раздел:** AUTH.md §4.2 + §5.3
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/services/billing.service.ts` (расширение)
- **Описание:**
  1. При активации подписки (админом): добавить пользователю роль `subscriber_{tier}` через `user_roles`
  2. При отмене/деградации: удалить роль `subscriber_{tier}`, добавить `subscriber_free`
  3. Убедиться, что `resolvePermissions()` корректно агрегирует permissions из ролей подписчика
- **Критерий готовности:** `typecheck` + `lint` + интеграционный тест: активация → роль → permissions
- **Зависит от задач:** T-023, T-025
- **Статус:** 🔴 Запланировано

#### T-027. Feature-gating на фронте (per-tier)

- **Родительский раздел:** AUTH.md §5.3
- **Приоритет:** P2
- **Сложность:** M (3–5d)
- **Слой:** `packages/plugins/*` + `packages/plugin-sdk`
- **Модуль:** Все плагины, затрагиваемые per-tier доступом
- **Описание:**
  1. Обновить `usePermission()` для проверки tier-specific permissions
  2. В плагины добавить проверки `usePermission('exercises:earTraining')`, `usePermission('exercises:rhythmDrills')` и т.д.
  3. UI: показывать lock-иконку / upgrade-prompt для функций, недоступных на текущем tier
- **Критерий готовности:** `typecheck` + `lint` + ручная проверка: Free-пользователь видит ограничения
- **Зависит от задач:** T-025, T-026
- **Статус:** 🔴 Запланировано

#### T-055. Админ-панель: раздел «Подписки» (UI-плагин)

- **Родительский раздел:** AUTH.md §4.4.1
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** `packages/plugins/admin`
- **Модуль:** `packages/plugins/admin/subscriptions/` (новый плагин)
- **Описание:**
  1. Создать плагин по аналогии с плагином управления Каталогом
  2. Структура:
     - Вкладка «Запросы» — таблица входящих заявок, фильтры по статусу, кнопки Approve/Reject/RequestInfo
     - Вкладка «Активные» — таблица активных подписок, фильтры по tier, поиск по email, кнопки действий (Изменить/Приостановить/Отменить/Продлить)
     - Вкладка «Завершённые» — архив отменённых/истёкших
     - Детальный просмотр: история операций по подписке (из `subscription_history`)
  3. Интеграция с API: T-023 (admin-subscriptions.routes.ts)
  4. Доступ: только роли с `billing:manage`
- **Критерий готовности:** `typecheck` + `lint` + ручная проверка approve/reject flow
- **Зависит от задач:** T-023
- **Статус:** 🔴 Запланировано

#### T-056. Лэндинг: форма запроса подписки

- **Родительский раздел:** AUTH.md §4.4.2
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `apps/web` + `apps/api`
- **Модуль:** `apps/web/src/components/LandingSubscriptionForm.tsx` (новый) + `apps/api/src/routes/subscription-request.routes.ts` (новый)
- **Описание:**
  1. Форма на лэндинге: поля `email`, `name`, `desired_tier` (radio: pro/premium), `message` (textarea)
  2. `POST /api/subscription-request` — публичный эндпоинт (не требует auth):
     - Сохраняет запрос в `subscription_requests` со статусом `pending`
     - Rate limit: 1 запрос / 24 часа с одного IP
     - Возвращает: `{ message: "Заявка принята" }`
  3. Валидация: email формат, tier ∈ {pro, premium}
- **Критерий готовности:** `typecheck` + `lint` + e2e: форма → запись в БД → появляется в админ-панели
- **Зависит от задач:** T-010 (subscription_requests), T-023
- **Статус:** 🔴 Запланировано

#### T-057. Профиль пользователя: раздел «Подписка»

- **Родительский раздел:** AUTH.md §4.6
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `apps/web` + `apps/api`
- **Модуль:** `apps/web/src/components/ProfileSubscription.tsx` (новый) + `apps/api/src/routes/subscription.routes.ts` (новый)
- **Описание:**
  1. API:
     - `GET /api/subscription` — текущая подписка (tier, статус, период, grace_period) + доступные действия
     - `POST /api/subscription/request-change` — запрос на изменение (upgrade/downgrade/cancel)
       - Создаёт запись в `subscription_requests` со статусом `pending`
       - Отправляет email-уведомление администратору
  2. UI в профиле:
     - Карточка «Подписка»: текущий tier, статус, дата окончания, progress bar периода
     - Кнопки действий: «Перейти на Pro/Premium», «Отменить подписку» — открывают форму с комментарием
     - История изменений подписки (таблица)
     - Сравнение тарифов
  3. Все действия пользователя создают запрос (не меняют подписку напрямую) — администратор обрабатывает
- **Критерий готовности:** `typecheck` + `lint` + ручная проверка: запрос → появляется в админ-панели → одобрение → обновление в профиле
- **Зависит от задач:** T-023, T-026
- **Статус:** 🔴 Запланировано

---

### Фаза 9: GDPR Compliance

#### T-028. Data Export

- **Родительский раздел:** AUTH.md §7.1
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/gdpr.routes.ts` (новый)
- **Описание:**
  1. `POST /api/gdpr/export` (требует re-authentication):
     - Сбор всех данных пользователя: профиль, настройки, сессии, композиции, лайки, прогресс, статистика, история подписки
     - Формирование JSON-файла
     - Одноразовая ссылка на скачивание (24 часа TTL)
     - Аудит: `gdpr:export`
- **Критерий готовности:** `typecheck` + `lint` + интеграционный тест
- **Зависит от задач:** T-006, T-007, T-011, T-012
- **Статус:** 🔴 Запланировано

#### T-029. Account Deletion (двухфазное)

- **Родительский раздел:** AUTH.md §7.2
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/gdpr.routes.ts` (расширение) + `apps/api/src/services/gdpr.service.ts` (новый)
- **Описание:**
  1. Soft delete:
     - `POST /api/gdpr/delete` (требует re-auth через Magic Link)
     - `users.status = 'deleted'`, `users.deleted_at = now()`
     - Инвалидация всех сессий
     - Аудит: `gdpr:delete:requested`
  2. Подтверждение через Magic Link
  3. Hard delete (cron, через 30 дней):
     - Удаление всех данных (см. AUTH.md §6.7)
     - Аудит: `gdpr:delete:completed`
  4. Возможность восстановления в течение 30 дней
- **Критерий готовности:** `typecheck` + `lint` + интеграционный тест полного цикла
- **Зависит от задач:** T-017 (Magic Link для re-auth)
- **Статус:** 🔴 Запланировано

#### T-030. Consent Tracking

- **Родительский раздел:** AUTH.md §7.3
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `apps/api` + `apps/web`
- **Модуль:** `apps/api/src/routes/gdpr.routes.ts` (расширение) + `apps/web/src/components/ConsentBanner.tsx` (новый)
- **Описание:**
  1. `POST /api/gdpr/consent` — сохранить согласие в `consent_records`
  2. `GET /api/gdpr/consent` — текущие согласия пользователя
  3. Consent-баннер при регистрации + настройки в профиле
- **Критерий готовности:** `typecheck` + `lint` + ручная проверка UI
- **Зависит от задач:** T-012
- **Статус:** 🔴 Запланировано

#### T-031. Data Retention Cron

- **Родительский раздел:** AUTH.md §7.4
- **Приоритет:** P2
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/services/gdpr.service.ts` (расширение) + cron
- **Описание:**
  1. Ежедневная очистка: expired magic_links, expired sessions
  2. Ежемесячная очистка: audit_log старше 1 года
  3. Ежедневная проверка: hard-delete для аккаунтов с `deleted_at` > 30 дней
- **Критерий готовности:** `typecheck` + `lint` + юнит-тесты
- **Зависит от задач:** T-029
- **Статус:** 🔴 Запланировано

---

### Фаза 10: Device Tracking и управление сессиями

#### T-032. Список активных сессий

- **Родительский раздел:** AUTH.md §3.3
- **Приоритет:** P2
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/auth.routes.ts` (расширение)
- **Описание:**
  1. `GET /api/auth/sessions` — список сессий с device, ip, временем
  2. `DELETE /api/auth/sessions/:id` — завершить конкретную сессию
  3. `DELETE /api/auth/sessions` — завершить все кроме текущей
- **Критерий готовности:** `typecheck` + `lint` + интеграционный тест
- **Зависит от задач:** T-007
- **Статус:** 🟢 Реализовано (31 тест, фаза 10 пройдена)

#### T-033. Device Fingerprint

- **Родительский раздел:** AUTH.md §3.1
- **Приоритет:** P2
- **Сложность:** S (1–2d)
- **Слой:** `apps/api` + `apps/web`
- **Модуль:** `apps/api/src/plugins/auth.plugin.ts` + `apps/web/src/hooks/useAuth.ts`
- **Описание:**
  1. При создании сессии: вычислить fingerprint = SHA-256(user-agent + /24 IP-префикс)
  2. При каждом запросе: сравнить fingerprint. При несовпадении → 401
  3. На фронте: отправлять user-agent в заголовке или вычислять на сервере
- **Критерий готовности:** `typecheck` + `lint` + тест на смену fingerprint
- **Зависит от задач:** T-032, T-003
- **Статус:** 🟢 Реализовано (31 тест, фаза 10 пройдена)

#### T-034. Sliding Expiration

- **Родительский раздел:** AUTH.md §3.2
- **Приоритет:** P2
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/plugins/auth.plugin.ts`
- **Описание:**
  1. Изменить логику сессий:
     - При каждом запросе: если `(now - created_at) < maxAbsoluteTtl` → продлить `expiresAt = now + sessionTtl`
     - Иначе → удалить сессию, 401
  2. Настроить: `maxAbsoluteTtl = 7d`, `sessionTtl = 24h`
  3. Добавить env: `SESSION_MAX_ABSOLUTE_TTL_MS`
- **Критерий готовности:** `typecheck` + `lint` + тест sliding expiration
- **Зависит от задач:** T-007
- **Статус:** 🟢 Реализовано (31 тест, фаза 10 пройдена)

---

### Фаза 11: Account Linking

#### T-035. Связывание аккаунтов по email

- **Родительский раздел:** AUTH.md §6.6
- **Приоритет:** P2
- **Сложность:** M (3–5d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/auth.routes.ts` (расширение)
- **Описание:**
  1. При OAuth/Magic Link логине: если email уже существует → проверить провайдера
  2. Если провайдер другой → объединить аккаунты:
     - Добавить провайдера в `users.providers` (JSON-массив)
     - Обновить avatar/name если были пустые
     - Аудит: `auth:oauth:linked`
  3. Обработка конфликтов: если у существующего пользователя `provider = 'magic_link'`, а новый вход через Google — объединить
- **Критерий готовности:** `typecheck` + `lint` + интеграционный тест: Google → GitHub → тот же аккаунт
- **Зависит от задач:** T-013, T-017
- **Статус:** 🔴 Запланировано

---

### Фаза 12: Расширенный аудит

#### T-036. Новые audit actions

- **Родительский раздел:** AUTH.md §8.1
- **Приоритет:** P2
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/services/audit.service.ts` (расширение)
- **Описание:**
  1. Добавить константы для новых audit actions
  2. Интегрировать `withAudit` в:
     - Magic Link send/verify (`auth:magic_link:sent`, `auth:magic_link:verified`)
     - OAuth account linking (`auth:oauth:linked`)
     - Session termination (`auth:session:terminated`, `auth:sessions:terminated_all`)
     - Admin billing operations (`billing:subscription:*`, `billing:request:approved`, `billing:request:rejected`)
     - GDPR operations (`gdpr:*`)
- **Критерий готовности:** `typecheck` + `lint` + проверка записей в audit_log
- **Зависит от задач:** T-017, T-023, T-029
- **Статус:** 🔴 Запланировано

#### T-037. Аудит в billing-операциях

- **Родительский раздел:** AUTH.md §8.2
- **Приоритет:** P2
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/services/billing.service.ts` (расширение)
- **Описание:**
  1. Все мутации подписок (создание/изменение/отмена через админ-панель) пишутся в `subscription_history` + `audit_log` атомарно через `withAudit`
  2. Reason: `'admin_manual'`
  3. Автоматическая деградация (cron): reason `'system_cron'`
  4. Операции approve/reject запросов: reason `'admin_manual'`
- **Критерий готовности:** `typecheck` + `lint` + тест: запись появляется в обеих таблицах
- **Зависит от задач:** T-023, T-036
- **Статус:** 🔴 Запланировано

---

### Фаза 13: super_admin Security Hardening (дополнительно)

#### T-038. 2FA/MFA для super_admin (TOTP)

- **Родительский раздел:** AUTH.md §5.4.2 (#11)
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/auth.routes.ts` (расширение) + `apps/api/src/services/totp.service.ts` (новый)
- **Описание:**
  1. Установить `otplib`
  2. `POST /api/auth/totp/setup` — генерация секрета + QR-код
  3. `POST /api/auth/totp/verify` — проверка TOTP-кода
  4. При логине super_admin: после OAuth/Magic Link → требовать TOTP
- **Критерий готовности:** `typecheck` + `lint` + интеграционный тест
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

#### T-039. Укороченный session TTL для super_admin

- **Родительский раздел:** AUTH.md §5.4.2 (#13)
- **Приоритет:** P1
- **Сложность:** XS (<1d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/plugins/auth.plugin.ts`
- **Описание:**
  1. Если пользователь имеет роль `super_admin`: `maxAbsoluteTtl = 15 мин`
  2. Sliding expiration: каждое действие продлевает
- **Критерий готовности:** `typecheck` + `lint` + тест: бездействие >15 мин → 401
- **Зависит от задач:** T-034
- **Статус:** 🔴 Запланировано

#### T-040. IP-allowlist для admin-эндпоинтов

- **Родительский раздел:** AUTH.md §5.4.2 (#12)
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/plugins/admin-ip-filter.plugin.ts` (новый)
- **Описание:**
  1. Middleware: для `/api/admin/*` проверять IP из `ADMIN_IP_ALLOWLIST`
  2. Только для роли `super_admin` (админы с ролью `admin` не ограничены)
  3. env: `ADMIN_IP_ALLOWLIST` (CSV список IP/CIDR)
- **Критерий готовности:** `typecheck` + `lint` + тест с разрешённым/запрещённым IP
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

#### T-041. Инвалидация сессий при смене роли

- **Родительский раздел:** AUTH.md §5.4.2 (#14)
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/admin-users.routes.ts`
- **Описание:**
  1. При изменении роли пользователя через `PUT /api/admin/users/:id/roles`: инвалидировать все его сессии
  2. Аудит: `auth:sessions:terminated_all`
- **Критерий готовности:** `typecheck` + `lint` + интеграционный тест
- **Зависит от задач:** T-032
- **Статус:** 🔴 Запланировано

#### T-042. Уведомление о входе super_admin

- **Родительский раздел:** AUTH.md §5.4.2 (#15)
- **Приоритет:** P2
- **Сложность:** XS (<1d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/auth.routes.ts` (расширение)
- **Описание:**
  1. При успешной аутентификации super_admin — отправить email/webhook с инфо: время, IP, user-agent
- **Критерий готовности:** `typecheck` + `lint` + ручная проверка уведомления
- **Зависит от задач:** T-016
- **Статус:** 🔴 Запланировано

#### T-043. Re-auth перед критическими операциями

- **Родительский раздел:** AUTH.md §5.4.2 (#16)
- **Приоритет:** P2
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/admin-users.routes.ts`
- **Описание:**
  1. Для `DELETE /api/admin/users/:id` и `PUT /api/admin/users/:id/roles`: требовать step-up аутентификацию (повторный TOTP)
  2. Middleware `requireStepUp()` — проверяет свежий TOTP-токен
- **Критерий готовности:** `typecheck` + `lint` + интеграционный тест
- **Зависит от задач:** T-038
- **Статус:** 🔴 Запланировано

---

### Фаза 14: Тестирование и документация

#### T-044. Юнит-тесты новых сервисов

- **Родительский раздел:** AUTH.md (все разделы)
- **Приоритет:** P1
- **Сложность:** L (1–2w)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/services/__tests__/`
- **Описание:**
  1. Юнит-тесты: `email.service`, `totp.service`, `billing.service`, `gdpr.service`
  2. Юнит-тесты: `rbac.service` (новые роли подписчиков)
  3. Юнит-тесты: streak-логика, grace period, деградация подписок, approve/reject запросов
- **Критерий готовности:** `npm run test` — coverage новых модулей ≥ 80%
- **Зависит от задач:** Все сервисные задачи
- **Статус:** 🔴 Запланировано

#### T-045. Интеграционные тесты auth-потоков

- **Родительский раздел:** AUTH.md (все разделы)
- **Приоритет:** P1
- **Сложность:** L (1–2w)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/__tests__/`
- **Описание:**
  1. Интеграционные тесты: GitHub OAuth flow (mock), Magic Link flow, account linking
  2. Интеграционные тесты: управление подписками (admin), approve/reject запросов, деградация, RBAC per-tier
  3. Интеграционные тесты: лэндинг-форма → запрос → админ-панель → approve → активация
  4. Интеграционные тесты: профиль пользователя → запрос на изменение → approve → обновление
  5. Интеграционные тесты: GDPR export/delete, consent tracking
- **Критерий готовности:** `npm run test` — все интеграционные тесты проходят
- **Зависит от задач:** T-013, T-017, T-023, T-028, T-029, T-055, T-056, T-057
- **Статус:** 🔴 Запланировано

#### T-046. E2E тесты (Playwright)

- **Родительский раздел:** AUTH.md (все разделы)
- **Приоритет:** P2
- **Сложность:** M (3–5d)
- **Слой:** `e2e/`
- **Модуль:** `e2e/tests/auth/`
- **Описание:**
  1. E2E: OAuth-логин (Google, GitHub — mock), Magic Link (mock email)
  2. E2E: лэндинг-форма → админ-панель → approve → пользователь видит подписку в профиле
  3. E2E: просмотр прогресса, переключение темы, синхронизация
  4. E2E: consent-баннер, GDPR-запросы
- **Критерий готовности:** `npm run e2e` — auth-сценарии проходят
- **Зависит от задач:** Все функциональные задачи
- **Статус:** 🔴 Запланировано

#### T-047. Обновление ROLES.md

- **Родительский раздел:** AUTH.md §5
- **Приоритет:** P1
- **Сложность:** XS (<1d)
- **Слой:** `docs/`
- **Модуль:** `docs/ROLES.md`
- **Описание:**
  1. Добавить роли `subscriber_free`, `subscriber_pro`, `subscriber_premium`
  2. Добавить permissions `BILLING_READ`, `BILLING_MANAGE`
  3. Обновить матрицу с per-tier доступом
- **Критерий готовности:** Документ актуален
- **Зависит от задач:** T-025
- **Статус:** 🔴 Запланировано

#### T-048. Обновление FUNCTIONS.md

- **Родительский раздел:** AUTH.md (все разделы)
- **Приоритет:** P2
- **Сложность:** XS (<1d)
- **Слой:** `docs/`
- **Модуль:** `docs/FUNCTIONS.md`
- **Описание:**
  1. Добавить новые возможности: GitHub OAuth, Magic Link, подписки, админ-панель подписок, профиль-подписка, прогресс, GDPR
- **Критерий готовности:** Документ актуален
- **Зависит от задач:** Все функциональные задачи
- **Статус:** 🔴 Запланировано

#### T-049. Обновление ARCHITECTURE_BASE.md (ADR-018–028)

- **Родительский раздел:** AUTH.md §14
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `docs/`
- **Модуль:** `docs/ARCHITECTURE_BASE.md`
- **Описание:**
  1. Добавить ADR-018–028 в раздел ADR
  2. Обновить статус фаз
- **Критерий готовности:** Документ актуален
- **Зависит от задач:** Все функциональные задачи
- **Статус:** 🔴 Запланировано

#### T-050. Обновление CLAUDE.md

- **Родительский раздел:** —
- **Приоритет:** P2
- **Сложность:** XS (<1d)
- **Слой:** `docs/`
- **Модуль:** `CLAUDE.md`
- **Описание:**
  1. Обновить карту «Где что лежит»: новые сервисы, маршруты, таблицы, плагины (admin/subscriptions)
- **Критерий готовности:** Навигация актуальна
- **Зависит от задач:** Все функциональные задачи
- **Статус:** 🔴 Запланировано

---

### Фаза 15: 🔮 Stripe Integration (P3, будущее)

> **Приоритет:** P3. Не блокирует запуск. Выполняется после Фазы 8, когда объём пользователей сделает ручной биллинг неэффективным.

#### T-051. Stripe SDK и конфигурация

- **Родительский раздел:** AUTH.md §10.1
- **Приоритет:** P3
- **Сложность:** S (1–2d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/services/billing.service.ts` (расширение) + `apps/api/src/config.ts`
- **Описание:**
  1. Установить `stripe` npm-пакет
  2. Инициализировать Stripe-клиент с `STRIPE_SECRET_KEY`
  3. Добавить env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM`
  4. Обновить seed: заполнить `stripe_price_id` в `subscription_tiers`
- **Критерий готовности:** `typecheck` + `lint` + Stripe-клиент инициализируется без ошибок
- **Зависит от задач:** T-010 (таблицы платежей)
- **Статус:** 🔴 Запланировано (P3)

#### T-052. Stripe Checkout Session

- **Родительский раздел:** AUTH.md §10.2
- **Приоритет:** P3
- **Сложность:** M (3–5d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/billing.routes.ts` (новый)
- **Описание:**
  1. `POST /api/billing/checkout`:
     - Принимает `{ tier: 'pro' | 'premium' }`
     - Создаёт Stripe Checkout Session с `client_reference_id = user.id`
     - Возвращает URL для редиректа
  2. `GET /api/billing/portal` — редирект на Stripe Customer Portal
  3. `GET /api/billing/subscription` — текущая подписка пользователя
- **Критерий готовности:** `typecheck` + `lint` + интеграционный тест (mock Stripe API)
- **Зависит от задач:** T-051
- **Статус:** 🔴 Запланировано (P3)

#### T-053. Stripe Webhook

- **Родительский раздел:** AUTH.md §10.3
- **Приоритет:** P3
- **Сложность:** M (3–5d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/routes/billing.routes.ts` (расширение)
- **Описание:**
  1. `POST /api/billing/webhook`:
     - Верификация подписи через `STRIPE_WEBHOOK_SECRET`
     - Обработка событий:
       - `checkout.session.completed` → активация подписки, роль `subscriber_{tier}`
       - `customer.subscription.updated` → изменение tier
       - `customer.subscription.deleted` → удаление роли подписчика, деградация до Free
       - `invoice.payment_failed` → grace period, уведомление
     - Атомарный аудит через `withAudit` (reason: `'stripe_webhook'`)
  2. Grace period: после Stripe может быть сокращён до 3 дней
- **Критерий готовности:** `typecheck` + `lint` + интеграционный тест (mock Stripe webhook)
- **Зависит от задач:** T-052, T-016
- **Статус:** 🔴 Запланировано (P3)

#### T-054. Миграция с ручного на Stripe-биллинг

- **Родительский раздел:** AUTH.md §10.4
- **Приоритет:** P3
- **Сложность:** M (3–5d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/services/billing.service.ts` + скрипт миграции
- **Описание:**
  1. Создать Stripe Customer для каждого пользователя с активной подпиской
  2. Создать Stripe Subscription для каждого
  3. Заполнить `stripe_subscription_id`, `stripe_customer_id`
  4. Создать таблицу `payment_history` (Stripe-специфичная)
  5. Включить пользовательские эндпоинты (`POST /api/billing/checkout`, `GET /api/billing/portal`)
  6. Отключить ручные эндпоинты `PUT /api/admin/subscriptions/:userId`
- **Критерий готовности:** `typecheck` + `lint` + интеграционный тест миграции
- **Зависит от задач:** T-053
- **Статус:** 🔴 Запланировано (P3)

---

## 3. Последовательность (Ordering)

Рекомендуемый порядок выполнения фаз с учётом зависимостей:

```
Фаза 1 (Security) ─────────────────────────────────────────────┐
  T-001 T-002 T-003 T-004 T-005                                 │
                                                                │
Фаза 2 (Schema) ────────────────────────────────────────────────┤
  T-006 (users) ─┬─ T-007 (sessions)                            │
                 ├─ T-008 (theme)                                │
                 ├─ T-009 (magic_links)                          │
                 ├─ T-010 (payments + subscriptions + requests)  │
                 ├─ T-011 (progress)                             │
                 └─ T-012 (consent)                              │
                                                                │
Фаза 3 (GitHub OAuth) ──────────────────────────────────────────┤
  T-013 ─► T-014                                                │
                                                                │
Фаза 4 (Google OAuth усиление) ─────────────────────────────────┤
  T-015                                                         │
                                                                │
Фаза 5 (Magic Link) ────────────────────────────────────────────┤
  T-016 ─► T-017 ─► T-018                                       │
                                                                │
Фаза 6 (Тема на сервере) ───────────────────────────────────────┤
  T-019 (зависит от T-008)                                      │
                                                                │
Фаза 7 (Прогресс) ──────────────────────────────────────────────┤
  T-020 ─► T-021 ─► T-022                                       │
                                                                │
Фаза 8 (Ручной биллинг + RBAC + UI) ────────────────────────────┤
  T-025 ─► T-023 ─► T-024 ─► T-026 ─► T-027                     │
  T-023 ─► T-055 (админ-панель UI)                              │
  T-023 ─► T-056 (лэндинг-форма)                                │
  T-023 ─► T-026 ─► T-057 (профиль-подписка)                    │
                                                                │
Фаза 9 (GDPR) ──────────────────────────────────────────────────┤
  T-030 ─► T-028 ─► T-029 ─► T-031                              │
                                                                │
Фаза 10 (Device Tracking) ──────────────────────────────────────┤
  T-032 ─► T-033 ─► T-034                                       │
                                                                │
Фаза 11 (Account Linking) ──────────────────────────────────────┤
  T-035                                                         │
                                                                │
Фаза 12 (Аудит) ────────────────────────────────────────────────┤
  T-036 ─► T-037                                                │
                                                                │
Фаза 13 (super_admin Hardening) ────────────────────────────────┤
  T-038 ─► T-039 T-040 T-041 T-042 T-043                        │
                                                                │
Фаза 14 (Тесты + Документация) ─────────────────────────────────┤
  T-044 ─► T-045 ─► T-046                                       │
  T-047 T-048 T-049 T-050                                       │
                                                                │
Фаза 15 (🔮 Stripe, P3) ────────────────────────────────────────┤
  T-051 ─► T-052 ─► T-053 ─► T-054                              │
```

**Параллельные треки:**

- Фазы 3 (GitHub) + 4 (Google усиление) + 5 (Magic Link) + 13 (super_admin) можно делать параллельно после Фазы 2
- Фазы 6 (Тема) + 7 (Прогресс) можно делать параллельно с Фазами 3–5
- Фаза 8 (Ручной биллинг + UI) — параллельно с Фазами 6–7 после T-025
  - T-055 (админ-панель), T-056 (лэндинг), T-057 (профиль) — параллельно после T-023
- Фазы 9 (GDPR) + 10 (Device Tracking) — параллельно после Фазы 2
- Фаза 15 (Stripe) — независимо, в любое время после Фазы 8

---

## 4. Оценка суммарной трудоёмкости

| Сложность | Кол-во задач (без Stripe) | Кол-во задач (Stripe) | Часов (без Stripe) | Часов (Stripe) |
| --------- | ------------------------- | --------------------- | ------------------ | -------------- |
| XS (<1d)  | 16                        | 0                     | ~32                | 0              |
| S (1–2d)  | 28                        | 1                     | ~72                | ~3             |
| M (3–5d)  | 13                        | 3                     | ~42                | ~12            |
| L (1–2w)  | 3                         | 0                     | ~21                | 0              |
| XL (>2w)  | 0                         | 0                     | 0                  | 0              |
| **Итого** | **61**                    | **4**                 | **~167**           | **~15**        |

**Без Stripe:** ~167 часов (~5 недель одним разработчиком full-time).
**Stripe (будущее):** +~15 часов.

---

## 5. Критические пути

| Цепочка                         | Задачи                                          | Длительность       | Блокирует                |
| ------------------------------- | ----------------------------------------------- | ------------------ | ------------------------ |
| **Schema → OAuth/Magic Link**   | T-006 → T-013, T-015, T-017                     | ~6d                | Все auth-методы          |
| **Schema → Ручной биллинг**     | T-006 → T-010 → T-025 → T-023 → T-024           | ~7d                | Монетизация              |
| **Биллинг → RBAC**              | T-025 → T-026 → T-027                           | ~3d (после T-025)  | Feature-gating           |
| **API → Админ-панель UI**       | T-023 → T-055                                   | ~3d (после T-023)  | Админ-интерфейс          |
| **API → Лэндинг + Профиль**     | T-023 → T-056, T-057                            | ~3d (после T-023)  | Пользовательский UX      |
| **GDPR**                        | T-006 → T-017 (Magic Link) → T-029              | ~7d                | Запуск в EU              |
| **🔮 Stripe (P3)**              | T-010 → T-051 → T-052 → T-053 → T-054           | ~10d (независимо)  | Автоматизация            |

---

## 6. Метрики готовности

- [ ] `npm run typecheck` — без ошибок
- [ ] `npm run lint` — без ошибок (включая `boundaries/dependencies`)
- [ ] `npm run test` — все тесты проходят, coverage новых модулей ≥ 80%
- [ ] `npm run e2e` — базовые auth-сценарии проходят, включая approve/reject flow
- [ ] Все новые env-переменные задокументированы в `.env.example`
- [ ] `docs/ROLES.md` обновлён (новые роли подписчиков + матрица)
- [ ] `docs/ARCHITECTURE_BASE.md` содержит ADR-018–028
- [ ] `docs/FUNCTIONS.md` содержит новые возможности (подписки, админ-панель)
- [ ] `CLAUDE.md` — карта «Где что лежит» актуальна (добавлен плагин admin/subscriptions)

---

## 7. Валидация Software Architect

### 7.1. Соответствие архитектуре

План соответствует целевой архитектуре (`ARCHITECTURE_BASE.md`):
- ✅ Слои изолированы: `music-core` / `plugin-sdk` / `plugin-host` / `plugins` / `apps/api` / `apps/web`
- ✅ RBAC-расширение переиспользует существующий механизм (Middleware `requirePermission`)
- ✅ Аудит через `withAudit` — единый паттерн для всех мутаций
- ✅ Плагинная архитектура: раздел «Подписки» в админ-панели — отдельный плагин `packages/plugins/admin/subscriptions/` (аналог управления Каталогом)
- ✅ Feature-gating (T-027) — через plugin SDK (`usePermission`)
- ✅ Ручной биллинг — через админ-эндпоинты, изолированные от пользовательских путей
- ✅ Запросы с лэндинга → `subscription_requests` → админ-панель → approve/reject → активация
- ✅ Stripe выделен в будущую фазу (P3), не блокирует запуск

### 7.2. Критические находки (must-fix до реализации)

#### V-001. Расширение `SYSTEM_ROLES` в `shared/src/constants.ts`

В файле `packages/shared/src/constants.ts` (или где определены `SYSTEM_ROLES`) нужно добавить:

```ts
export const SYSTEM_ROLES = [
  // ... существующие ...
  'subscriber_free',
  'subscriber_pro',
  'subscriber_premium',
] as const;
```

**Влияние:** Без этого шага TypeScript не пропустит новые роли в `RBAC_ROLES`.

#### V-002. DTO для новых эндпоинтов отсутствуют в плане

Для следующих эндпоинтов нужны Zod-DTO в `packages/shared/src/dto.ts`:
- `POST /api/admin/subscriptions/:userId` — `AdminSubscriptionUpdateDTO`
- `POST /api/gdpr/export` — `GdprExportRequestDTO`
- `POST /api/progress/exercise` — `ExerciseResultDTO`
- `POST /api/subscription-request` (лэндинг) — `SubscriptionRequestDTO`
- `POST /api/subscription/request-change` (профиль) — `SubscriptionChangeDTO`

**Рекомендация:** Добавить задачу T-058 «DTO для новых эндпоинтов» в Фазу 2.

#### V-003. Rate limiting per-email требует custom key generator

`@fastify/rate-limit` по умолчанию использует IP как ключ. Для Magic Link нужен rate limit per-email. Потребуется кастомный `keyGenerator`.

#### V-004. Re-authentication edge case для non-Magic-Link пользователей

GDPR-операции требуют re-auth через Magic Link (§7.1–7.2). Если пользователь зарегистрирован только через OAuth и не имеет email — нужна стратегия fallback (OAuth re-login?).

### 7.3. Предупреждения (не блокируют, но важны)

#### V-005. T-022 (интеграция прогресса в плагины) — высокий объём touch points

Задача затрагивает все плагины практики и теории. Высокий риск регрессии. Рекомендуется:
- Сделать общий хук `useProgress()` в plugin-sdk
- Интегрировать поэтапно, плагин за плагином

#### V-006. `email_verified` поле: нет задачи на wiring

Поле добавлено в schema (T-006), но нет отдельной задачи на его проставление при OAuth/Magic Link.

#### V-007. `apps/api/src/app.ts` — регистрация новых плагинов

Новые Fastify-плагины (rate-limit, helmet, admin-ip-filter) должны быть зарегистрированы в `app.ts`. Текущие задачи покрывают это в описании, но явной задачи на интеграцию нет.

#### V-008. Миграция существующих пользователей при развёртывании

При деплое на production: существующие пользователи должны быть мигрированы (поля со значениями по умолчанию). Нужен скрипт миграции.

### 7.4. Пропущенные задачи (добавить в план)

#### T-058. DTO для новых эндпоинтов в `shared/src/dto.ts`

- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `packages/shared`
- **Модуль:** `packages/shared/src/dto.ts`
- **Описание:**
  1. `AdminSubscriptionUpdateDTO`: `{ tier: z.enum(['pro','premium']).nullable(), months: z.number().optional() }`
  2. `ExerciseResultDTO`: `{ exerciseType, subType, config, score, completed, durationMs }`
  3. `SubscriptionRequestDTO`: `{ email, name, desiredTier, message }`
  4. `SubscriptionChangeDTO`: `{ action, tier?, message? }`
  5. `GdprExportRequestDTO`, `ConsentUpdateDTO`
- **Критерий готовности:** `typecheck` + `lint` + валидация в тестах
- **Статус:** 🔴 Запланировано

#### T-059. Регистрация новых плагинов и маршрутов в `app.ts`

- **Приоритет:** P1
- **Сложность:** XS (<1d)
- **Слой:** `apps/api`
- **Модуль:** `apps/api/src/app.ts`
- **Описание:**
  1. Зарегистрировать: `rate-limit.plugin`, `helmet`, `admin-ip-filter`
  2. Подключить маршруты: `billing.routes`, `admin-subscriptions.routes`, `subscription.routes`, `subscription-request.routes`, `gdpr.routes`, `progress.routes`
  3. Зарегистрировать плагин `admin/subscriptions` в plugin-registry
- **Критерий готовности:** `typecheck` + `lint` + сервер стартует без ошибок
- **Статус:** 🔴 Запланировано

### 7.5. Оценка рисков

| Риск                                            | Вероятность | Влияние | Митигация                                                                    |
| ----------------------------------------------- | :---------: | :-----: | ---------------------------------------------------------------------------- |
| Сложность интеграции прогресса во все плагины   |   Средняя   | Высокое | Поэтапная интеграция, общий хук `useProgress()`                              |
| Rate limiting ломает OAuth-редиректы            |   Низкая    | Высокое | Тщательное тестирование OAuth-потоков с rate limit                           |
| Миграция существующих пользователей             |   Средняя   | Среднее | Скрипт миграции с проверкой на staging                                       |
| Ручной биллинг не масштабируется                |   Средняя   | Среднее | Заложена миграция на Stripe (Фаза 15), мониторинг очереди запросов           |
| Админ-панель подписок: UX не соответствует ожиданиям |   Средняя   | Среднее | Прототипирование до реализации, итеративный подход                           |
| Stripe-миграция ломает активные подписки        |   Низкая    | Высокое | Тщательное тестирование миграции, возможность отката к ручному режиму        |

### 7.6. Итоговая оценка

План валидирован с учётом изменений v1.2. Добавлены: раздел «Подписки» в админ-панели (отдельный плагин), форма запроса на лэндинге, раздел «Подписка» в профиле пользователя, таблица `subscription_requests`, approve/reject workflow. Ручной биллинг достаточен для запуска. Stripe вынесен в будущую фазу (P3). Рекомендуется добавить задачи T-058 и T-059 до начала реализации.

---

_Документ подготовлен агентом `software-architect` (v1.0) и обновлён агентом `analyst` (v1.1 — реприоритизация биллинга, v1.2 — админ-панель подписок + профиль пользователя). Валидация от 2026-07-26._
