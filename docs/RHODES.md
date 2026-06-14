# Rhodes в джазовом тренажёре

## План задач

### Фаза 1 — Аудио-пайплайн

- [x] Разобрать velocity-слои по именам файлов: 4 слоя — soft (~5x/~5xx), medium (~28x), hard (~43x), bark (~11xx/~21xx); слой ~36x пропущен
- [x] Конвертировать FLAC → OGG: все 65 файлов, libopus 128k в OGG-контейнере (libvorbis недоступен в ffmpeg Homebrew)
- [x] Создать `packages/music-core/src/audio/rhodesSampleRegistry.ts` (NoteMap × 4 velocity layers + `pickRhodesLayer`)
- [x] OGG-файлы размещены в `apps/web/public/samples/rhodes/`

> **Примечание:** Некоторые высокие ноты имеют меньше слоёв — A5–C7 нет medium, Tone.js интерполирует от E5.

### Фаза 2 — Движок (пакет `instruments`)

- [x] Создать класс `RhodesInstrument` (аналог `BassInstrument`)
- [x] Реализовать 4 Tone.js Sampler по velocity-слоям (soft / medium / hard / bark) и `pickRhodesLayer(velocity)`
- [x] Реализовать цепочку эффектов: EQ3 → Tremolo → Chorus → Reverb → Channel
- [x] Voicing engine:
  - [x] `shell2` — 3rd + 7th
  - [x] `rootless3` — 3rd + 7th + color (9th)
  - [x] `rootless4` — 3rd + 7th + 9th + 13th
  - [x] Voicings для всех типов аккордов: maj7, m7, dom7, m7b5, dim7
- [x] Voice leading: алгоритм минимального движения голосов между аккордами
- [x] Ритмические паттерны: `wholeNotes`, `halfNotes`, `quarterNotes`
- [x] Humanization (±6 ms timing, ±0.05 velocity)

### Фаза 3 — Transport / Scheduling

- [x] Интегрировать `RhodesInstrument` в transport engine (аналог Bass)
- [x] Реализовать `scheduleRhodesComp(events)` через `Tone.Transport.schedule`
- [x] Правила взаимодействия с басом: минимальный интервал, запрет root ниже C4

### Фаза 4 — Настройки и API

- [x] Добавить поля `rhodesEnabled`, `rhodesMode`, `rhodesVoicingDensity`, `rhodesVolume` в DB schema
- [x] Обновить Zod-схему `UserSettingsDTOSchema`
- [x] Обновить `toSettingsDTO` и PATCH `/api/settings`

### Фаза 5 — Frontend

- [x] Добавить поля Rhodes в `useLocalSettingsStore`
- [x] Добавить `useEffect` хук для синхронизации с audio engine
- [x] Добавить секцию Rhodes в `SettingsForm` (enabled, mode, voicingDensity)

### Фаза 6 — Тесты

- [x] Unit тесты для voicing engine (все типы аккордов, все плотности)
- [x] Unit тесты для voice leading (ii–V–I, проверка минимального движения)
- [x] Unit тесты для ритмических паттернов
- [x] TypeScript compilation check (`tsc --noEmit`)

---

## 1. Роль Rhodes

> **Рефакторинг 2026:** Rhodes теперь работает как **комплементарный слой** поверх Piano.
> Основная гармоническая партия перешла к `PianoInstrument` (см. `docs/PIANO.md`).

Rhodes в роли комплементарного слоя:

- **Текстурная поддержка:** добавляет окраску и плотность, не перебивая Piano
- **Верхний регистр:** играет в C4–C6, оставляя низ (C3–C4) для Piano
- **Разреженный ритм:** целые ноты, offbeat-акценты, ambient-свеллы
- **Не дублирует Piano:** избегает тех же ритмических слотов и регистров

**Комплементарные режимы (маппинг на существующие CompingMode):**

| Концепт           | Режим `RhodesCompingMode` | Описание                                             |
| ----------------- | ------------------------- | ---------------------------------------------------- |
| `none`            | (без регистрации sink)    | Rhodes отключён — 0 событий                          |
| `pads`            | `wholeNotes`              | Целые ноты — медленные гармонические подклады        |
| `subtle-offbeats` | `offbeat-2-4`             | Только 2& и 4& — лёгкие offbeat-акценты              |
| `high-comping`    | `one-twoand-four`         | Активный компинг в верхнем регистре (3 события/такт) |
| `ambient-swells`  | `halfNotes`               | Половинные ноты — 2 события/такт, ambient-текстура   |
| `stab-accents`    | `basie-2-4`               | Короткие акценты на 2 и 4 (как Basie-style)          |

**Старые режимы (перенесены в Piano):**

- `quarterNotes` — активный четвертной компинг (теперь в Piano-профилях)
- Полный набор swing-паттернов (charleston, reverse-charleston и др.) — теперь в Piano-профилях

## 2. Главный принцип: Rhodes не играет root внизу

Если рядом есть контрабас, Rhodes почти всегда должен использовать rootless voicings.

| Аккорд | Rootless voicing | Полный voicing |
| ------ | ---------------- | -------------- |
| Dm7    | F C E            | D F A C        |
| G7     | F B E            | G B D F        |
| Cmaj7  | E B D            | C E G B        |

Бас уже играет D, G, C. Если Rhodes тоже будет постоянно играть roots, низ станет грязным и учебно-примитивным.

## 3. Рабочий регистр

Сэмплы от F1 до C7, но для jazz comping рядом с басом:

```ts
const rhodesCompingRange = {
  min: 'C3',
  max: 'C6',
  preferredMin: 'F3',
  preferredMax: 'A5',
};
```

| Зона          | Диапазон |
| ------------- | -------- |
| Левая граница | C3 / D3  |
| Основная зона | F3 – C5  |
| Верхняя зона  | C5 – A5  |

Не пускай Rhodes ниже C3, если играет контрабас. Особенно избегай плотных аккордов ниже F3.

**Плохой вариант:**

```
Rhodes: D2 F2 A2 C3
Bass:   D1 / D2
```

**Хороший вариант:**

```
Bass:   D2
Rhodes: F3 C4 E4
```

## 4. Типы voicings для MVP

### 4.1. Shell voicings

Самый простой и чистый вариант — 3rd + 7th:

| Аккорд | Shell |
| ------ | ----- |
| Dm7    | F C   |
| G7     | B F   |
| Cmaj7  | E B   |

```ts
type ShellVoicing = {
  chord: string;
  notes: string[]; // 3rd and 7th
};
```

### 4.2. Three-note rootless voicings

Лучший default для MVP — 3rd + 7th + color tone:

| Аккорд | Rootless 3 | Интервалы |
| ------ | ---------- | --------- |
| Dm7    | F C E      | 3, 7, 9   |
| G7     | B F A      | 3, 7, 9   |
| Cmaj7  | E B D      | 3, 7, 9   |

### 4.3. Four-note rootless voicings

Для более плотного звучания — 3rd + 7th + 9th + 13th:

| Аккорд | Rootless 4 | Интервалы   |
| ------ | ---------- | ----------- |
| Dm9    | F C E A    | 3, 7, 9, 13 |
| G13    | F B E A    | 3, 7, 9, 13 |
| Cmaj9  | E B D G    | 3, 7, 9, 5  |

```ts
type RhodesVoicingDensity = 'shell2' | 'rootless3' | 'rootless4';
// Default: "rootless3"
```

## 5. Voicings для основных аккордов

### Maj7

```
Cmaj7:
  shell2:    E B
  rootless3: E B D     // 3, 7, 9
  rootless4: E B D G   // 3, 7, 9, 5
```

### m7

```
Dm7:
  shell2:    F C
  rootless3: F C E     // b3, b7, 9
  rootless4: F C E A   // b3, b7, 9, 5
```

### Dominant 7

```
G7:
  shell2:    B F
  rootless3: B F A     // 3, b7, 9
  rootless4: B F A E   // 3, b7, 9, 13
```

Более джазовые варианты (для расширения):

```
G7b9:   B F Ab
G7#9:   B F A#
G13b9:  B F Ab E
```

### m7b5

```
Bm7b5:
  shell2:    D A
  rootless3: D A C     // b3, b7, b9 или 11
  rootless4: D A C F   // b3, b7, 11, b5
```

### Diminished 7

```
Bdim7:
  rootless3: D F Ab
  rootless4: D F Ab B  // симметричное voicing
```

## 6. Voice leading между аккордами

Для ii–V–I движение голосов должно быть минимальным:

```
Dm7:   F C E
G7:    F B E   ← C→B (полтона), F и E остаются
Cmaj7: E B D   ← F→E (полтона), B остаётся
```

```ts
type VoiceLeadingSettings = {
  maxTopVoiceLeapSemitones: number;
  maxInnerVoiceLeapSemitones: number;
  preferCommonTones: boolean;
  avoidLowClusters: boolean;
};

const defaultVoiceLeading: VoiceLeadingSettings = {
  maxTopVoiceLeapSemitones: 5,
  maxInnerVoiceLeapSemitones: 4,
  preferCommonTones: true,
  avoidLowClusters: true,
};
```

**Алгоритм:**

1. Для каждого аккорда сгенерировать несколько возможных voicings
2. Отфильтровать по регистру
3. Сравнить с предыдущим voicing
4. Выбрать тот, где сумма движений голосов минимальна
5. Сохранить common tones, если возможно

```ts
type VoicingCandidate = {
  chordSymbol: string;
  notes: string[];
  roles: string[];
  minMidi: number;
  maxMidi: number;
  score?: number;
};
```

## 7. Ритмические режимы

### 7.1. Whole notes

```
| Dm7       | G7        | Cmaj7     |
| Rhodes: X | X         | X         |
| Bass:   walking quarters...
```

```ts
const wholeNotes = [{ beat: 1, durationBeats: 4 }];
// Tone.js: duration: "1m"
// Рекомендуется: durationBeats: 3.5 (зазор перед следующим тактом)
```

Использование: начальное обучение, медленные темпы, ear training, режим «слышать гармонию».

### 7.2. Half notes

```
| Dm7    |
| X   X  |
| 1   3  |
```

```ts
const halfNotes = [
  { beat: 1, durationBeats: 2 },
  { beat: 3, durationBeats: 2 },
];
```

Для MVP — один voicing на аккорд.

### 7.3. Quarter notes

Rhodes четвертями легко начинает мешать walking bass. Использовать мягкие короткие stabs.

```
| Dm7              |
| X   x   X   x   |
| 1   2   3   4   |
```

```ts
const quarterNotes = [
  { beat: 1, durationBeats: 0.75, velocity: 0.56 },
  { beat: 2, durationBeats: 0.65, velocity: 0.44 },
  { beat: 3, durationBeats: 0.75, velocity: 0.52 },
  { beat: 4, durationBeats: 0.65, velocity: 0.46 },
];
```

Default — половинки, не четверти.

## 8. Swing feel

Для целых и половинок swing выражается через:

- placement
- duration
- velocity
- interaction with bass and drums
- occasional anticipations

```ts
const rhodesHumanize = {
  timingMs: 6,
  velocityRandom: 0.05,
  durationRandomBeats: 0.05,
};
```

Бас и метроном должны быть стабильными — Rhodes не должен быть слишком неточным.

## 9. Акценты

**Half-note comping:**

```ts
const halfNoteVelocities = {
  beat1: 0.58, // medium
  beat3: 0.5, // slightly softer
  random: 0.04,
};
```

**Quarter-note comping:**

```ts
const quarterNoteVelocities = {
  beat1: 0.56, // сильнее
  beat2: 0.42, // мягче
  beat3: 0.52, // средне
  beat4: 0.45, // мягче / подготовка
  random: 0.04,
};
```

**Whole notes:** velocity 0.50–0.60

Rhodes не должен быть громче баса и учебной мелодии.

## 10. Длительность нот

Rhodes сэмплы looped — важно контролировать длительность:

```ts
const wholeComp = [{ beat: 1, durationBeats: 3.6, velocity: 0.55 }];

const halfComp = [
  { beat: 1, durationBeats: 1.65, velocity: 0.56 },
  { beat: 3, durationBeats: 1.45, velocity: 0.5 },
];

const quarterComp = [
  { beat: 1, durationBeats: 0.65, velocity: 0.54 },
  { beat: 2, durationBeats: 0.55, velocity: 0.42 },
  { beat: 3, durationBeats: 0.65, velocity: 0.5 },
  { beat: 4, durationBeats: 0.5, velocity: 0.44 },
];

type CompEvent = {
  beat: number;
  durationBeats: number;
  velocity: number;
};
```

## 11. Настройки звука

```ts
const rhodesChannel = new Tone.Channel({
  volume: -11,
  pan: 0.05,
});

const rhodesEQ = new Tone.EQ3({
  low: -2,
  mid: 0,
  high: 1,
});

const rhodesChorus = new Tone.Chorus({
  frequency: 1.4,
  delayTime: 2.5,
  depth: 0.25,
  wet: 0.25,
}).start();

const rhodesTremolo = new Tone.Tremolo({
  frequency: 5.5,
  depth: 0.18,
  wet: 0.25,
}).start();

const rhodesReverb = new Tone.Reverb({
  decay: 1.8,
  wet: 0.12,
});

rhodesSampler.chain(
  rhodesEQ,
  rhodesTremolo,
  rhodesChorus,
  rhodesReverb,
  rhodesChannel,
  Tone.Destination,
);
```

Если в миксе уже много всего — reverb держи низко.

## 12. Работа с сэмплами jRhodes3c

Паттерн имён файлов:

```
As_055__G3_371-mono.flac
As_059__B3_513-mono.flac
As_062__D4_293-mono.flac
```

| Часть    | Значение                        |
| -------- | ------------------------------- |
| `As_055` | MIDI note number / sample index |
| `G3`     | Root note                       |
| `371`    | Velocity layer / sample variant |
| `mono`   | Mono sample                     |

Для точного mapping читай `.sfz` — там будут `key`, `lokey/hikey`, `lovel/hivel`, `sample`, `loop_start/loop_end`, `ampeg_release`.

Рекомендуемый pipeline:

```
SFZ → manifest.json → OGG files → Tone.js sample maps
```

## 13. Манифест для Rhodes

```ts
type RhodesSample = {
  note: string;
  midi: number;
  velocityLayer: 'soft' | 'medium' | 'hard' | 'bark';
  velocityMin: number;
  velocityMax: number;
  url: string;
  originalFile: string;
};

type RhodesManifest = {
  id: 'jrhodes3c-standard-v1';
  instrument: 'rhodes';
  format: 'ogg';
  sampleRate: 44100;
  range: { min: 'F1'; max: 'C7' };
  samples: RhodesSample[];
};
```

Несколько Sampler по velocity layers:

```ts
const rhodesLayers = {
  soft: new Tone.Sampler({ urls: softUrls, baseUrl }),
  medium: new Tone.Sampler({ urls: mediumUrls, baseUrl }),
  hard: new Tone.Sampler({ urls: hardUrls, baseUrl }),
  bark: new Tone.Sampler({ urls: barkUrls, baseUrl }),
};

function pickRhodesLayer(velocity: number) {
  if (velocity < 0.35) return rhodesLayers.soft;
  if (velocity < 0.65) return rhodesLayers.medium;
  if (velocity < 0.88) return rhodesLayers.hard;
  return rhodesLayers.bark;
}
```

Для comping рядом с басом чаще используются `soft` и `medium`. `bark` — только для акцентов.

## 14. API генератора Rhodes comping

```ts
type RhodesCompingSettings = {
  enabled: boolean;
  mode: 'wholeNotes' | 'halfNotes' | 'quarterNotes';
  voicingDensity: 'shell2' | 'rootless3' | 'rootless4';
  register: {
    min: string;
    max: string;
    preferredMin: string;
    preferredMax: string;
  };
  rhythmicVariation: number; // 0..1
  velocity: number; // base 0..1
  humanizeMs: number;
  avoidRoots: boolean;
  avoidLowRegister: boolean;
  preferVoiceLeading: boolean;
};

const defaultRhodesComping: RhodesCompingSettings = {
  enabled: true,
  mode: 'halfNotes',
  voicingDensity: 'rootless3',
  register: {
    min: 'C3',
    max: 'C6',
    preferredMin: 'F3',
    preferredMax: 'A5',
  },
  rhythmicVariation: 0.15,
  velocity: 0.52,
  humanizeMs: 6,
  avoidRoots: true,
  avoidLowRegister: true,
  preferVoiceLeading: true,
};
```

## 15. Типы событий

```ts
type RhodesCompEvent = {
  time: string; // Tone.js transport time, e.g. "2:0:0"
  chordSymbol: string;
  notes: string[];
  duration: string;
  durationBeats: number;
  velocity: number;
  role: 'comp';
  voicingType: 'shell2' | 'rootless3' | 'rootless4';
};
```

Пример:

```json
{
  "time": "0:0:0",
  "chordSymbol": "Dm7",
  "notes": ["F3", "C4", "E4"],
  "durationBeats": 1.65,
  "duration": "2n",
  "velocity": 0.54,
  "role": "comp",
  "voicingType": "rootless3"
}
```

## 16. Пример для ii–V–I

Гармония: `| Dm7 | G7 | Cmaj7 | Cmaj7 |`

**Whole notes:**

| Такт  | Voicing  |
| ----- | -------- |
| Dm7   | F3 C4 E4 |
| G7    | F3 B3 E4 |
| Cmaj7 | E3 B3 D4 |
| Cmaj7 | E3 A3 D4 |

**Half notes:**

| Аккорд | beat 1 | beat 3 |
| ------ | ------ | ------ |
| Dm7    | F C E  | A C F  |
| G7     | F B E  | A B F  |
| Cmaj7  | E B D  | G B E  |

**Quarter notes** (короткие stabs, один voicing с разными velocity):

```
| Dm7                         |
| F C E | F A C | C E A | F C E |
| 1       2       3       4   |
```

## 17. Правила взаимодействия с контрабасом

```ts
const rhodesBassInteractionRules = {
  minDistanceFromBassTopSemitones: 10,
  avoidRhodesNotesBelow: 'C3',
  avoidDoublingBassRootBelow: 'C4',
  reduceVelocityWhenBassIsActive: true,
};
```

- Если бас играет D2 — Rhodes не должен играть D2/D3 как нижнюю ноту
- Если Rhodes играет root — пусть он будет выше и не всегда
- Нижний голос Rhodes держать минимум около F3

Для rootless voicings это решается автоматически.

## 18. Генерация ритма

```ts
function getRhodesCompPattern(mode: RhodesCompingMode): CompEvent[] {
  switch (mode) {
    case 'wholeNotes':
      return [{ beat: 1, durationBeats: 3.6, velocity: 0.54 }];

    case 'halfNotes':
      return [
        { beat: 1, durationBeats: 1.65, velocity: 0.55 },
        { beat: 3, durationBeats: 1.45, velocity: 0.49 },
      ];

    case 'quarterNotes':
      return [
        { beat: 1, durationBeats: 0.65, velocity: 0.53 },
        { beat: 2, durationBeats: 0.5, velocity: 0.42 },
        { beat: 3, durationBeats: 0.65, velocity: 0.5 },
        { beat: 4, durationBeats: 0.5, velocity: 0.44 },
      ];
  }
}
```

## 19. Swing subdivision

Для целых/половинок/четвертей `Tone.Transport.swing` почти не нужен. Если добавится offbeat comping (например, & of 2):

```ts
Tone.Transport.swing = 0.55;
Tone.Transport.swingSubdivision = '8n';
```

Для quarter-note comping — расписание по quarter grid + humanize вручную.

## 20. Scheduling в Tone.js

```ts
function scheduleRhodesComp(events: RhodesCompEvent[]) {
  const scheduledIds: number[] = [];

  for (const event of events) {
    const id = Tone.Transport.schedule((time) => {
      playRhodesChord(event.notes, time + humanizeSeconds(6), event.duration, event.velocity);
    }, event.time);

    scheduledIds.push(id);
  }

  return scheduledIds;
}

function playRhodesChord(notes: string[], time: number, duration: string, velocity: number) {
  const layer = pickRhodesLayer(velocity);
  for (const note of notes) {
    layer.triggerAttackRelease(note, duration, time, velocity);
  }
}
```

Выбирать один velocity layer на весь аккорд — позже можно выбирать по каждой ноте.

## 21. MVP-спецификация

| Параметр       | Значение                                                         |
| -------------- | ---------------------------------------------------------------- |
| Источник       | jRhodes3c                                                        |
| Формат         | FLAC source → OGG q5/q6 web                                      |
| Диапазон       | C3–C6 для comping                                                |
| Voicing        | rootless 3-note voicings                                         |
| Ритм           | whole notes / half notes / quarter notes                         |
| Default ритм   | half notes                                                       |
| Velocity       | 0.45–0.58                                                        |
| Humanize       | ±6 ms                                                            |
| Эффекты        | light tremolo, light chorus, small reverb                        |
| Бас-интеракция | no low roots, no dense chords below C3, prefer rootless voicings |
