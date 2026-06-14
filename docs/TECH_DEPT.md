# TECH_DEPT — Технический долг Jazz Trainer

> **Версия анализа:** v1 от 2026-06-15
> **Охват:** Полный систематический обход кодовой базы — `apps/api`, `apps/web`, `packages/music-core`, `packages/shared`, `packages/plugin-sdk`, `packages/plugin-host`, `packages/plugin-registry`, `packages/adapters/*`, `packages/plugins/*` (16 плагинов), `packages/ui`. Объективные данные: `typecheck`, `lint`, `test`, `npm audit`, `npm outdated`.
> **Автор:** software-architect AI agent

---

## 1. Резюме (Executive Summary)

Кодовая база Jazz Trainer **в хорошем состоянии для своей стадии**. Объективные проверки подтверждают здоровую гигиену: `typecheck` чистый, `lint` — 0 ошибок (4 warnings), 0 `TODO/FIXME`, 0 `any` в продакшн-коде, 0 `@ts-ignore`, 0 XSS-векторов, 0 разбросанного `process.env`. Архитектурные границы слоёв соблюдены строго (ESLint `boundaries`, 0 нарушений), плагины полностью изолированы, ядро `music-core` практически образцово чистое.

Главный **системный риск — расхождение между декларируемыми абстракциями и реальным путём данных**. `PluginContext` (DI-слой), точки расширения (`commands`, `instruments`, `generators` и ещё 5), `AudioPort` в Tone-адаптере — объявлены в контракте, но в проде либо пустые заглушки (`{} as Service`), либо не агрегируются хостом, либо обходятся прямыми импортами SDK-хуков. Это известный технический долг фаз Ф2/Ф4, но он маскируется типами и создаёт DX-ловушки.

Второй фокус — **production-hardening безопасности**: dev-login backdoor с seed `super_admin`, защищённый только env-переменной; отсутствие `Secure`-флага на cookie; нет rate limiting; готовая, но нигде не вызванная подсистема аудита. Для учебного тренажёра риск умеренный, но все правки дешёвые.

Третий — **производительность воспроизведения**: подписка на весь zustand-store без селектора приводит к ~40 ре-рендерам всего дерева редактора в секунду во время игры. И **точечные баги**: утечки таймеров при unmount (count-in, ear-training), отсутствие ErrorBoundary вокруг lazy-маршрутов (белый экран при сбое чанка).

---

## 2. Health Score

| Измерение                    | Оценка (0–10) | Тренд | Комментарий                                                                                                              |
| ---------------------------- | ------------- | ----- | ------------------------------------------------------------------------------------------------------------------------ |
| Архитектурная целостность    | 7/10          | →     | Границы слоёв строги (0 нарушений). Минус: `PluginContext`/`AudioPort`/extension-points — фиктивные абстракции            |
| Безопасность                 | 6/10          | →     | Изоляция ресурсов, Drizzle, CORS, OAuth CSRF — OK. Минус: dev-login backdoor, нет `Secure`-cookie, нет rate limit, аудит не подключён |
| Тестовое покрытие            | 6/10          | →     | 736 тестов, ядро покрыто. Минус: `transpose`/`patterns`/`pianoVoicing`/`ui` без тестов, 2 flaky-теста, нет E2E            |
| Производительность           | 6/10          | →     | Один системный риск: ~40 ре-рендеров/сек при playback (store без селектора, нет `memo`)                                  |
| Читаемость / Maintainability | 7/10          | →     | Очень чисто (0 TODO/any/ts-ignore). Минус: методы инструментов >150 строк, `useTransport` ~1000 строк, дубли             |
| Расширяемость                | 6/10          | →     | Добавить плагин — 3 шага (хорошо). Минус: layout/protected захардкожены по префиксам путей, точки расширения мертвы       |
| Документированность          | 7/10          | →     | Отличные `ARCHITECTURE_BASE`, `CLAUDE.md`, ADR. Минус: `CLAUDE.md` слегка устарел (`engine/` удалён, `@jazz/ui` не в таблице) |
| Управление зависимостями     | 5/10          | →     | 9 CVE (2 critical, 5 high) — все в dev/build-зависимостях. Много `outdated`                                              |

> Тренды `→` — это первый анализ (baseline). Следующая версия покажет динамику.

---

## 3. Критические проблемы (P0 — блокируют разработку)

**P0 не обнаружено.** Приложение собирается, типизируется и проходит тесты. Грубых дефектов, блокирующих разработку или приводящих к падению прода/потере данных, нет.

---

## 4. Высокий приоритет (P1 — существенно замедляют / архитектурный риск)

| ID    | Категория | Локация                                                                 | Описание                                                                                                                                                | Влияние                                                                                          | Рекомендация                                                                                                  | Оценка |
| ----- | --------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------ |
| D-001 | security  | `apps/api/src/routes/auth.routes.ts:95-130`, `apps/api/src/db/seed.ts:47-81`, `apps/api/src/index.ts:22` | `dev-login` принимает любой email и выдаёт сессию без пароля; seed создаёт `super_admin` dev-user. Защита — только env `AUTH_DEV_MODE`, локальный `.env` ставит `true` | Утечка `AUTH_DEV_MODE=true` в деплой (копия `.env`, Dockerfile, CI-образ) = полный admin-захват   | Startup-guard: при `NODE_ENV==='production'` жёстко выключать dev-login и не сеять super_admin; громкий warning на boot; `.env.example` | S      |
| D-002 | security  | `apps/api/src/routes/auth.routes.ts:15`, `apps/api/src/server.ts:48`, `apps/api/src/config.ts:22` | `COOKIE_OPTS` без `secure:true`; `@fastify/cookie` без `secret`; `config.sessionSecret` загружается, но никуда не передаётся (мёртвый конфиг)         | По HTTP сессионная cookie идёт в открытом виде (MITM-кража). Мёртвый секрет вводит в заблуждение  | `secure:true` для cookie в проде (по `NODE_ENV`/HTTPS); удалить `sessionSecret` или реально подписывать cookie. Тот же фикс для `oauth_state` | S      |
| D-003 | security  | `apps/api/src/server.ts:44-60`, `apps/api/src/routes/patterns.routes.ts:12` | Не зарегистрирован rate-limiter. Открыты `POST /api/auth/dev-login`, OAuth callback, неаутентифицированный `POST /api/generate`                          | Brute-force, resource-exhaustion, абуз неаутентифицированного compute-эндпоинта                  | Зарегистрировать `@fastify/rate-limit` глобально + жёстче на `/api/auth/*` и `/api/generate`                  | S      |
| D-004 | arch      | `packages/plugin-sdk/src/extension-points.ts:16-38`, `packages/plugin-host/src/aggregator.ts:8-27` | 8 точек расширения (`commands`, `lessons`, `exercises`, `assessments`, `instruments`, `generators`, `theoryProviders`, `settingsSchema`) — мёртвые типы (`unknown[]`), хост агрегирует только `routes`/`navItems` | Ложный контракт: плагин, объявивший вклад, получит тихий no-op без ошибки — худший вид DX-ловушки | Удалить неиспользуемые поля (контракт менять разрешено) ИЛИ пометить `@deprecated` + `console.warn` в агрегаторе при непустом неподдерживаемом вкладе | S/M    |
| D-005 | perf      | `packages/plugins/core-editor/src/EditorPage.tsx:98`, `packages/plugins/core-player/src/PlayerPage.tsx:20`, `packages/ui/src/HarmonyGrid.tsx:460` | `usePlaybackStore()` без селектора → подписка на весь store. Планировщик (`useTransport.ts:975`) диспатчит `tick` каждые 25мс → вся страница + немемоизированный `HarmonyGrid` ре-рендерятся ~40 раз/сек | Просадка FPS и нагрев CPU при длительной практике, особенно на больших сетках                    | Селекторы zustand (`usePlaybackStore(s => s.currentBar)`), `React.memo` на `HarmonyGrid`, вынести бит-индикатор в отдельный мелкий подписчик | M      |
| D-006 | error     | `apps/web/src/hooks/useTransport.ts:452-512` (cleanup) vs `:922-939`     | Cleanup init-эффекта чистит `intervalRef`, но НЕ `countInTimeoutsRef` (массив `setTimeout`). Уход со страницы во время count-in → таймауты бьют по размонтированному компоненту | Мусорные обновления state после unmount, фантомный count-in при возврате, мелкая утечка           | В cleanup добавить `countInTimeoutsRef.current.forEach(clearTimeout); countInTimeoutsRef.current = []`         | S      |
| D-007 | error     | `apps/web/src/App.tsx:16-32, 75/84/91`                                   | `LazyRoute` оборачивает `lazy(import())` только в `Suspense`, без ErrorBoundary. Сбой загрузки чанка (устаревший `index.html` после деплоя, сеть) → необработанная ошибка | Полный краш SPA (белый экран) при сбое загрузки любого плагина                                    | ErrorBoundary вокруг/внутри `LazyRoute` с retry-фоллбэком (reload)                                            | S      |
| D-008 | arch      | `packages/shared/src/audioFormat.ts:11-28`                              | `supportsAAC()` вызывает `document.createElement('audio').canPlayType()` — браузерный API в платформонезависимом `shared` (есть `typeof document` guard, но граница размыта) | Размывает чистоту ядра; в Node всегда вернёт AAC — расхождение с реальным рендером                | Вынести детект формата в web-адаптер; в `shared` оставить чистые `effectiveFormat(preferred, supportsAAC)` / `audioUrl()` | S      |
| D-009 | test      | `apps/api/test/grids.test.ts` (полный прогон)                           | 2 теста flaky: при полном прогоне падают (один — на `login`, второй — на сортировке), изолированно все 42 проходят. Проблема изоляции тестового состояния при параллелизме | Ложные «красные» прогоны, эрозия доверия к CI, маскировка реальных регрессий                      | Изолировать БД/состояние между файлами (уникальная in-memory БД на тест-файл, сброс глобалов). Проверить shared-state в `makeApp`/seed | M      |
| D-010 | test      | `packages/music-core/src/generator/transpose.ts`, `packages/music-core/src/generator/patterns.ts` | Нетривиальная теория без единого теста: `transposeChord`, `keyToPitchClass`, `spellPitchClass` (энгармоника, sharp/flat-таблицы, slash-аккорды) и 138 строк паттернов прогрессий | Регрессии в энгармонике (`F#` vs `Gb`) и опечатки в учебных паттернах пройдут незамеченными        | `transpose.test.ts` (roundtrip, flat-key spelling, slash, шаг 0); инвариант-тест паттернов через `parseChord` | M      |

---

## 5. Средний приоритет (P2 — накапливают долг)

| ID    | Категория | Локация                                                                 | Описание                                                                                                          | Рекомендация                                                                            | Оценка |
| ----- | --------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------ |
| D-011 | security  | `apps/api/src/services/audit.service.ts` (0 call sites)                 | Полная подсистема аудита (`withAudit`/`withAuditSync`, таблица `audit_log`) построена, но не вызывается ни одной мутацией | Нет следа изменений состояния; латентный мёртвый код, который рассинхронится. Подключить к мутациям grid/settings или явно отложить с пометкой | M      |
| D-012 | error     | `apps/api/src/server.ts:38-62`                                          | Нет `setErrorHandler`/`setNotFoundHandler`. Неожиданный throw → дефолтный Fastify-формат (другой JSON-контракт), а при `logger:false` ошибка нигде не логируется | Добавить `app.setErrorHandler` с каноническим `{error:{code,message}}` + generic 500 без стека; включить логгер | M      |
| D-013 | code      | `apps/api/src/services/auth.service.ts:29-87`, `grids.service.ts:24,32-55` | ~22 + N приведений `as` строк из БД к union-DTO без рантайм-валидации; `JSON.parse(raw) as GridContent` без проверки содержимого | На границах доверия (БД, JSON.parse) заменить `as` на Zod-парсинг (`@jazz/shared` — уже источник DTO) | M      |
| D-014 | error     | `apps/api/src/services/rbac.service.ts:104,113`                         | `catch {} /* ignore parse errors */` в логике резолюции прав/флагов — битые данные тихо игнорируются              | Минимум — логировать; рассмотреть fail-closed для прав доступа                          | S      |
| D-015 | error     | `apps/api/src/services/grids.service.ts:23-24`                          | `JSON.parse(raw)` в `parseContent` без try-catch; одна битая строка ломает весь `getUserGrids`/`getPublicGrids` через `.map` | try-catch со skip/flag битых строк, либо опереться на глобальный error-handler (D-012)   | S      |
| D-016 | arch      | `packages/plugin-host/src/aggregator.ts:14-23`                          | `aggregateContributions` не детектит коллизии `route.path` (дедуп только по `manifest.id`). Два плагина с одним path → второй молча мёртв | Собирать `Set<path>`, при дубле пушить в `errors`/`warnings`; тест на коллизию path и navItem `to` | M      |
| D-017 | error     | `packages/plugin-host/src/loader.ts:27`, `packages/plugin-sdk/src/definePlugin.ts:8` | `setup?: () => void \| Promise<void>` допускает async, но `loadPlugins` синхронна и не `await`-ит → async-throw станет unhandled rejection мимо `errors` | Сузить `setup` до синхронного `() => void`, ИЛИ сделать `loadPlugins` async с `await` + try-catch; тест | S/M    |
| D-018 | arch      | `packages/plugin-sdk/src/context.ts:34-35`, `packages/plugin-host/src/context-factory.ts:11-19`, `bootstrap.ts:11` | `PluginContext.music/query: unknown`; `createPluginContext` отдаёт сервисы как `{} as Service` (пустые приведения), в проде overrides нет — DI фиктивен. Реальное взаимодействие идёт мимо, через прямые импорты SDK-хуков | Либо реально заполнить сервисы, либо честно сузить `PluginContext` до фактически прокидываемого, убрав `{} as Service`-ложь | M/L    |
| D-019 | arch      | `apps/web/src/App.tsx:35-67` (`wrapRoute`, `APP_SHELL_PATHS`)            | `layout` (AppShell/EditorShell/bare) и `protected` решаются в shell строковым матчингом путей (`startsWith('/grids')`). Новый плагин вне известных префиксов молча попадёт в bare без auth | Перенести `layout`/`protected` в `RouteContribution` манифеста (как уже сделано для `requires`) | M      |
| D-020 | perf      | `packages/music-core/src/audio/bassInstrument.ts:99`, `drumInstrument.ts:238,371,478` | Методы `schedule*` 106-161 строк; повторяющийся boilerplate сканирования beat-окна в каждом методе bass (строки 110,132,172,226,273,423,491) | Извлечь общий хелпер итерации по beat-сетке (как уже сделано для drums через `scheduleHits`) | L      |
| D-021 | code      | `packages/music-core/src/audio/bassInstrument.ts:77`, `drumInstrument.ts:217` | Дублирование switch по style (`swing/bossa/funk`) с fallback в bass и drums — добавление стиля требует синхронных правок | Общий тип/резолвер стиля в `shared` или `instrument.ts`                                  | M      |
| D-022 | code      | `packages/music-core/src/playback/repeatExpansion.ts:99-105`            | `resolveChord` принимает `{ parsed?: { root: unknown; quality: unknown } }` + двойной `as`, переопределяя/ослабляя типизированный `ChordSlot` из `shared` | Принимать `ChordSlot` из `@jazz/shared` напрямую, убрать `unknown` и оба `as`            | S      |
| D-023 | error     | `packages/plugin-sdk/src/apiClient.ts:12-37` (+ дубль `apps/web/src/lib/apiClient.ts`) | `request` без `AbortController`/таймаута и без retry. Зависший бэкенд → `useAuth`/`useSettings` навсегда в `isLoading`. Также два дублирующих apiClient | `AbortController` с таймаутом (~15с); унифицировать два apiClient                         | S      |
| D-024 | code      | `packages/plugin-sdk/src/hooks/usePermission.ts:7-11`, `useFlag.ts:6-10` | При `isLoading` оба хука возвращают `false` → вспышка «доступ запрещён»/исчезновение пунктов меню на первый кадр   | Вернуть `{ value, isLoading }` или `boolean \| undefined`, чтобы вызывающий показал скелетон | S      |
| D-025 | code      | `apps/web/src/stores/usePlaybackStore.ts`                               | Байт-в-байт дубль канонического `packages/plugin-sdk/src/stores/usePlaybackStore.ts`; импортируется только своим тестом. Риск: случайный импорт даст второй независимый zustand-инстанс | Удалить дубль, перенацелить тест на `@jazz/plugin-sdk`                                   | S      |
| D-026 | code      | `packages/plugins/ear-training/src/EarTrainingPage.tsx:46,52`           | `feedbackTimer` (`setTimeout`) пишется в ref, но нет ни одного `clearTimeout`/cleanup-эффекта. Unmount во время feedback (600-800мс) → `setState` на размонтированном (подтверждено 2 агентами) | `useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current) }, [])` по образцу `RhythmDrillsPage.tsx:96` | S      |
| D-027 | arch      | `packages/adapters/tone-audio-adapter/src/ToneAudioAdapter.ts:38-60`    | `scheduleNote`/`scheduleClick` — no-op-заглушки (регистрируют пустой колбэк). `AudioPort` в Tone-адаптере декоративен, реальное аудио идёт мимо порта (фаза Ф2 🟡) | Задокументировать, что Tone-адаптер — только транспорт-обёртка, ИЛИ реализовать маршрутизацию note→sampler | L      |
| D-028 | dep       | `package.json` (root + workspaces)                                      | `npm audit`: 9 уязвимостей (2 critical, 5 high, 2 moderate) — `shell-quote` (via `concurrently`), `esbuild` (via `vite`/`tsup`/`drizzle-kit`). Все в dev/build-зависимостях, не в рантайме | `npm audit fix`; обновить `concurrently`, `vite`, `drizzle-kit`. Проверить, что прод-бандл не затронут | M      |
| D-029 | test      | `packages/adapters/webmidi-adapter/src/WebMidiAdapter.test.ts:353-357`  | Реальная ветка `init()` с `navigator.requestMIDIAccess()` rejection (главный сценарий «MIDI недоступен») не покрыта — тесты подают `midiAccess` через конструктор | Мок `navigator.requestMIDIAccess` → reject, проверить отсутствие throw и `initialized===true` | S      |
| D-030 | dx        | `packages/adapters/webmidi-adapter/src/WebMidiAdapter.ts:150-163`       | `init()` резолвится одинаково при успехе и провале MIDI; вызывающий не может отличить «MIDI не поддерживается» от «нет устройств» | Публичный геттер `isAvailable: boolean` или статус из `init()`                          | S      |

---

## 6. Низкий приоритет (P3 — косметика / nice-to-have)

| ID    | Категория | Локация                                                          | Описание                                                                                                       | Оценка |
| ----- | --------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------ |
| D-031 | arch      | `packages/shared/src/music.ts:70-113`                            | Value-objects ядра (`ChordSymbol`, `Bar`, `Section`, `GridContent`) мутабельны — нет `readonly`/`.readonly()`. Логика иммутабельна на практике, но не enфорсится | M      |
| D-032 | test      | `packages/music-core/src/audio/pianoVoicing.ts`, `pianoComping.ts` | Войсинг/компинг фортепиано без колокированных тестов (асимметрия: `rhodesVoicing.test.ts` есть, piano — нет)    | M      |
| D-033 | test      | `packages/ui/src/`                                               | Пакет `@jazz/ui` без unit-тестов (`HarmonyGrid`, `PlayerToolbar` содержат логику тайм-сигнатур)                | M      |
| D-034 | code      | `packages/music-core/src/audio/transportEngine.ts:32-68,179-196`, `packages/shared/src/dto.ts` | Разросшийся deprecated-слой: 4 deprecated sink-типа + ~6 `@deprecated` полей DTO (`rhodesMode`, `drumsPattern`...), два источника истины для стиля | M      |
| D-035 | code      | `packages/music-core/src/generator/transpose.ts:45-56`, `pianoComping.ts:161` | Небезопасные `as NoteName`/`as Accidental`/`as CompingProfileId` (прикрыты `??`-fallback или фикс-таблицами, безопасны на практике) | S      |
| D-036 | dx        | `apps/web/src/components/settings/SettingsForm.tsx:68,77`        | `console.warn` при провале валидации настроек в продакшн-UI-компоненте                                          | S      |
| D-037 | dx        | `CLAUDE.md` (таблица «Границы слоёв»)                            | Не упомянут `@jazz/ui` (хотя `eslint.config.js:112,127` его разрешает и плагины его импортируют); упомянут несуществующий `apps/web/src/engine/` | S      |
| D-038 | dx        | `packages/plugin-sdk/src/queries/useEffectiveSettings.ts:20-22` | Миграция настроек определяется по 3 полям из ~60 (`bpm/volume/countIn`) — менявший только барабаны не мигрирует | S      |
| D-039 | code      | `packages/adapters/webmidi-adapter/src/WebMidiAdapter.ts:58`     | `name!.replace('b','b')` — замена на саму себя (мёртвая строка, комментарий это признаёт)                       | S      |
| D-040 | code      | `apps/api/src/services/grids.service.ts:325-373`                | `like`/`unlike`: read-then-write без транзакции/атомарного инкремента → дрейф денормализованного счётчика       | S      |

---

## 7. Quick Wins (быстрые победы, < 2 ч каждая)

| ID    | Описание                                                                                  | Связ. | Оценка |
| ----- | ----------------------------------------------------------------------------------------- | ----- | ------ |
| Q-001 | Startup-guard против dev-login в проде + warning на boot                                   | D-001 | S      |
| Q-002 | `secure:true` на cookie (по `NODE_ENV`); удалить мёртвый `sessionSecret`                    | D-002 | S      |
| Q-003 | Зарегистрировать `@fastify/rate-limit`                                                      | D-003 | S      |
| Q-004 | Cleanup `countInTimeoutsRef` в init-эффекте `useTransport`                                  | D-006 | S      |
| Q-005 | ErrorBoundary вокруг `LazyRoute`                                                            | D-007 | S      |
| Q-006 | Cleanup `feedbackTimer` в `EarTrainingPage`                                                 | D-026 | S      |
| Q-007 | Удалить дубль `apps/web/src/stores/usePlaybackStore.ts`                                     | D-025 | S      |
| Q-008 | Логировать ошибки парсинга в `rbac.service.ts:104,113` (вместо тихого `catch {}`)           | D-014 | S      |
| Q-009 | `npm audit fix` для dev-зависимостей                                                        | D-028 | S      |
| Q-010 | Удалить мёртвую строку `noteToMidi` (`WebMidiAdapter.ts:58`)                                | D-039 | S      |
| Q-011 | Обновить таблицу границ в `CLAUDE.md` (`@jazz/ui`, убрать `engine/`)                         | D-037 | S      |
| Q-012 | `AbortController` с таймаутом в `apiClient`                                                  | D-023 | S      |

---

## 8. Архитектурные риски (структурные, не точечные)

**Р-1. Декларация ≠ реальность («фасадные» абстракции).** Самый системный риск. Три абстракции объявлены, но в проде не работают так, как заявлено:
- `PluginContext` (DI-слой) — все сервисы пустые `{} as Service` (D-018). Плагин, вызвавший `ctx.storage.get()`, упадёт. Реальное взаимодействие идёт мимо — через прямые импорты SDK-хуков (`useAuth`, `useSettings`, `usePluginTransport`).
- 8 точек расширения (`commands`, `instruments`, `generators`…) — мёртвые типы `unknown[]`, хост их не агрегирует (D-004).
- `AudioPort` в Tone-адаптере — no-op-заглушки, реальное аудио идёт мимо порта (D-027).

Это частично известный долг фаз Ф2/Ф4, но опасность в том, что TypeScript-типы **маскируют** нерабочесть. Рекомендация: для каждой абстракции принять явное решение — либо реализовать, либо честно сузить контракт до фактически работающего. Не оставлять «обещание в типах».

**Р-2. Расширяемость shell захардкожена по конвенции путей.** Манифест плагина декларативен для `routes`/`navItems`, но `layout` и `protected` shell вычисляет строковым матчингом путей (D-019). Это противоречит принципу «тонкое ядро + плагины» и создаёт тихую дыру: новый защищённый маршрут вне известных префиксов попадёт в bare-layout без auth. Признаки маршрута должны жить в манифесте.

**Р-3. Production-hardening безопасности отстаёт от функциональности.** Не точечные баги, а отсутствующий слой: dev-login backdoor (D-001), нет `Secure`-cookie (D-002), нет rate limit (D-003), аудит построен, но не подключён (D-011), серверный `requirePermission` не навешен ни на один маршрут (admin-эндпоинтов пока нет, но при наполнении Ф4 клиентский `requires` ≠ защита). Изоляция ресурсов и валидация при этом сделаны хорошо.

**Р-4. Реактивность реального времени.** Воспроизведение тикает каждые 25мс через глобальный store без селекторов (D-005). Это архитектурный паттерн, а не один баг: любой новый компонент, подписавшийся на `usePlaybackStore()` целиком, унаследует проблему. Нужна конвенция «только селекторы для playback-store» + изоляция high-frequency индикаторов.

---

## 9. План действий (Roadmap)

| Фаза                             | Содержание                                                                 | Оценка   | Зависит от |
| -------------------------------- | -------------------------------------------------------------------------- | -------- | ---------- |
| **1. Quick Wins (security + утечки)** | Q-001…Q-012 (§7): security-hardening, утечки таймеров, ErrorBoundary, дубль store, audit-fix | ~1.5 дня | —          |
| **2. Тестовый долг**             | D-009 (flaky-изоляция), D-010 (transpose/patterns), D-029 (MIDI fallback)  | ~1.5 дня | Фаза 1     |
| **3. Структурные (риски §8)**    | D-004/D-018/D-027 (фасадные абстракции — решить контракт), D-016/D-017 (host-агрегация), D-019 (layout/protected в манифест), D-011/D-012 (аудит + error-handler) | ~5-7 дней | Фаза 2     |
| **4. Плановое оздоровление**     | D-013 (Zod на границах), D-020/D-021 (рефактор инструментов), D-023/D-024 (apiClient/хуки), D-034 (deprecation cleanup), D-031 (readonly VO) | ~5 дней  | Фаза 3     |
| **5. Косметика**                 | Остальные P3 (D-032/D-033 покрытие, D-035/D-036/D-038/D-040)               | ~2 дня   | по мере    |

---

## 10. Метрики для мониторинга

| Метрика                          | Текущее значение         | Цель                  | Как измерять                          |
| -------------------------------- | ------------------------ | --------------------- | ------------------------------------- |
| Тесты (pass / total)             | 734/736 (2 flaky)        | 736/736, 0 flaky      | `npm run test` (10 прогонов подряд)   |
| Покрытие критических модулей     | нет данных               | ≥80% для `music-core/audio`, `generator`, `chords`, `dsl` | `vitest --coverage` |
| CVE (severity ≥ high)            | 7 (5 high + 2 critical)  | 0                     | `npm audit`                           |
| Нарушения границ слоёв           | 0                        | 0                     | `npm run lint`                        |
| Ошибки типов                     | 0                        | 0                     | `npm run typecheck`                   |
| `as`-приведения на границах БД/JSON | ~30 (D-013)            | 0 (заменить на Zod)   | grep `as ` в `*.service.ts`           |
| Ре-рендеры/сек при playback      | ~40 (всё дерево)         | <5 (только индикатор) | React DevTools Profiler               |
| Фасадные абстракции              | 3 (PluginContext, ext-points, AudioPort) | 0 (реализовать или сузить) | ревью контракта SDK |

---

_Анализ v1, baseline. Объективные данные собраны на ветке `arch-review` (2026-06-15). Переанализ: команда «обнови TECH_DEPT» → инкрементальное сравнение с этим baseline._
