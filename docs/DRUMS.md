# Drums в джазовом тренажёре

> **Статус:** 🟢 Реализовано (section-driven scheduling, generic pattern engine)
> **Ядро (generic):** `packages/music-core/src/audio/pattern/` (`types.ts`, `engine.ts`)
> **Ядро (drum):** `packages/music-core/src/audio/drumInstrument.ts`, `drumPatternEngine.ts`, `drumCells.ts`, `drumMolecules.ts`, `drumOrganisms.ts`
> **Киты (плагины):** `packages/plugins/instruments/jazz-drum-kit/`, `packages/plugins/instruments/funk-drum-kit/`

## 1. Архитектура (organism → sectionMap → cell → molecule → atom)

Барабанный движок построен по четырёхуровневой модели авторинга. Уровни вкладываются друг в друга: организм содержит карту секций (`sectionMap`), каждая секция ссылается на пул клеток, клетка — на лейны с клипами, клип — на молекулы, молекула — на атомы.

```
DrumOrganism  (sectionMap + timeSignatureOverrides + defaultForm)
  └─ sectionMap[sectionType] → cellPool (cycling)
       └─ DrumCell (таймлайн 8/16/32 тактов)
            └─ DrumLane (роль: ride / kick / snare / hihat / fill / accent …)
                 └─ DrumClip (спан тактов + пул молекул)
                      └─ DrumMolecule (1–2 такта паттерна)
                           └─ DrumAtom (один удар: sound + atTick + velocity)
```

| Уровень | Файл (реестр) | Тип | Генерируется Конструктором? |
| --- | --- | --- | --- |
| Atom | `drumMolecules.ts` | `DrumAtom` (= `Atom<DrumSound>`) | — |
| Molecule | `drumMolecules.ts` | `DrumMolecule` (= `Molecule<DrumPatternStyle, DrumSound>`) | ✅ `drumMoleculesGenerated.ts` |
| Cell | `drumCells.ts` | `DrumCell` (= `Cell<DrumPatternStyle>`) | ✅ `drumCellsGenerated.ts` |
| Organism | `drumOrganisms.ts` | `DrumOrganism` (= `Organism<DrumPatternStyle>`) | ✅ `drumOrganismsGenerated.ts` |

### 1.0. Generic pattern engine

`packages/music-core/src/audio/pattern/` — инструмент-агностичное ядро, параметризованное по `<TStyle>` и `<TSound>`:

- `pattern/types.ts` — generic-типы: `Atom<TSound>`, `Hit<TSound>`, `Molecule<TStyle, TSound>`, `Cell<TStyle>`, `Organism<TStyle>`, `Lane`, `Clip`, `Dynamics`, `OrganismSection`.
- `pattern/engine.ts` — generic-функции: `applySwing`, `dynamicsMultiplier`, `assembleBar(cell, barInCell, swingRatio, resolveMolecule)`, `resolveSectionCells(organism, sectionType, tsKey)`.

Drum-слой (`drumPatternTypes.ts`, `drumPatternEngine.ts`) — тонкие обёртки, биндящие generic-функции к drum-реестрам (`DRUM_CELLS`, `DRUM_MOLECULES`). Это позволяет будущим инструментам (перкуссия и др.) переиспользовать тот же pattern-engine без дублирования.

**Правило подмены:** если `*Generated.ts` непуст, он **полностью** замещает базовый реестр (поддержка удаления записей через Конструктор). Сгенерированные клетки валидируются при загрузке (`validateCell()` в `drumCellValidator.ts`).

### 1.1. Жизненный цикл воспроизведения (v3)

1. `setStyleProfile(profile)` → `DrumInstrument` выбирает организм стиля (детерминированно, по фиксированному seed).
2. `setGridSections(sections)` → TransportEngine передаёт секции сетки в `DrumInstrument`.
3. `schedule(window, ctx)`:
   - **grid-секции доступны** → `resolveBarSlot()` для каждого такта находит секцию по `absoluteBar`, вызывает `patternEngine.selectCellForSectionType()` с `sectionType` и `timeSignature`. Клетки cycling-ятся каждые `cell.length` тактов.
   - **grid-секции недоступны (flat-режим)** → fallback на `organism.defaultForm` (сохраняет v2-поведение для обратной совместимости).
   - **timingSignatureOverrides** → приоритетный резолв: `timeSignatureOverrides[ts][sectionType]` > `sectionMap[sectionType]` > `sectionMap.verseA`.
   - **размер не 4/4 без override** → `scheduleDegradedSwing()` — упрощённый quarter-note swing по сильным долям.
4. Crash-accent overlay (kit-level контроль, не часть молекул) — добавляется в начале каждого N-го такта (`crashFrequency`).

### 1.2. Связка с секциями сетки

`DrumOrganismV3` использует `sectionMap` вместо линейной последовательности секций.
При наличии сетки с секциями (grid `sections`), `DrumInstrument` на лету выбирает
клетку для каждого такта в зависимости от типа секции (`verseA`, `bridge`, `chorus`, ...)
и её размера (`4/4`, `3/4`, ...).

Пример: сетка `[intro(2т), verseA(8т), bridge(4т), verseA(8т), ending(2т)]` →
каждый блок автоматически получит свою клетку из `sectionMap`.

Все 5 стилей (`swing`, `bossa`, `funk`, `latin`, `ballad`) имеют organisms и играют через organism-путь в 4/4. Соответствие стиль → pattern-стиль задаётся в `DrumInstrument.STYLE_TO_PATTERN` и `styleProfile.instrumentDefaults.drums.pattern`:

| Стиль | Pattern | Описание organism |
| --- | --- | --- |
| `swing` | `swing` | Ride-driven («ding ding-a-ding»), feathering kick, foot-chick 2&4, backbeat snare, ghost-texture |
| `bossa` | `bossa` | Son-clave 3-2 на rim + samba-surdo kick (call-response) + ровные восьмые hi-hat |
| `funk` | `funk` | Linear kick + 16-е hi-hat + жёсткий backbeat 2&4 + sizzle-crash |
| `latin` | `bossa`/`funk` | Деградирует к bossa/funk groove (cascade) |
| `ballad` | `swing` | Swing-организм с пониженной громкостью (volume 0.55) |

## 2. DrumSound — словарь звуков

`DrumSound` (`drumSampleRegistry.ts`) — объединение двух слоёв:

- **Abstract roles** (10) — чем оперируют молекулы старого поколения (`bassDrum`, `snare`, `hihat`, `ride`, `crash`, `rim`, `highTom`, `lowTom`, `hihatHalf`, `hihatOpen`).
- **Concrete articulations** (22) — конкретные сэмпл-ключи китов (`kick`, `snare_center`, `snare_edge`, `snare_buzz`, `snare_flam`, `snare_crossstick`, `snare_muted`, `snare_rimshot`, `snare_dig`, `hihat_closed`, `hihat_tight`, `hihat_open`, `hihat_foot`, `hihat_stir`, `ride_bow`, `ride_bell`, `crash_sizzle`, `splash`, `tom_mhi`, `tom_mlow`, `tom_hi`, `tom_lo`).

Маршрутизация роль → артикуляция → сэмпл идёт через kit-специфичные мапы (`JAZZ_ARTICULATION_MAP`, `FUNK_ARTICULATION_MAP`) + fallback-chain (`DRUM_SOUND_FALLBACK` в `drumSamplePlayer.ts`).

> **Технический долг (D-DRM-08):** смешение ролей и артикуляций в одном union. Планируется разделение на `DrumRole` / `DrumArticulation`, чтобы новый кит = 1 файл вместо правки 5 точек.

## 3. Настройки инструмента

`DrumInstrumentSettings` (`drumInstrument.ts`) — kit-level настройки, которые управляют воспроизведением поверх молекул:

| Настройка | Тип | Описание |
| --- | --- | --- |
| `enabled` | boolean | Master on/off |
| `volume` | number 0–1 | Master volume |
| `bassDrumEnabled` / `bassDrumVolume` | bool / 0–1 | Bass drum gate + volume |
| `snareEnabled` / `snareVolume` | bool / 0–1 | Snare gate + volume |
| `hihatEnabled` / `hihatVolume` | bool / 0–1 | Hi-hat gate + volume |
| `hihatOpenness` | int 0–5 | Hi-hat openness (tight closed → wide open) |
| `rideEnabled` / `rideVolume` | bool / 0–1 | Ride gate + volume |
| `crashEnabled` / `crashVolume` | bool / 0–1 | Crash gate + volume |
| `crashFrequency` | int | Crash accent каждые N тактов (0 = никогда) |
| `rimEnabled` / `rimVolume` | bool / 0–1 | Rim gate + volume |
| `tomEnabled` / `tomVolume` | bool / 0–1 | Tom gate + volume |
| `humanizeIntensity` | `'off'\|'low'\|'med'\|'high'` | Timing humanization (0/2/4/7 ms jitter) |

> **Важно:** настройки `bassDrumEnabled`/`snareEnabled`/... — это **kit-level gates**. Они фильтруют звук на уровне проигрывания (в `useTransport`), а не на уровне планирования атомов. Молекула может эмитить атом snare, но если `snareEnabled: false`, звук не заиграет.

## 4. Барабанные киты (плагины)

Киты реализованы как инструментальные плагины в `packages/plugins/instruments/`. Каждый плагин экспортирует `InstrumentManifest` + `articulationMap` через точку расширения `contributes.instruments`. Host (`useTransport.ts` / `useDrumPreview.ts`) импортирует манифесты напрямую из плагинов по алиасу.

```
packages/plugins/instruments/
  jazz-drum-kit/   ← definePlugin + jazzDrumKitManifest + JAZZ_ARTICULATION_MAP
  funk-drum-kit/   ← definePlugin + funkDrumKitManifest + FUNK_ARTICULATION_MAP
```

Добавление нового кита = новый плагин + регистрация в `plugin-registry` + алиасы (см. рецепт в `CLAUDE.md`). Выбор активного кита — `selectDrumKitManifest(drumKit)` в `useTransport.ts` / `useDrumPreview.ts`: `drumKit === 'funk-drum-kit'` → funk, иначе jazz.

### 4.1. Jazz Drum Kit

| Свойство | Значение |
| --- | --- |
| Плагин | `packages/plugins/instruments/jazz-drum-kit/` (`@jazz/plugin-jazz-drum-kit`) |
| Манифест | `src/manifest.ts` → `jazzDrumKitManifest` |
| Registry | `src/sampleRegistry.ts` → `JAZZ_DRUM_KIT_SAMPLE_FILES`, `JAZZ_ARTICULATION_MAP` |
| Источник сэмплов | Swirly Drums 1104 (акустическая джазовая установка, CC0) |
| Velocity layers | 4: `vl5` (p), `vl10` (mf), `vl15` (f), `vl20` (ff) |
| Round-robin | 4 на каждый звук |
| Формат | AAC (`.m4a`) с MP3-фолбэком |
| Размещение | `apps/web/public/samples/aac/drums/jazz-drum-kit/` |

**Артикуляции Jazz Kit:** `kick`, `snare_center`/`snare_edge`/`snare_dig`, `hihat_closed`/`hihat_tight`/`hihat_open`/`hihat_foot`/`hihat_stir`, `ride_bow`/`ride_bell`, `crash`, `splash`, `tom_mhi`/`tom_mlow`.

**Per-style defaults:** swing (stir on, tom off), bossa (snare off, snareEdge on, rim on, tom off), funk (stir off, tom on), latin (stir off, tom on), ballad (volume 0.55, stir on, tom off).

### 4.2. Funk Drum Kit

| Свойство | Значение |
| --- | --- |
| Плагин | `packages/plugins/instruments/funk-drum-kit/` (`@jazz/plugin-funk-drum-kit`) |
| Манифест | `src/manifest.ts` → `funkDrumKitManifest` |
| Registry | `src/sampleRegistry.ts` → `FUNK_DRUM_KIT_SAMPLE_FILES`, `FUNK_ARTICULATION_MAP` |
| Источник сэмплов | Virtuosity Drums (универсальная акустическая установка) |
| Velocity layers | 2–5 в зависимости от артикуляции (kick — 3, snare_center — 5, crossstick — 2) |
| Round-robin | 4 (кроме томов — по 1 на velocity layer) |
| Формат | AAC (`.m4a`) с MP3-фолбэком |
| Размещение | `apps/web/public/samples/aac/drums/funk-drum-kit/` |

**Артикуляции Funk Kit:** `kick`, `snare_center`/`snare_buzz`/`snare_flam`/`snare_crossstick`/`snare_muted`/`snare_rimshot`, `hihat_closed`/`hihat_open`/`hihat_foot`, `ride_bow`/`ride_bell`, `crash`/`crash_sizzle`, `tom_hi`/`tom_lo`.

**Per-style defaults:** swing (все funk-артикуляции off), bossa (snare off, crossstick on, rim on, funk-артикуляции off, tom off), funk (все funk-артикуляции on, tom on), latin (buzz on, rimshot on, tom on), ballad (volume 0.6, funk-артикуляции off).

### 4.3. Скрипты конвертации сэмплов

```bash
bash scripts/encode-drums-jazz.sh    # WAV → AAC/MP3 для Jazz Kit
```

## 5. Конструктор барабанов (admin)

`packages/plugins/admin-drum-constructor/` — UI для редактирования клеток/молекул/организмов. Сохранение идёт через `POST /api/dev/drum-source` (маршрут `dev.routes.ts`, только в dev-режиме), который:

1. **Валидирует payload** через zod-схемы из `@jazz/shared` (`drums.ts`): `DrumSourcePayloadSchema` покрывает cells/molecules/organisms с точечными сообщениями об ошибках.
2. **Записывает** валидные данные в `drumCellsGenerated.ts` / `drumMoleculesGenerated.ts` / `drumOrganismsGenerated.ts`.
3. При загрузке приложения generated-файлы **замещают** базовые реестры (если непусты), а клетки дополнительно проходят `validateCell()` — структурная проверка (lane count, velocity range, clip overlap, pool weights, корректность moleculeId).

Контракт Конструктора — канонический источник правды для формы данных: `packages/shared/src/drums.ts`.

## 6. Взаимодействие с другими инструментами

| Инструмент | Правило |
| --- | --- |
| **Bass** | Независимы. Барабаны не конфликтуют с басом по частотам. |
| **Piano** | Независимы. Барабаны — ритм, Piano — гармония. |
| **Rhodes** | Независимы. Разные частотные диапазоны. |

Drums используют свой `EventSink` (`'drums'`), не пересекаются с `noteSink`/`chordSink`.

## 7. Тесты

| Файл | Что покрывает |
| --- | --- |
| `drumInstrument.test.ts` | Organism-driven swing (ride-led, backbeat, feathering, foot-chick, crash, swing-ratio), 3/4 degraded, детерминизм |
| `drumPatternEngine.test.ts` | `assembleBar`, swing application, dynamics, `validateCell` |
| `instrumentManifest.test.ts` | per-style defaults для всех манифестов |
| `packages/shared/src/drums.test.ts` | zod-схемы Конструктора (16 тестов, включая регрессию `section.type: "verse"`) |

---

## Changelog

- **v3 cleanup + generic + plugins (2026-07):** Удалена legacy v2-обвязка (`DrumOrganism` v2, `migrateOrganism`, `selectCellForSection`, `BASE_DRUM_ORGANISMS`). `DrumOrganismV3` → `DrumOrganism` (единственный тип). Pattern-engine вынесен в generic-ядро `pattern/` (`Atom`/`Molecule`/`Cell`/`Organism` параметризованы по `<TStyle, TSound>`) — готов к переиспользованию перкуссией и др. Кит-манифесты (jazz/funk) вынесены из `music-core` в инструментальные плагины `packages/plugins/instruments/{jazz,funk}-drum-kit/` через типизированную точку расширения `contributes.instruments`. Удалены мёртвые остатки `modern-kit`/`drums` (styleProfile, UI-иконки, mp3-ассеты).
- **v3 (2026-07):** Section-driven scheduling. `DrumOrganism` с `sectionMap` и `timeSignatureOverrides`. `DrumInstrument` резолвит клетки на лету по grid-секциям. `TransportEngine` пробрасывает `gridSectionType`/`barInSection` в `ScheduleContext`.
- **v2 (2026-07):** Удалён legacy scheduling v1 (`scheduleSwing`/`Bossa`/`Funk`) и `DrumRandomizer` (~900 строк мёртвого кода). Добавлена zod-валидация Конструктора.

_См. также: `docs/DRUMS-VISION.md` (видение), `docs/DRUMS-PATTERNS.md` (паттерны), `docs/PERCUSSION.md` (перкуссия), `docs/BASS.md` (бас)_
