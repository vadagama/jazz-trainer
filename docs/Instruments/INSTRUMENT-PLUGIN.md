# INSTRUMENT-PLUGIN.md — Целевая архитектура инструментов-плагинов

> Статус: **реализовано (Вариант A)** — 2026-07-07. Документ фиксирует, как
> инструменты (барабанные киты, перкуссия и последующие) подключаются к оболочке
> через живой плагинный контракт, без хардкода в shell. Основан на валидации
> `jazz-drum-kit`, `funk-drum-kit`, `percussion`.
>
> **Что сделано:** живой реестр инструментов (F1/F2/F4a закрыты), percussion
> вынесен в плагин (F3), `resolveInstrumentDefaults` заведён в продакшн + удалён
> мёртвый `organismId` из `styleProfile` (F4b), общий `buildVelocityRR` в ядре
> (F5), тест для funk (F7). **Остаток:** полная унификация per-style дефолтов на
> стороне UI требует доступа плагинов к реестру инструментов через
> PluginContext/SDK — см. §5.1.

---

## 1. Проблема (as-is)

По итогам валидации трёх инструментов обнаружено, что «плагинность» фиктивна:

| # | Находка | Файл |
|---|---|---|
| F1 | `contributes.instruments` агрегируется, но **поле `AggregatedContributions.instruments` не читает никто** — мёртвый контракт | `plugin-host/src/aggregator.ts` |
| F2 | Shell **импортирует конкретные плагины напрямую** и выбирает кит хардкод-тернарником | `apps/web/src/hooks/useTransport.ts`, `useDrumPreview.ts` |
| F3 | `percussion` **не плагин**: манифест, sampleRegistry и движок целиком в `music-core` — асимметрия с китами | `music-core/src/audio/percussion*` |
| F4a | `manifest.createInstrument()` **никогда не вызывается** для барабанов/перкуссии (shell делает `new DrumInstrument()` напрямую) | `useTransport.ts:540` |
| F4b | `manifest.perStyleDefaults` и `resolveInstrumentDefaults()` **используются только в тестах** — пер-стилевые дефолты дублируются в `styleProfile.ts` | `instrumentManifest.ts`, `styleProfile.ts` |
| F5 | Хелпер `rr4` **скопирован** в оба кита (плагины не могут импортировать друг друга) | оба `sampleRegistry.ts` |
| F7 | Тесты асимметричны: у `jazz` есть `manifest.test.ts`, у `funk` — нет | — |

Корень: **оболочка знает инструменты поимённо**, вместо того чтобы получать их
из реестра вкладов. Добавление нового кита требует правки shell.

---

## 2. Принцип целевого решения

> **Оболочка не знает ни одного инструмента по имени.** Единственный источник
> правды — реестр вкладов `contributions.instruments`, собранный из плагинов.
> Движок инструмента (`DrumInstrument`, `PercussionInstrument`) живёт в ядре;
> плагин поставляет только **манифест + маршрутизацию сэмплов**.

Три зафиксированных решения (owner-подтверждено):

1. **Движок — в ядре.** `PercussionInstrument` и весь pattern-слой
   (`percussionPatternEngine`, `percussionCells/Molecules/Organisms`,
   `percussionPatternTypes`) остаются в `music-core` — симметрично тому, что
   `DrumInstrument` уже в ядре. В плагин переезжают только `manifest` и
   `sampleRegistry`.
2. **Инстанцирование — через `manifest.createInstrument()`.** Shell создаёт
   движок фабрикой из манифеста, а не `new ...()`. Поле перестаёт быть
   вестигиальным (закрывает F4a).
3. **`perStyleDefaults` — единый источник.** Пер-стилевые дефолты инструмента
   берутся из `manifest.perStyleDefaults` через `resolveInstrumentDefaults()`.
   `styleProfile.ts` перестаёт дублировать per-instrument настройки для
   мигрированных инструментов (закрывает F4b).

---

## 3. Контракт инструмента-плагина (канонический вид)

```
packages/plugins/instruments/<name>/
  package.json          # deps: @jazz/music-core, @jazz/plugin-sdk, @jazz/shared
  src/
    index.ts            # definePlugin({ contributes: { instruments: [...] } })
    manifest.ts         # InstrumentManifest: id, name, createInstrument, sampleManifest,
                        #                     defaultSettings, perStyleDefaults
    sampleRegistry.ts   # sound → velocity layer → [rr filenames] + articulationMap
    manifest.test.ts    # resolveInstrumentDefaults × все стили (обязательно)
```

**`InstrumentContribution`** (`plugin-sdk/src/extension-points.ts`) — без изменений:

```ts
interface InstrumentContribution {
  manifest: InstrumentManifest;          // из @jazz/music-core
  articulationMap?: Record<string, string>; // abstract sound → concrete sample key
}
```

**Что остаётся в ядре (`music-core`):**
- классы движков: `DrumInstrument`, `PercussionInstrument`;
- pattern-инфраструктура (engine, cells, molecules, organisms, types);
- тип `InstrumentManifest` + `resolveInstrumentDefaults()`;
- общий хелпер построения RR-раскладки (см. §6, закрывает F5).

**Что живёт в плагине:**
- `InstrumentManifest` конкретного инструмента (данные, не логика);
- `sampleRegistry` (раскладка файлов) + `articulationMap`;
- `definePlugin` обёртка и регистрация.

---

## 4. Поток данных (to-be)

```
plugin-registry ──► bootstrap.ts: aggregateContributions()
                         │
                         ▼
              contributions.instruments : InstrumentContribution[]
                         │
        ┌────────────────┴─────────────────┐
        ▼                                   ▼
  instrument registry                 (build-time, статично)
  Map<id, InstrumentContribution>
        │
        ▼
  useTransport / useDrumPreview
     resolve by settings.drumKit  ──►  contribution.manifest.createInstrument()
                                       contribution.manifest.sampleManifest   (createOneshotResources)
                                       contribution.articulationMap           (routing DrumSound → sample key)
                                       resolveInstrumentDefaults(manifest, style)  (per-style defaults)
                                            │
                                            ▼  user settings (settings.drums*) слоем поверх
                                       instrument.updateSettings(...)
```

**Ключевое изменение против as-is:** пунктир `settings.drumKit === 'funk-...' ? A : B`
и прямые импорты `@jazz/plugin-*-drum-kit` заменяются на **lookup по `id` в
реестре**. Shell зависит только от `contributions` из `shell/bootstrap.ts`.

---

## 5. Слои настроек (разграничение ответственности)

После унификации (решение 3) источники правды строго разделены:

| Уровень | Где живёт | Что описывает |
|---|---|---|
| **Стиль** | `styleProfile.ts` | roster, `defaultVariants` (какой кит активен), tempo, swing, тактовые размеры |
| **Инструмент × стиль** | `manifest.perStyleDefaults` | пер-стилевые дефолты инструмента (enabled/volume/pattern + гранулярные per-sound) |
| **Пользователь** | UserSettings DTO (`settings.*`) | ручные оверрайды поверх всего |

Разрешение: `styleProfile` выбирает вариант → `resolveInstrumentDefaults(manifest, style)`
даёт дефолты инструмента → пользовательские `settings.*` накладываются сверху.

> **Scope унификации в этом PR:** переносятся `jazz-drum-kit`, `funk-drum-kit`,
> `percussion`. Для этих id per-instrument дефолты уходят из
> `styleProfile.instrumentDefaults` в `manifest.perStyleDefaults`. Остальные
> инструменты (piano, bass, guitar, rhodes, …) мигрируют тем же паттерном
> **позже** — целевое состояние: `styleProfile.instrumentDefaults` не содержит
> per-instrument настроек вообще.

### 5.1 Ограничение: UI не видит реестр инструментов (обнаружено при реализации)

Полная унификация упирается в границы слоёв. Потребители per-style дефолтов на
стороне UI — `core-settings` (`InstrumentTile`, `SettingsPage`) — это **плагин**,
которому линтер запрещает импортировать другие плагины (`@jazz/plugin-*-drum-kit`,
`@jazz/plugin-percussion`), где теперь живут манифесты. Реестр `contributions`
живёт в shell (`apps/web`), а плагин не может импортировать оболочку.

Поэтому в этом заходе унифицирован только тот per-style дефолт, что доступен из
shell и был реальным дублем:

- `resolveInstrumentDefaults(manifest, style)` заведён в продакшн (`useTransport`)
  как канонический резолвер per-style дефолтов percussion (organism).
- Из `styleProfile.instrumentDefaults.percussion` удалён `organismId` — он был
  **мёртвым дублем** (никто не читал; живой источник — `manifest.perStyleDefaults`)
  и вдобавок ломал типизацию (`organismId` нет в `InstrumentStyleDefaults`).

**Следующий шаг (вне этого PR):** экспонировать реестр инструментов через
`PluginContext` / `@jazz/plugin-sdk` (напр. `ctx.instruments.resolveDefaults(id, style)`),
чтобы `core-settings` и другие плагины брали per-style дефолты из реестра, а
`styleProfile.instrumentDefaults[id]` для инструментов-плагинов исчез полностью.
Пока грубые дефолты (`enabled`/`volume`/`pattern`) этих id остаются в `styleProfile`
как источник для UI — это не дубль (гранулярных per-sound полей там нет).

---

## 6. Устранение дублирования `rr4` (F5)

Общий билдер RR-раскладки выносится в ядро рядом с `SampleManifest`:

```ts
// music-core/src/audio/sampleManifest.ts
export function buildVelocityRR(
  name: string, layers: readonly string[], rrCount = 4,
): Record<string, string[]> { /* ... */ }
```

Оба кита импортируют его из `@jazz/music-core` вместо локальной копии.

---

## 7. План внедрения (фазами, каждая — зелёный gate)

Gate после каждой фазы: `npm run typecheck && npm run lint && npm run test`.

### Фаза 1 — Живой реестр (F1, F2, F4a) — без выноса percussion
1. `shell/bootstrap.ts`: экспортировать `instrumentsById: Map<string, InstrumentContribution>`.
2. `useTransport.ts`, `useDrumPreview.ts`: убрать импорты `@jazz/plugin-*-drum-kit`
   и тернарник `selectDrumKitManifest`; резолвить манифест и `articulationMap`
   из реестра по `settings.drumKit`.
3. Инстанцировать движок через `contribution.manifest.createInstrument()`.
4. Fallback: если `drumKit` не найден в реестре → `jazz-drum-kit` (дефолт).

### Фаза 2 — Percussion как плагин (F3)
5. Создать `packages/plugins/instruments/percussion` (шаблон §3).
6. Перенести `percussionManifest` + `percussionSampleRegistry` в плагин; движок
   и pattern-слой **оставить** в `music-core`.
7. Убрать экспорт `percussionManifest` из `music-core/audio/index.ts`; перенести
   `manifest.test.ts` в плагин (тест ядра не может импортировать плагин — boundaries).
8. Зарегистрировать в `plugin-registry`; добавить алиасы в **4 файла**
   (vite.config / tsconfig.base / **apps/web/tsconfig** / vitest — apps/web
   переопределяет `paths` целиком, не наследуя base) + `npm install` для линковки
   нового workspace-пакета.
9. Shell резолвит percussion из того же реестра.

### Фаза 3 — Унификация perStyleDefaults (F4b) — за аудио-гейтом
10. Завести `resolveInstrumentDefaults(manifest, style)` в продакшн (`useTransport`)
    как канонический резолвер per-style дефолтов percussion.
11. Удалить мёртвый `organismId` из `styleProfile.instrumentDefaults.percussion`
    (bossa, funk) — см. §5.1 про ограничение полной унификации на стороне UI.
12. **Аудио-проверка**: прослушать все 5 стилей × (jazz/funk/percussion) в
    Drum Constructor и Player — звучание не должно измениться (изменение
    провабельно эквивалентно; покрыто юнит-тестами манифестов).

### Фаза 4 — Чистка (F5, F7)
13. Вынести `buildVelocityRR` в ядро, заменить локальные `rr4`.
14. Добавить `manifest.test.ts` для `funk-drum-kit`.

---

## 8. Критерии приёмки

- [x] `apps/web` не содержит импортов `@jazz/plugin-*-drum-kit` (grep пуст).
- [x] Добавление нового кита-плагина = создать пакет + регистрация + алиасы (4
      файла) + `npm install`; **правки логики shell не требуются**.
- [x] `percussion` живёт в `plugins/instruments/percussion`, зарегистрирован.
- [x] `manifest.createInstrument()` — единственный путь создания движка в shell
      (drums + percussion).
- [x] `resolveInstrumentDefaults` вызывается в продакшене (`useTransport`), не
      только в тестах.
- [x] `styleProfile.instrumentDefaults` не содержит per-sound / `organismId`
      дефолтов для 3 id (полное удаление грубых `enabled`/`volume` — отложено, §5.1).
- [x] Общий `buildVelocityRR` в ядре; локальный `rr4` удалён из обоих китов.
- [x] `manifest.test.ts` есть у jazz **и** funk; percussion-тест — в плагине.
- [x] Мой домен зелёный: typecheck без новых ошибок (починены 2 pre-existing
      `organismId`), lint = baseline, test = baseline (18 тестов инструментов ✓).
- [ ] Аудио 5 стилей на слух — рекомендуется ручная проверка (изменение
      провабельно эквивалентно; unit-тесты манифестов зелёные).
- [ ] (Отложено) Реестр инструментов экспонирован через PluginContext/SDK — §5.1.

---

## 9. Риски

- **Фаза 3 меняет источник per-style дефолтов** → риск смены звучания. Митигируется
  переносом дефолтов «один в один» и обязательной аудио-проверкой (шаг 12).
- **Порядок инициализации Tone.js в useTransport** сложный (bespoke setup на
  каждый инструмент). Реестр меняет только *источник данных*, не порядок setup.
- **Boundaries**: тесты `music-core` не могут импортировать плагины — тест
  percussion-манифеста обязан переехать в пакет плагина.
```
