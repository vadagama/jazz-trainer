# Bass в джазовом тренажёре

> **Статус:** 🟢 Реализовано (pattern-engine + step engine)
> **Плагин:** `packages/plugins/instruments/bass/` (`@jazz/plugin-bass`)
> **Движок:** `packages/music-core/src/audio/bassInstrument.ts` + `bassStepEngine.ts` + `bassMolecules.ts` / `bassCells.ts` / `bassOrganisms.ts`
> **Спецификация:** `docs/MELODIC-PLUGIN.md`

## 1. Роль баса

Бас — фундамент ритм-секции. В Jazz Trainer он выполняет три функции:

- **Гармонический фундамент:** играет root, 5-ю, 3-ю, 7-ю ступени аккордов
- **Ритмический пульс:** walking bass (четверти) в swing, half-notes в bossa/ballad, синкопы в funk, montuno в latin
- **Связки (approach notes):** хроматические и диатонические подходы к следующему аккорду

## 2. Два варианта (upright + electric)

Бас существует как **один плагин** (`@jazz/plugin-bass`), контрибутящий **два инструмента** с разными сэмпл-библиотеками:

| Инструмент        | id              | Стили              | Палитра артикуляций                  | Сэмплы    |
| ----------------- | --------------- | ------------------ | ------------------------------------ | --------- |
| **Upright Bass**  | `upright-bass`  | swing, bossa, ballad | `regular`, `muted`                 | Sneakybass|
| **Electric Bass** | `electric-bass` | funk, latin         | `regular`, `muted`, `rel`, `stac`  | darkblack |

### 2.1. Переключение варианта (user-facing)

Вариант выбирается **пользователем** через настройку `bassVariant` (`upright` | `electric` | авто-по-стилю):

- **Авто (по стилю)** — default: upright для swing/bossa/ballad, electric для funk/latin (из `StyleProfile.defaultVariants.bass`).
- **Upright / Electric** — явный выбор, применяется ко **всем** стилям.

`BassInstrument.setVariant()` переключает variant в рантайме. `BassInstrument.setStyleProfile()` **больше не** авто-переключает variant — только пользователь (или default по стилю, если variant не задан).

**Cross-style fallback:** если выбран вариант для стиля, под который у него нет авторского контента (например electric на swing), pattern engine прозрачно fallback'ит на родной стиль варианта (electric→funk-контент, upright→swing-контент). Так electric-bass звучит на swing, а upright-bass — на funk, без ошибок.

### 2.2. Артикуляции (виды звукоизвлечения)

Молекула хранит **только артикуляцию** — какую ступень играть, решает движок (§3.1).

- `regular` — основная, полный sustained тон (walking quarters, half-notes). Сэмплы: Sneakybass `pluck` / darkblack `reg`.
- `muted` — заглушённые/ghost-ноты, для лёгких синкоп и подходов. Сэмплы: Sneakybass `mute` / darkblack `ghost`.
- `rel` — супер-короткие release-хвосты для быстрых акцентов (electric-only: darkblack `rel`).
- `stac` — резкое стаккато для offbeat/montuno ударов (electric-only: darkblack `stac`).

> **Маппинг старых артикуляций** (для справки): `pluck`+`reg` → `regular`; `mute`+`ghost` → `muted`; `rel`/`stac` — без изменений.

## 3. Step-engine модель (зеркало архитектуры пианино)

Бас построен на generic pattern-engine (`packages/music-core/src/audio/pattern/`), как drums/percussion/piano. **Ключевая идея** (повторяет `VoiceRole → buildPianoVoicing` у пианино):

> Молекула хранит только артикуляцию (`regular`/`muted`/`rel`/`stac`). **Какую ступень играть, движок решает в runtime** — `BassStepEngine.resolveBassStep()` выбирает step по стилю, tension, позиции в такте. Pitch резолвится из step + текущего аккорда.

Это позволяет одной молекуле звучать корректно над любым аккордом, в любой тональности, и при любом tension — ровно как одна piano-молекула (`chord` role) работает над любым аккордом.

Иерархия:

```
Organism (section-driven form)
  └── sectionMap: 8 SectionType → cell pool
      └── Cell (8/16-bar timeline of lanes)
          └── Lane 'bass' (probability 1.0) + опц. 'accent'
              └── Clip pools (молекулы циклически per-bar)
                  └── Molecule (1-2 bar rhythm skeleton)
                      └── Atom = BassArticulation (regular/muted/rel/stac)
```

### 3.1. BassStepEngine

`resolveBassStep(atTick, tpBeat, tpBar, chord, { pattern, tension, nextChord })` — мозг выбора ступеней. Аналог `buildPianoVoicing` для баса.

**Логика по `BassPattern` (walking/root-5th/montuno/syncopated/two-feel) + `tension`:**

| Pattern     | clean                | moderate                  | altered                  | max                        |
| ----------- | -------------------- | ------------------------- | ------------------------ | -------------------------- |
| walking     | root, fifth          | + third, approach (B4)    | + seventh                | + chromaticism, octave     |
| root-5th    | root, fifth          | + approach                | + octave                 | + octave                   |
| two-feel    | root                 | + fifth                   | + approach               | + approach                 |
| syncopated  | root, fifth          | + third                   | + seventh, octave        | + full color               |
| montuno     | root, fifth, octave  | + approach                | + seventh                | + full color               |

- **approach** yield'ится когда атом в последней доле такта и `nextChord` отличается от текущего (хроматический/диатонический подход к следующему корню).
- `useMutedNotes: false` → атомы `muted` пропускаются (thinning the groove).

### 3.2. Tension и Phrasing (зеркало piano)

- **`bassTension`** (`clean`/`moderate`/`altered`/`max`) — user-facing ручка «сколько гармонической краски». Gates which chord steps the engine may pick.
- **`bassPhrasing`** (`flat`/`gentle`/`expressive`) — velocity-кривая по 4-тактной фразе (зеркало `phrasingMultiplier` из piano). Применяется в `BassInstrument.phrasingMultiplier`.
- **`bassUseMutedNotes`** (`boolean`) — переключатель ghost-нот.

### 3.3. Сложность (complexity 1–3)

Молекулы декларируют `complexity: {min, max: 1|2|3}`. Клетки комбинируют sparse/medium/dense пулы; организмы выбирают более плотные клетки для chorus'ов. (Legacy `bassComplexity` 1–7 — no-op, сохранён для обратной совместимости.)

## 4. Молекулы по стилям

### 4.1. Swing (walking bass) — upright palette

Четвертные walking-паттерны: `regular` на каждой доле, `muted` на последней доле (approach). Tension clean → root/fifth; moderate+ → third/seventh/approach.

### 4.2. Bossa (root-5th) — upright palette

Половинные: `regular` на 1 и 3. Higher complexity: `muted` approach в конце фразы.

### 4.3. Ballad (two-feel) — upright palette

Половинные: `regular` на 1 и 3. Higher complexity: `regular` + `muted` approach.

### 4.4. Funk (syncopated) — electric palette

Ядро funk — **muted (ghost) notes** на синкопах «&». `regular` на 1, `muted` на 1&, `stac` на offbeats, `rel` в конце фразы. High complexity = плотные 16-е/32-е muted-chatter.

### 4.5. Latin (montuno) — electric palette

Tumbão: `regular` на 1, `stac` на 2&, `stac`/`regular` на 4. 2-bar варианты следуют 2-3 clave.

## 5. Pitch resolution

`resolveBassStepPitch(step, chord, ...)` центрирует все ноты на **октаве 2** с потолком **C4** (диапазон B1–C4):

- `root` → octave 2 (C2–B2)
- `octave` → octave 3 (C3–B3)
- `fifth`/`third`/`seventh` → G2–G3 (интервалы от root)
- `approach` → chromatic/diatonic подход к следующему аккорду (через `BassRandomizer`)

Бас не играет аккордами или соло — только фундаментальные ступени в оптимумном басовом регистре.

## 6. Сэмплы

### 6.1. Upright (Sneakybass)

- **Формат:** AAC (`.m4a`) + MP3-фолбэк
- **Размещение:** `apps/web/public/samples/aac/bass/{pluck,mute}/`
- **Логические артикуляции → сэмплы:** `regular` → `pluck`, `muted` → `mute`
- **Round-robin:** 4 варианта на ноту × артикуляцию
- **Анкеры:** pluck — `C2, Eb2, Gb2, A2, C3, Eb3, Gb3, A3, C4`; mute — `Db2, E2, G2, Bb2, Db3, E3, G3, Bb3`

### 6.2. Electric (darkblack)

- **Формат:** AAC + MP3
- **Размещение:** `apps/web/public/samples/aac/bass/electric/{reg,stac,rel,ghost}/`
- **Логические артикуляции → сэмплы:** `regular` → `reg`, `muted` → `ghost`, `rel` → `rel`, `stac` → `stac`
- **Round-robin:** 4 × артикуляцию (используется `f` velocity-слой)
- **Анкеры:** `B1, D2, F2, Ab2, B2, D3, F3, Ab3, C4` (каждую терцию)
- **Кодирование:** `scripts/encode-bass-electric.sh`

Tone.js интерполирует ±2 полутона от каждого анкера. Маппинг логическая→сэмпл-артикуляция выполняется в `useTransport.ts` `bassEventSink`.

### 6.3. Round-robin

4 RR-варианта на ноту × артикуляцию. `RoundRobinCounter` циклически перебирает варианты, избегая «machine gun effect».

## 7. Манифесты

```ts
export const uprightBassManifest: InstrumentManifest = {
  id: 'upright-bass',
  family: 'pitched',
  settingsPrefix: 'bass',
  createInstrument: () => new BassInstrument(new ChordTimeline(), 'upright'),
  sampleManifest: UPRIGHT_BASS_SAMPLE_MANIFEST,
  perStyleDefaults: {
    swing: { pattern: 'walking' }, bossa: { pattern: 'root-5th' },
    funk: { enabled: false, volume: 0 }, latin: { enabled: false, volume: 0 },
    ballad: { pattern: 'two-feel' },
  },
};

export const electricBassManifest: InstrumentManifest = {
  id: 'electric-bass',
  family: 'pitched',
  settingsPrefix: 'bass',
  createInstrument: () => new BassInstrument(new ChordTimeline(), 'electric'),
  sampleManifest: ELECTRIC_BASS_SAMPLE_MANIFEST,
  perStyleDefaults: {
    swing: { enabled: false, volume: 0 }, bossa: { enabled: false, volume: 0 },
    funk: { pattern: 'syncopated' }, latin: { pattern: 'montuno' },
    ballad: { enabled: false, volume: 0 },
  },
};
```

## 8. StyleProfile интеграция

- `styleProfile.ts`: `defaultVariants.bass` = `upright-bass` (swing/bossa/ballad) или `electric-bass` (funk/latin)
- `instrumentDefaults`: для каждого стиля ровно один вариант включён, с per-style `tension` и `humanize.phrasing`:
  - swing → `moderate` / `expressive`
  - bossa → `clean` / `gentle`
  - funk → `altered` / `expressive`
  - latin → `moderate` / `gentle`
  - ballad → `clean` / `flat`

## 9. Взаимодействие с другими инструментами

| Инструмент | Правило                                                     |
| ---------- | ----------------------------------------------------------- |
| **Drums**  | Независимы. Бас держит гармонию, барабаны — groove          |
| **Rhodes** | Rhodes избегает низкого регистра (C3–C4), оставляя его басу |
| **Piano**  | Бас — нижний слой, Piano — средний/верхний (C3–C6)          |

## 10. Конструктор баса (admin)

`packages/plugins/admin-bass-constructor/` — admin-инструмент для авторинга молекул/клеток/организмов.

- **Строки сетки = 4 артикуляции** (`regular`, `muted`, `rel`, `stac`) — ступеней в конструкторе нет, их выбирает движок.
- **Сетка 32-е ноты** (subdivisions=8) — такая же мелкая, как у барабанов. 32 колонки/такт для funk/latin, позволяет редактировать плотные chatter-молекулы.
- **BassVariantSelector** (`ToolbarExtras`) — переключает upright/electric в тулбаре; preview грузит сэмплеры выбранного варианта (Sneakybass/darkblack).
- Preview использует `resolveBassStep` + `resolveBassStepPitch` (та же логика, что в `BassInstrument`), с статичным `PREVIEW_CHORD = Cmaj7` и preview-tension `clean`.
- `PreviewPlayOptions.style` передаётся из `ConstructorPage` чтобы preview выбирал правильный `BassPattern` (walking/root-5th/montuno/...).

## 11. Тесты

- `bassInstrument.test.ts` — scheduling обоих вариантов, палитры артикуляций, диапазон B1–C4, step engine (clean vs max tension), useMutedNotes gate, **variant switching + cross-style fallback**, organism/cell/molecule реестры
- `bassManifest` (в плагине) — id уникальны, perStyleDefaults покрывают 5 стилей, sampleManifest валиден
- `multiChordIntegration.test.ts` — интеграция баса с piano/rhodes в multi-chord тактах

---

_См. также: `docs/MELODIC-PLUGIN.md`, `docs/PIANO.md`, `docs/RHODES.md`, `docs/DRUMS.md`_
