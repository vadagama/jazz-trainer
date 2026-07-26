# TECH_DEPT — Технический долг Amazilia

> **Версия анализа:** v2 от 2026-07-27
> **Охват:** Систематический обход по секторам — `packages/music-core`, `packages/shared`, `packages/plugin-sdk`, `packages/plugin-host`, `packages/plugins/*` (55 зарегистрированных плагинов), `packages/adapters/*`, `packages/ui`, `apps/web`, `apps/api`, `docs/`. Аспекты: **архитектура, качество кода/техдолг, тесты и документация**. Безопасность в этот заход **не переоценивалась** (см. v1 + `npm audit` в §11).
> **Автор:** software-architect AI agent (4 параллельных секторных обхода + сводка)
> **Baseline:** v1 от 2026-06-15 (ниже по файлу в истории git).

---

## 1. Резюме (Executive Summary)

Кодовая база Amazilia **в хорошем состоянии**. Объективные проверки зелёные: `typecheck` — 0 ошибок, `lint` — 0 ошибок / 8 warnings, **1784 теста проходят** (122 файла, было 736 в v1 — рост почти ×2.5), `.only()` в тестах — 0, `@ts-ignore/@ts-expect-error` в продакшн-коде — **0** (171 из 200 — в тестах, остальное в d.ts/конфигах). Границы слоёв соблюдены строго (ESLint boundaries, 0 нарушений), плагины изолированы (импортов plugin→plugin нет), ядро `music-core` практически образцово чистое (браузерных API нет, единственная guarded-утечка `document` в `shared/audioFormat.ts`). С момента v1 закрыт rate-limiting (был отмечен как дыра).

Три главных фокуса долга в этот заход — **не архитектурные катастрофы, а накопление**:

1. **Мёртвый код в App Shell (~3000 LOC).** Директория `apps/web/src/routes/*` (8 страниц) и `components/settings/SettingsForm.tsx` (1106 LOC) не импортируются ниоткуда — роутинг давно живёт на plugin-контрибуциях. Их функции вытеснены плагинами (`core-settings`, `catalog`). При этом на `SettingsForm` висит тест, создающий ложное чувство покрытия. Плюс орфанный `packages/ui/InstrumentTile.tsx` (674 LOC) без потребителей и третья инлайн-копия тайла в `DefaultsPage`.

2. **API: обработка ошибок — единственный системный провал.** `Fastify({ logger: false })` + отсутствие `setErrorHandler` означают, что непойманные ошибки не логируются и отдаются в НЕ едином формате. В связке с незащищёнными `JSON.parse` данных из БД это тихие необрабатываемые 500. Отдельно: `auth.routes.ts` (926 LOC) держит JWT/PKCE/OAuth-крипто-логику в роуте вопреки существующему `auth.service.ts`, а `catalog.service.ts` (905 LOC, 21 функция, модерация с сайд-эффектами) не имеет ни одного теста.

3. **Документация: числовой дрейф.** Счёт плагинов гуляет по 7+ документам (16/17/22/37/54), тогда как реально в реестре **55**. Роли/permissions в README (4/23) не совпадают с реальностью (7/27). Статусы фаз миграции в `CLAUDE.md` (Ф2 🟡 / Ф5 🔴) отстали от остальной доки (Ф2 🟢 / Ф5 🟡). Структурных пробелов нет — ADR актуальны коду, битых ссылок на файлы не найдено (проверено 27 путей).

Известный техдолг фаз Ф2/Ф4 сохраняется: `PluginContext.music`/`query` типизированы `unknown`, а фабрика контекста раздаёт падающие в рантайме заглушки `{} as Service`. Осознан и задокументирован, но в самом коде маркеров нет.

## 2. Health Score

| Измерение                    | Оценка (0–10) | Тренд | Комментарий                                                                                                       |
| ---------------------------- | ------------- | ----- | ---------------------------------------------------------------------------------------------------------------- |
| Архитектурная целостность    | 7/10          | →     | Границы строги (0 нарушений), плагины изолированы. Минус: `PluginContext`/фабрика — фиктивные абстракции; мёртвый слой `routes/` |
| Тестовое покрытие            | 7/10          | ↑     | 1784 теста (×2.5 к v1), adapters покрыты. Минус: `catalog.service`, `pattern/engine`, `pianoVoicing`; плагины ~54%, ui — 2 теста |
| Читаемость / Maintainability | 7/10          | →     | Прод-код без TODO/any/ts-ignore. Минус: крупные UI-страницы (Defaults/Settings/useTransport), 3 копии тайла, мёртвый код |
| Расширяемость                | 7/10          | ↑     | 55 плагинов, рецепт «3 шага» работает. Минус: таблица vite-алиасов отстала на 8 плагинов, держится на симлинках    |
| Документированность          | 6/10          | ↓     | ADR актуальны, ссылки живые, FUNCTIONS.md полон. Минус: числовой дрейф (плагины/роли/фазы) в 7+ документах         |
| Обработка ошибок (API)       | 5/10          | →     | Единый `VALIDATION_ERROR`, аудит на мутациях. Минус: нет `setErrorHandler`, `logger:false`, незащищённые `JSON.parse` |
| Управление зависимостями     | 5/10          | ↓     | 17 уязвимостей npm audit (3 critical, 8 high) — **вне охвата, требует отдельного захода** (§11)                    |
| Безопасность                 | —             | —     | **Не переоценивалась в v2.** См. v1 (6/10) и `npm audit`. Позитив по ходу: Drizzle везде, RBAC-каркас зрелый       |

## 3. Критические проблемы (P0 — блокируют разработку)

Настоящих P0 (падение прода / потеря данных / блокировка разработки) **не обнаружено** — все автопроверки зелёные. Ближайшие к критичным вынесены в P1.

## 4. Высокий приоритет (P1 — существенно замедляют)

| ID    | Кат.  | Локация | Описание | Влияние | Рекомендация | Оценка |
| ----- | ----- | ------- | -------- | ------- | ------------ | ------ |
| D-001 | error | [server.ts:70](../../apps/api/src/server.ts#L70) | `Fastify({ logger:false })` + нет `setErrorHandler`. Непойманные ошибки не логируются и отдаются в НЕ едином формате (`{statusCode,error,message}` вместо `{error:{code,message}}`) | Тихие необрабатываемые 500, нарушение контракта ошибок, слепая диагностика прода | Добавить `app.setErrorHandler` с единым форматом + включить pino хотя бы на error-уровне | M |
| D-002 | error | admin-subscriptions.routes.ts:71, subscription.routes.ts:46, settings.routes.ts:106,252, catalog.service.ts:25 | Незащищённый `JSON.parse` данных из БД (`metadata`, `perStyleOverrides`, `content`) без try/catch | При повреждённой строке — исключение → непойманный 500 (см. D-001) | Обернуть в безопасный парсер (образец есть: `parseTags` catalog.service.ts:29) | S |
| D-003 | arch  | [auth.routes.ts](../../apps/api/src/routes/auth.routes.ts) (926 LOC) | JWT/PKCE/OAuth-exchange/provider-linking + инлайновый `db.insert(auditLog)` живут в роуте, при существующем `auth.service.ts` (586 LOC) | Единственное серьёзное нарушение слоистости; крипто-логика размазана, тяжело тестировать | Вынести JWT/PKCE/OAuth в `auth.service.ts` / новый `oauth.service.ts`, роут — тонкий | L |
| D-004 | code  | [routes/](../../apps/web/src/routes/) (8 файлов ~1963 LOC) + [SettingsForm.tsx](../../apps/web/src/components/settings/SettingsForm.tsx) (1106 LOC) | Мёртвый код: не импортируется из App.tsx/main.tsx. Роутинг живёт на plugin-контрибуциях; функции вытеснены плагинами `core-settings`/`catalog` | ~3000 LOC техдолга, растут параллельно плагинам; тест на `SettingsForm` даёт ложное покрытие | Удалить `routes/` + `SettingsForm.tsx` + его тест, либо явно задокументировать как замороженное | M |
| D-005 | test  | [catalog.service.ts](../../apps/api/src/services/catalog.service.ts) (905 LOC, 21 функция) | God-service модерации/публикации с сайд-эффектами (аудит, лайки) и **нулевым тестовым покрытием** | Регрессии в публикации/модерации не ловятся; риск на привилегированных операциях | Разбить на `catalog-query`/`catalog-moderation`/`catalog-tags` и покрыть тестами | L |
| D-006 | arch  | [context.ts:51](../../packages/plugin-sdk/src/context.ts#L51), [context-factory.ts:13](../../packages/plugin-host/src/context-factory.ts#L13) | `PluginContext.music`/`query` = `unknown`; фабрика раздаёт `{} as AudioService` — вызов упадёт в рантайме | Ключевой контракт SDK не типобезопасен; скрытая рантайм-мина | Типизировать после фазы wiring; до тех пор — заглушки, кидающие «service not wired», + `@deprecated`-маркеры в коде | M |
| D-007 | docs  | README.md:20,114,117; [CLAUDE.md:290](../../CLAUDE.md); ARCHITECTURE_VISION.md:136,605 | Числовой дрейф: плагины (16/37/54 vs реальные 55), роли/permissions (4/23 vs 7/27), фазы Ф2/Ф5 в CLAUDE.md отстали | Онбординг-агент/человек получает неверный сигнал о масштабе и готовности AudioPort/MIDI | Свести к канону (генерировать из `plugin-registry`/`rbac.service.ts` или закрепить в ARCHITECTURE_BASE, остальное — ссылками) | M |

## 5. Средний приоритет (P2 — накапливают долг)

| ID    | Кат.  | Локация | Описание | Рекомендация | Оценка |
| ----- | ----- | ------- | -------- | ------------ | ------ |
| D-010 | test  | [pattern/engine.ts](../../packages/music-core/src/audio/pattern/engine.ts) | Обобщённое ядро паттерн-движка (свинг, clamp, разворачивание molecule/cell/organism), на которое делегируют все 5 инструментальных движков, без прямого теста (покрыт лишь косвенно) | Добавить unit-тесты на самый критичный shared-модуль планирования | S |
| D-011 | test  | pianoVoicing.ts (415 LOC), bassStepEngine.ts, bassPitch.ts, drumCellValidator.ts | Логически насыщенные модули audio/ без тестов (голосоведение, выбор высот) | Покрыть приоритетно pianoVoicing + bassStepEngine; drumCellValidator легко тестируем | M |
| D-012 | arch  | [ui/InstrumentTile.tsx](../../packages/ui/src/InstrumentTile.tsx) (674 LOC) | Орфан: экспортируется, но 0 потребителей. НЕ логический дубль core-settings-версии (та — контейнер на хуках), а мёртвый презентационный компонент + коллизия имени | Удалить либо вынести общий презентационный слой и переиспользовать | S |
| D-013 | code  | [DefaultsPage.tsx:884](../../packages/plugins/admin/admin-defaults/src/DefaultsPage.tsx#L884) | Третья параллельная реализация тайла инструмента (инлайн), помимо ui и core-settings | Свести к одному переиспользуемому презентационному компоненту | M |
| D-014 | arch  | [vite.config.ts](../../apps/web/vite.config.ts) | Таблица алиасов отстала на 8 плагинов от tsconfig/vitest; работает на pnpm-симлинках, ручной список из 57 записей дрейфует | Генерировать алиасы из workspace автоматически либо добавить 8 недостающих | M |
| D-015 | arch  | admin-roles.routes.ts:43,75,127 | POST/PATCH/DELETE `/admin/roles` (высшая привилегия) защищены только blanket `admin`, без fine-grained `requirePermission('roles:write')` | Добавить per-route `requirePermission('roles:write')` | S |
| D-016 | code  | catalog.service.ts:25 ↔ compositions.service.ts:23 | `parseContent` продублирована идентично + схожие row→DTO мапперы | Вынести общие парсеры/мапперы в `services/_shared` | S |
| D-017 | error | subscription.routes.ts:87, patterns.routes.ts:26 | `err.message` внутренней ошибки уходит клиенту | Отдавать generic-текст, детали — в лог | S |
| D-018 | test  | apps/api, packages/plugins/*, packages/ui | `apps/api/package.json` без `test`-скрипта (11 тест-файлов). Плагины ~54% покрытия (26/57 без тестов). ui — 2 теста на ~35 компонентов | Добавить `"test":"vitest run"`; smoke-тесты на регистрацию манифеста плагинов и рендер тяжёлых ui-компонентов | M |
| D-019 | arch  | admin-constructor-shared | Библиотека (без manifest/`export default`) названа `@jazz/plugin-*` и лежит под `plugins/admin/` → выглядит как плагин, 23 импорта из 5 конструкторов | Переименовать/перенести в `packages/*-shared` без префикса `plugin-`, чтобы правило «нет plugin→plugin» оставалось буквально проверяемым | S |
| D-020 | code  | admin-feature-access/role-state/users.routes.ts, settings.routes.ts:117 | 3 админ-роута валидируют inline `z.object` вместо схем `@jazz/shared`; в settings поля достаются через `as`, минуя `parsed.data` | Перенести inline-схемы в dto.ts; работать через `parsed.data` | S |
| D-021 | arch  | [audioFormat.ts:24](../../packages/shared/src/audioFormat.ts#L24) | `document.createElement('audio')` в ядре `shared` (guarded `typeof document`, но прямая DOM-зависимость в domain) | Вынести feature-detection в адаптер платформы, ядро оставить чистым | M |
| D-022 | code  | transportEngine.ts, rhodesInstrument.ts, bassInstrument.ts, instrument.ts, dto.ts | Накопление `@deprecated` legacy-веток планирования (comping/layer modes, `scheduleBass/Rhodes/Drum`) — остаются исполнимыми | Наметить окно удаления после подтверждения полного замещения pattern-engine | M |

## 6. Низкий приоритет (P3 — косметика / nice-to-have)

| ID    | Кат.  | Локация | Описание | Рекомендация |
| ----- | ----- | ------- | -------- | ------------ |
| D-030 | code  | MidiSoloProvider.tsx:170,179,249; ComputerKeyboardAdapter.ts:88+ | `console.debug` на каждом MIDI/keyboard-эвенте (шумно в проде) | Убрать или завести под debug-флаг |
| D-031 | code  | index.ts, config.ts, email.service.ts, auth.routes.ts:453,825 | `console.*` вместо структурного логгера, включая security-события (`super_admin login`) | Ввести pino; security-события — отдельным логгером/в audit |
| D-032 | docs  | apps/api/ | Нет ни одного `.md` (README/ARCHITECTURE): слоистость, permission-коды, env-конфиг не документированы | Добавить README с картой слоёв и списком прав |
| D-033 | test  | bass/piano/rhodes/percussion PatternEngine.ts | 4/5 инструментальных обёрток без прямых тестов (тонкие байндинги над engine.ts) | Smoke-тест на каждую обёртку |
| D-034 | docs  | FUNCTIONS.md §6 (стр. 440) | Нарушена нумерация подпунктов (6.5, 6.6, затем 6.4) | Косметическая правка нумерации |
| D-035 | code  | styleProfile.ts (1252), drumMolecules.ts (1761) | Data-heavy authoring-модули (не god-объекты). Опц.: вынести data-таблицы, добавить property-тест «молекулы проходят drumCellValidator» | Опционально; не срочно |
| D-036 | docs  | docs/VISION.md | Это refactoring-док, а CLAUDE.md ссылается на него как на «продуктовое видение» | Перенести в ARCHIVE или завести настоящий product-VISION |

## 7. Quick Wins (быстрые победы, < 2 ч каждая)

| ID    | Описание | Оценка |
| ----- | -------- | ------ |
| Q-001 | D-002: обернуть `JSON.parse` данных БД в безопасный парсер (образец уже есть) | 1h |
| Q-002 | D-018: добавить `"test":"vitest run"` в `apps/api/package.json` | 10m |
| Q-003 | D-015: `requirePermission('roles:write')` на 3 роута admin-roles | 30m |
| Q-004 | D-017: заменить `err.message` наружу на generic-текст | 30m |
| Q-005 | D-030/D-031: убрать/загейтить `console.debug` на горячих путях | 1h |
| Q-006 | D-012: удалить орфанный `ui/InstrumentTile.tsx` | 30m |
| Q-007 | D-007 (частично): исправить числа в README (роли 7/27, плагины 55) + фазы в CLAUDE.md | 1h |
| Q-008 | D-034: починить нумерацию FUNCTIONS.md §6 | 10m |

## 8. Архитектурные риски (структурные)

1. **Фиктивные абстракции SDK/host (Ф2/Ф4 долг).** `PluginContext` объявлен, но `music`/`query` = `unknown`, а сервисы — заглушки `{}`. Плагины обходят это прямым импортом `music-core`. Риск: контракт декларирует больше, чем работает; типы маскируют рантайм-падения. Разрешается завершением wiring-фазы.

2. **Параллельный мёртвый слой App Shell.** `routes/` + `SettingsForm` растут рядом с плагинами, дублируя их функции. Не протекает в плагины (изолирован), но раздувает shell и даёт ложное покрытие. Разрешается удалением.

3. **Ручной инфраструктурный дрейф.** Таблица vite-алиасов (57 записей) рассинхронизирована с tsconfig/vitest на 8 плагинов; счёт плагинов в доке рассинхронизирован с реестром. Общий корень — ручное дублирование того, что можно генерировать из `plugin-registry`.

4. **API error-handling как единая точка отказа.** Отсутствие `setErrorHandler` + `logger:false` + незащищённые `JSON.parse` образуют цепочку: плохие данные из БД → необработанное исключение → неформатированный незалогированный 500.

## 9. План действий (Roadmap)

| Фаза | Содержание | Оценка | Зависит от |
| ---- | ---------- | ------ | ---------- |
| 1. Quick Wins | §7 (Q-001…Q-008): JSON.parse, test-скрипт, RBAC roles, generic-ошибки, console, орфан-тайл, числа в доке | ~5h | — |
| 2. Error-handling API | D-001 (setErrorHandler + pino) — фундамент для остального | ~1d | Фаза 1 (D-002) |
| 3. Удаление мёртвого кода | D-004 (routes/ + SettingsForm + тест), D-013 (инлайн-тайл) | ~1d | Фаза 1 (Q-006) |
| 4. Структурные | D-003 (декомпозиция auth.routes), D-005 (catalog.service + тесты), D-006 (PluginContext заглушки), D-014 (генерация алиасов) | ~4d | Фаза 2 |
| 5. Плановое оздоровление | Тесты (D-010,D-011,D-018), дубли/мапперы (D-016), deprecated-очистка (D-022), docs-канон (D-007 полностью) | ~3d | Фаза 4 |

## 10. Метрики для мониторинга

- **Тесты:** число тестов (сейчас 1784) и покрытие плагинов (~54% → цель 80% smoke); подключить `vitest --coverage` в CI.
- **Мёртвый код:** LOC в `apps/web/src/routes/` (цель 0) и число экспортов без потребителей.
- **Числовой дрейф доки:** автоген счёта плагинов/ролей → отсутствие ручных чисел в README/CLAUDE.
- **Крупные файлы:** число рукописных файлов > 800 LOC (сейчас: useTransport, DefaultsPage, SettingsForm, SettingsPage, catalog.service, auth.routes).
- **API-ошибки:** доля ответов в едином формате `{error:{code,message}}` (после D-001).

## 11. Заметка о безопасности (вне охвата v2)

Безопасность в этот заход **не переоценивалась**. Объективный сигнал: `npm audit` — **17 уязвимостей (3 critical, 8 high, 5 moderate, 1 low)**. Требует отдельного захода (обновление/замена зависимостей, проверка эксплуатируемости в браузерном/бэкенд-контексте). Позитив, замеченный попутно: Drizzle используется везде (нет сырого SQL в рантайме), RBAC-каркас зрелый (blanket-гард `/api/admin/*` + fine-grained права + `withAuditSync` на мутациях), helmet/CORS/rate-limit настроены. Полную оценку безопасности см. в v1 (6/10) — часть дыр v1 (rate-limit) уже закрыта.

---

_v2 сформирован 2026-07-27 по секторам A–I методологии software-architect. Baseline v1 (2026-06-15) доступен в истории git этого файла._
