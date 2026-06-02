# 07 — Фичи и порядок разработки

## Цель документа

Разбить функционал на фичи, задать порядок реализации и зависимости. Каждая фича —
отдельная git-ветка `feature/<name>` → MR (PR) в `main`, с тестами и обновлением
документации. Детальные спеки — в [features/](features/).

---

## Порядок и зависимости

```
F0 bootstrap-monorepo
      │
      ├──▶ F1 dsl-parser ──┐
      │                    │
      ├──▶ F2 transport ───┤  (music-core, независимы между собой)
      │                    │
      └──▶ F3 generator ───┘
                 │
                 ▼
F4 auth-google ──▶ F5 grids-api
                       │
                       ▼
F6 web-shell ──▶ F7 harmony-editor ──▶ F8 playback-ui ──▶ F9 docs-readme
```

Принцип поэтапности: сначала фундамент (F0) и чистое ядро (F1–F3, тестируется без UI и
БД), затем бэкенд (F4–F5), затем фронт по нарастающей (F6–F8), финал — документация (F9).
На каждой фиче прогоняется **весь** набор тестов, чтобы ничего не разваливалось.

---

## Список фич

| ID | Ветка | Суть | Спека |
|---|---|---|---|
| F0 | `feature/bootstrap-monorepo` | monorepo, тулинг, каркасы пакетов | [features/00-bootstrap.md](features/00-bootstrap.md) |
| F1 | `feature/dsl-parser` | DSL parser/serializer + chord model | [features/01-dsl-parser.md](features/01-dsl-parser.md) |
| F2 | `feature/transport-engine` | transport + metronome + playback state machine | [features/02-transport-engine.md](features/02-transport-engine.md) |
| F3 | `feature/harmony-generator` | data-driven генераторы прогрессий | [features/03-harmony-generator.md](features/03-harmony-generator.md) |
| F4 | `feature/auth-google` | Google OAuth + dev-login (опц.) + access-модель + system user | [features/04-auth.md](features/04-auth.md) |
| F5 | `feature/grids-api` | публичный каталог, свой CRUD, copy, import/export, лайки, generate, seed | [features/05-grids-api.md](features/05-grids-api.md) |
| F6 | `feature/web-shell` | каркас web, публичный дашборд, auth, свой каталог, settings | [features/06-web-shell.md](features/06-web-shell.md) |
| F7 | `feature/harmony-editor` | редактор своей сетки: сетка, аккорды, DSL-панель, генератор | [features/07-harmony-editor.md](features/07-harmony-editor.md) |
| F8 | `feature/playback-ui` | playback-интеграция, публичный плеер, подсветка, e2e | [features/08-playback-ui.md](features/08-playback-ui.md) |
| F9 | `feature/docs-readme` | README, финальные доки, проверка запуска | [features/09-docs-readme.md](features/09-docs-readme.md) |

---

## Definition of Done (для каждой фичи)

1. Реализован scope из спеки фичи.
2. Написаны тесты (unit / integration / e2e — по типу фичи).
3. `npm run test` (все workspaces) — зелёный.
4. `npm run build` и `npm run lint` — без ошибок.
5. Обновлена документация (если контракт/поведение изменились — с уведомлением пользователя).
6. Создан MR (PR) в `main`; описание со ссылкой на спеку.

---

## Процессное правило

Если в ходе реализации требуется отклониться от архитектуры / API / модели данных —
**сначала уведомить пользователя и обновить соответствующий doc**, и только потом менять
код (по правилу «изменения через план/доки, а не через код»).
