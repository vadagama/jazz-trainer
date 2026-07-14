# Jazz Trainer

Браузерный тренажёр джазовой гармонии: гармонические сетки, точный метроном,
DSL для ввода гармонии, генераторы прогрессий, аккомпанемент (12 инструментов + 7 сольных MIDI-тембров).

> Приложение **публичное по умолчанию**: каталог и плеер доступны без входа.
> Аутентификация добавляет персональные возможности (свой каталог, настройки, лайки).

## Структура (monorepo, npm workspaces)

```
apps/
  web/                    React + Vite (оболочка)
  api/                    Fastify + SQLite + Drizzle
packages/
  music-core/             Чистая музыкальная логика (DSL, аккорды, транспорт, порты)
  shared/                 DTO (Zod), константы, общие типы
  plugin-sdk/             Контракты плагинов (extension points, хуки, apiClient)
  plugin-host/            Загрузка плагинов, агрегация вкладов
  plugin-registry/        Build-time реестр (44 плагина)
  plugins/                44 плагина (вся фичевая логика)
  adapters/               Платформенные адаптеры (Tone.js → AudioPort, Web MIDI)
  ui/                     Общие UI-компоненты
docs/                     Документация
```

Архитектура: **тонкое ядро + build-time плагины**. Подробнее:

- [ARCHITECTURE_BASE.md](docs/ARCHITECTURE_BASE.md) — текущая архитектура + архитектурные решения (ADR)
- [ARCHITECTURE_VISION.md](docs/ARCHITECTURE_VISION.md) — целевое видение архитектуры
- [FUNCTIONS.md](docs/FUNCTIONS.md) — каталог возможностей
- [STYLES.md](docs/STYLES.md) — стили и аранжировка (StyleProfile, ансамбли)
- [ARANGEMENT_VISION.md](docs/ARANGEMENT_VISION.md) — видение системы аранжировки

## Инструменты

12 инструментов аккомпанемента в `music-core/audio`, каждый со своим манифестом и рандомайзером:

| Инструмент       | Семплы                           | Документация                      |
| ---------------- | -------------------------------- | --------------------------------- |
| Bass             | SneakyBass (контрабас)           | [BASS.md](docs/BASS.md)           |
| Drums            | Swirly Drums v2 (8 звуков)       | [DRUMS.md](docs/DRUMS.md)         |
| Modern Kit       | Modern Kit (10 звуков + stir)    | [DRUMS.md](docs/DRUMS.md)         |
| Grand Piano      | Upright KW / Salamander Grand    | [PIANO.md](docs/PIANO.md)         |
| Rhodes           | jRhodes3c (комплементарный слой) | [RHODES.md](docs/RHODES.md)       |
| Guitar           | Nylon / Steel                    | [GUITAR.md](docs/GUITAR.md)       |
| Electric Guitar  | Electric (2 velocity-слоя)       | [GUITAR.md](docs/GUITAR.md)       |
| Vibraphone       | Vibraphone (2 velocity-слоя)     | [VIBRAPHONE.md](docs/VIBRAPHONE.md) |
| Organ            | Hammond-style (2 velocity-слоя)  | [ORGAN.md](docs/ORGAN.md)         |
| Percussion       | Latin perc (16 звуков)           | [PERCUSSION.md](docs/PERCUSSION.md) |
| Clarinet         | Clarinet (2 velocity-слоя)       | [CLARINET.md](docs/CLARINET.md)   |
| Metronome        | 5 звуков                         | —                                 |

**Сольные инструменты** — 7 MIDI-тембров для live-ввода: `synthDefault`, `pianoUprightSolo`, `pianoSalamanderSolo`, `rhodesJRhodes3cSolo`, `clarinetSolo`, `vibraphoneSolo`, `guitarNylonSolo`. Подробнее: [MIDI_INSTRUMENT_ARCHITECTURE.md](docs/MIDI_INSTRUMENT_ARCHITECTURE.md).

Раздел «Упражнения» (плагин `practice-cards`) — интерактивные карточки
для тренировки аккордов и гамм с аккомпанементом. См. [EXERSISE-VISION.md](docs/EXERSISE-VISION.md) и [EXERSISE-ARCHITECTURE.md](docs/EXERSISE-ARCHITECTURE.md).

## Требования

- Node.js >= 20.11
- npm >= 10

## Установка

```bash
npm install          # установить зависимости всех workspaces
cp .env.example .env # настроить окружение (значения по умолчанию рабочие для dev)
```

## Запуск в терминале

```bash
# Всё вместе (фронтенд + бэкенд параллельно)
npm run dev

# Только бэкенд (Fastify API на порту 3999)
npm run dev:api

# Только фронтенд (Vite на порту 5173)
npm run dev:web
```

После запуска:
- Web: http://localhost:5173
- API health: http://localhost:3999/api/health → `{ "status": "ok" }`

## Скрипты

| Скрипт              | Назначение                          |
| ------------------- | ----------------------------------- |
| `npm run dev`       | web + api параллельно               |
| `npm run build`     | typecheck + сборка web и api        |
| `npm run test`      | unit/integration тесты (Vitest)     |
| `npm run typecheck` | проверка типов по всем workspaces   |
| `npm run lint`      | ESLint + границы слоёв (boundaries) |
| `npm run format`    | Prettier                            |
| `npm run e2e`       | e2e-тесты (Playwright)              |

## Переменные окружения

См. [.env.example](.env.example). Dev-login fallback (`AUTH_DEV_MODE=true`) позволяет
запускать и тестировать приложение без реальных Google OAuth credentials.

## Статус

Миграция на плагинную архитектуру:

| Фаза                | Статус | Ключевой результат                                              |
| ------------------- | ------ | --------------------------------------------------------------- |
| Ф0 — Границы        | ✅     | ESLint boundaries + strict, 0 нарушений                         |
| Ф1 — SDK + Host     | ✅     | `plugin-sdk`, `plugin-host`, `plugin-registry`, shell bootstrap |
| ФR — RBAC + аудит   | ✅     | 3 роли, 11 permissions, audit log                               |
| Ф2 — AudioPort      | 🟢     | Адаптеры готовы, 12 инструментов, манифесты, EventSink, StyleProfile           |
| Ф3 — Фичи → плагины | ✅     | `core-editor`, `core-player`, `catalog` вынесены                |
| Ф4 — Новые домены   | 🟡     | 37 domain-плагинов + `core-settings`, наполнение контентом в процессе           |
| Ф5 — MIDI           | 🟡     | MIDI-плагины и `midiEval` готовы, Desktop исключён из скоупа    |
