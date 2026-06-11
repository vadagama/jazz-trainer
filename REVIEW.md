# Ревью проекта jazz-trainer — отчёт и план исправления

**Дата:** 2026-06-11
**Ветка ревью:** `review/project-audit` (от `main` @ `1571d6d`, после мержа Phase 3)
**Фокус:** архитектура/границы, качество кода/баги
**Метод:** 3 параллельных агента-исследователя + прогон `typecheck`/`lint`/`test`; критичные находки перепроверены вручную.

---

## 0. Статус quality gate (проверено командами)

| Проверка | Результат | Факт |
| --- | --- | --- |
| `npm run test` | ✅ exit 0 | 25 файлов, **381 тест passed** (1.19s) |
| `npm run typecheck` | ❌ **exit 2** | Падает на плагинах: TS2307 (`@/…` модули), TS7006 (implicit `any`), TS2339 (`Navigator.clipboard`) |
| `npm run lint` | ❌ **exit 1** | **65 errors + 8 warnings** — в основном `import/no-unresolved` для `@/…` в плагинах |
| `npm run build` | ❌ сломан транзитивно | `build` начинается с `typecheck`, поэтому красный |

> ⚠️ **Главный вывод:** Phase 3 смержена в `main` со **сломанными `typecheck`, `lint` и `build`**. Тесты зелёные и приложение собирается через Vite, поэтому регресс не заметен на глаз, но CI-гейт фактически красный. Это нужно чинить в первую очередь.

---

## 1. Блокирующие проблемы (gate красный)

### B1 — `typecheck` падает (exit 2) · CRITICAL · проверено
**Где:** `packages/plugins/{catalog,core-editor,core-player}/src/**`
**Что:** при typecheck `@jazz/plugin-registry` (он импортирует плагины) tsc видит файлы плагинов и не может разрешить `@/…`-импорты, плюс находит реальные дыры типизации:
- `TS2307: Cannot find module '@/lib/utils' | '@/queries/…' | '@/components/ui/…'` — десятки.
- `TS7006: Parameter 'grid'/'e'/'v' implicitly has an 'any' type` — `CatalogPage.tsx:56`, `SearchBar.tsx:26,30`, `BarEditor.tsx:131,223,228,263`, `ChordPalette.tsx:104` и др.
- `TS2339: Property 'clipboard' does not exist on type 'Navigator'` — `DslModal.tsx:56` (нехватка нужного `lib`/типа в контексте проверки).

**Почему:** `build` начинается с `typecheck` → любой релиз/CI красный. Implicit `any` — реальная потеря типобезопасности.

### B2 — `lint` падает (exit 1, 65 errors) · CRITICAL · проверено
**Где:** все три плагина.
**Что:** `import/no-unresolved` на каждый `@/…`-импорт из `apps/web/src`; `import/no-duplicates` на двойной импорт из `@jazz/plugin-core-editor` (`PlayerPage.tsx:10-11`); `Unused eslint-disable directive` на `apps/web/src/engine/useTransport.ts:650`.

---

## 2. Архитектура и границы (нарушение ARCHITECTURE.md)

### A1 — Плагины напрямую импортируют код приложения · CRITICAL · проверено
**Где:** `packages/plugins/*/src/**` → `@/queries/*`, `@/stores/*`, `@/engine/*`, `@/components/ui/*`, `@/lib/*` (это `apps/web/src/*`).
**Что:** по ARCHITECTURE.md §2 плагин может зависеть только от `plugin-sdk`, `music-core`, `shared`. Реально каждый плагин жёстко привязан к внутренностям `apps/web`.
**Следствие:** плагин нельзя собрать/протестировать/переиспользовать отдельно; «плагинная» граница существует только на бумаге.

### A2 — `core-player` зависит от `core-editor` · CRITICAL · проверено
**Где:** `packages/plugins/core-player/src/PlayerPage.tsx:10-11` (`import { HarmonyGrid, PlayerToolbar } from '@jazz/plugin-core-editor'`); `packages/plugins/core-player/package.json` → `"@jazz/plugin-core-editor": "*"`.
**Что:** прямое нарушение принципа «плагины не знают друг о друге» (ARCHITECTURE.md §3.1).

### A3 — `core-editor` экспортирует UI-компоненты для других плагинов · MAJOR · проверено
**Где:** `packages/plugins/core-editor/src/index.ts` экспортирует `HarmonyGrid`, `PlayerToolbar` и др.
**Что:** обход контракта SDK; превращает плагин в «библиотеку компонентов» для соседей.

### A4 — `tsconfig` плагинов маскирует нарушение через `@/*` → `apps/web/src` · MAJOR · проверено
**Где:** `packages/plugins/*/tsconfig.json` → `"@/*": ["../../../apps/web/src/*"]`.
**Что:** костыль, из-за которого нарушение границ не ловится на уровне самого пакета. Именно он позволяет `@/…`-импортам «существовать».

### A5 — Граница плагин→app не enforced в ESLint · MAJOR · проверено
**Где:** `eslint.config.js`.
**Что:** `import/no-restricted-paths` не запрещает `packages/plugins/** → apps/web/src/**`; `eslint-plugin-boundaries` выдаёт warning про legacy selector syntax (v5→v6). Правило `import/no-unresolved` ловит симптом, но не блокирует архитектурно.

**Что сделано в Phase 3 хорошо (сохранить):** чистота `music-core` (без React/DOM), `shared` как источник Zod-DTO, контракты `plugin-sdk` (`definePlugin`, манифест + Zod-валидация), загрузка/агрегация в `plugin-host`, build-time `plugin-registry`.

---

## 3. Качество кода и баги

### C1 — Implicit `any` в плагинах · MAJOR · проверено (TS7006)
См. список в B1. Добавить явные типы параметрам (`grid`, `e`, `v`).

### C2 — `key={i}` для изменяемых списков аккордов · MAJOR · проверено
**Где:** `core-editor/src/components/BarCard.tsx:44`, `BarEditor.tsx:113`, `HarmonyGrid.tsx:274`, `PropertiesPanel.tsx:51`; `DslModal.tsx:118` (список ошибок).
**Что:** при вставке/удалении/перестановке аккордов React переиспользует DOM по индексу → возможна потеря состояния/фокуса при редактировании. (Понижено с «critical» агента до major: данные не теряются на сервере, но UX-баги при правке реальны.)
**Фикс:** стабильный ключ; в идеале добавить `id` в модель `ChordSlot`.

### C3 — `LikeButton` без блокировки на время мутации · MAJOR · проверено
**Где:** `packages/plugins/catalog/src/components/LikeButton.tsx`.
**Что:** нет `disabled` во время like/unlike → double-submit и рассинхрон оптимистичного апдейта.
**Фикс:** `disabled={like.isPending || unlike.isPending}`.

### C4 — Лишняя `eslint-disable` директива · MINOR · проверено
**Где:** `apps/web/src/engine/useTransport.ts:650`.
**Что:** ESLint сообщает `Unused eslint-disable` — правило ничего не репортит. (Агент-ревьюер ошибочно предлагал «добавить зависимости» — на деле директиву надо просто **удалить**.)

### C5 — `useTransport.ts` ~919 строк, дублирование `ticksToSeconds` · MINOR · частично проверено
**Где:** `apps/web/src/engine/useTransport.ts` (формула `durationTicks * 60 / (480 * bpm)` повторяется в note/chord sink). Code smell, кандидат на выделение хелпера и декомпозицию.

---

## 4. Аудио-движок (перепроверено вручную — severity скорректирована)

### D1 — Нет единого `swingRatio`: Rhodes 0.5 vs Drums 0.67 · MAJOR · подтверждено (SWING.md)
**Где:** `rhodesVoicing.ts` (`subdivision: 0.5`, ровные восьмые) vs `drumInstrument.ts` SWING_RIDE_OFFSETS (`0.67`, триоли).
**Что:** при одновременной игре фил рассинхронизирован; задокументировано как долг в SWING.md. Реализовать проброс `swingRatio` через `ScheduleContext`/`TransportEngineOptions`/DTO.

### D2 — Мёртвый код `lastScheduledTick` в `DrumInstrument` · MINOR · проверено
**Где:** `packages/music-core/src/audio/drumInstrument.ts:50,91,100,109,126,133`.
**Что:** поле пишется и сбрасывается, но **нигде не читается** (в отличие от Rhodes, где есть backward-seek). Удалить либо задействовать.

### D3 — `lastScheduledTick` хранит несдвинутое значение · MINOR · проверено (НЕ critical)
**Где:** `drumInstrument.ts:91…` и `rhodesInstrument.ts:100`.
**Что:** агент пометил как CRITICAL «события до начала окна» — **опровергнуто**: и в drums, и в rhodes есть защита `Math.max(window.fromTicks, atTicks + jitter)`, события не уходят за окно. Остаётся косметика: сохраняется `eventTicks`/`atTicks`, а не сдвинутое `t`. В drums это вообще dead code (D2); в rhodes влияние на backward-seek пренебрежимо (jitter ±6 мс ≪ `tpBeat`). Низкий приоритет.

### D4 — `setBpm` без валидации диапазона · MINOR · требует проверки
**Где:** `packages/music-core/src/audio/transportEngine.ts` (`setBpm`).
**Что:** агент сообщает об отсутствии clamp → риск `NaN`/деления при экстремальных BPM. Не верифицировано вручную — проверить и при необходимости добавить clamp `[20..400]`.

### D5 — Контракт volume `[0..1]` (DTO) vs `real()` без CHECK (БД) · MINOR · требует проверки
**Где:** `packages/shared/src/dto.ts` vs `apps/api/src/db/schema.ts`.
**Что:** DTO валидирует диапазон, БД — нет. Риск только при прямом SQL/миграции. Добавить CHECK или валидацию в `toSettingsDTO`.

---

## 5. План исправления (по приоритету)

### Этап 1 — Вернуть зелёный gate (быстрые, низкорисковые)
1. **C4:** удалить лишнюю `eslint-disable` в `useTransport.ts:650`.
2. **C1:** проставить явные типы параметрам (`grid`, `e`, `v`) в `catalog`/`core-editor` → убрать TS7006.
3. **B1/TS2339:** починить тип `Navigator.clipboard` в `DslModal.tsx` (корректный `lib`/`navigator.clipboard?.`).
4. После 1–3 повторить `npm run typecheck && npm run lint && npm run test` — добиться зелёного (с учётом, что B2/A1 закроются на Этапе 2).

> Если нужен **минимальный** зелёный gate без рефакторинга границ — временно расширить ESLint-резолвер на `@/*`-алиас плагинов и зафиксировать это как технический долг (ссылка на Этап 2). Решение за тобой — см. вопрос ниже.

### Этап 2 — Восстановить плагинную границу (архитектурный долг Phase 3)
5. **A3+A2:** вынести разделяемые UI-компоненты (`HarmonyGrid`, `PlayerToolbar`, …) в отдельный пакет `@jazz/plugin-ui` (React-компоненты), убрать их экспорт из `core-editor` и зависимость `core-player → core-editor`.
6. **A1:** абстрагировать `@/queries`/`@/stores`/`@/engine`/`@/components/ui` за `PluginContext` (сервисы host) или прокинуть через props из shell; плагины не импортируют `apps/web/src`.
7. **A4:** убрать `@/* → apps/web/src` из `packages/plugins/*/tsconfig.json`.
8. **A5:** добавить в ESLint правило-границу `packages/plugins/** ✗→ apps/web/src/**`; мигрировать `eslint-plugin-boundaries` на v6-селекторы.
9. **B2:** после 5–8 `lint` станет зелёным без костылей.

### Этап 3 — Качество UI
10. **C2:** стабильные ключи списков; добавить `id` в `ChordSlot`.
11. **C3:** `disabled` на время мутаций в `LikeButton` (проверить аналогичные кнопки).
12. **C5:** выделить `ticksToSeconds`, наметить декомпозицию `useTransport`.

### Этап 4 — Аудио-долг
13. **D2/D3:** удалить мёртвый `lastScheduledTick` из `DrumInstrument`.
14. **D4/D5:** проверить и при необходимости добавить clamp BPM и CHECK на volume.
15. **D1:** реализовать единый `swingRatio` по SWING.md (более крупная задача — отдельный план).

---

## 6. Заметки о достоверности
- Все находки разделов 1–3 и A1–A5 **проверены** командами/чтением кода.
- Аудио-находки D1–D3 проверены вручную; **D3 понижен** с CRITICAL (агент) до MINOR — защита `Math.max` присутствует.
- D4, D5 помечены «требует проверки» — не верифицированы напрямую.
- Числовые оценки агентов (напр. «107 TS-ошибок») не воспроизведены и в отчёт не включены.
