# Генератор walking bass

> Знает гармонию, метр, регистр, голосоведение и ограничения контрабаса.

## Что должен делать бас в классическом swing

Главная функция баса — не «играть красивую мелодию», а:

- держать пульс;
- ясно обозначать гармонию;
- вести голос к следующему аккорду;
- создавать ощущение движения.

**Базовая формула:**

- На сильных долях — опорные звуки аккорда.
- На слабых долях — проходящие, диатонические или хроматические звуки.
- К концу такта — подводка к следующему аккорду.

---

## Музыкальные правила

### Диапазон

Для классического walking bass лучше держаться в диапазоне **E1 – C3**:

| Граница       | Ноты          |
| ------------- | ------------- |
| Низ           | E1 / F1       |
| Верх          | C3 / D3       |
| Комфортная зона | A1 – G2     |

> Не уходи слишком низко: на маленьких колонках низкие ноты превращаются в гул.

```ts
const bassRange = {
  min: "E1",
  max: "C3",
  preferredMin: "A1",
  preferredMax: "G2",
};
```

### Доля 1 — почти всегда root

На первой доле такта бас должен чаще всего играть тонику текущего аккорда:

```
Dm7     G7      Cmaj7
D       G       C
```

```ts
beat1 = {
  root: 0.8,
  fifth: 0.1,
  third: 0.1,
};
```

Для начального режима можно сделать `root = 1.0`.

### Доля 3 — терция или квинта

На третьей доле обычно хорошо работают: root, 5th, 3rd, 7th.

Для `Dm7`: `D F A C`

Простой учебный walking bass:

```
Dm7:   D F A C
G7:    G B D F
Cmaj7: C E G B
```

Более живое звучание (хроматические подводки):

```
Dm7:   D F A Ab   ← Ab ведёт вниз в G
G7:    G B D Db   ← Db ведёт вниз в C
Cmaj7: C E G A
```

### Доля 4 — подход к следующему аккорду

Beat 4 должен вести к root следующего аккорда:

```
Dm7 | G7
...  Ab | G     ← хроматический сверху
...  F# | G     ← хроматический снизу
```

Варианты подхода:

| Тип                 | Пример        |
| ------------------- | ------------- |
| Хроматический сверху | Ab → G       |
| Хроматический снизу  | F# → G       |
| Диатонический сверху | A → G        |
| Диатонический снизу  | F → G        |
| Квинтовый            | D → G        |

> **Правило:** `beat 4 should target nextChord.root on the next downbeat`

### Типы нот

```ts
type BassNoteRole =
  | "root"
  | "third"
  | "fifth"
  | "seventh"
  | "diatonicPassing"
  | "chromaticApproach"
  | "enclosure"
  | "octave"
  | "neighbor"
  | "ghost"       // ghost note между долями → артикуляция "ghost"
  | "slide"       // слайд к ноте → артикуляция "noise" перед основной нотой
  | "percussive"; // muted удар без питча → артикуляция "mute"
```

Это пригодится не только для генерации, но и для обучения — можно подсвечивать пользователю роль каждой ноты.

---

## Базовые паттерны walking bass

### Уровень 1: root на каждую смену аккорда

Полезно для проверки синхронизации, сэмплов и гармонии:

```
Dm7 | G7 | Cmaj7 | Cmaj7
D   | G  | C     | C
```

### Уровень 2: root + fifth

```
Dm7:   D A D A
G7:    G D G D
Cmaj7: C G C G
```

### Уровень 3: chord tones

```
Dm7:   D F A C
G7:    G B D F
Cmaj7: C E G B
```

### Уровень 4: chord tones + approach notes

```
Dm7:   D F A Ab
G7:    G B D Db
Cmaj7: C E G A
```

### Уровень 5: voice leading между аккордами

Последняя нота текущего такта должна вести в первую ноту следующего:

```
| Dm7        | G7         | Cmaj7      |
| D  F  A Ab | G  B  D Db | C  E  G  A |
```

---

## Правила генерации по долям

### Beat 1

```ts
beat1 = {
  root: 0.8,
  fifth: 0.1,
  third: 0.1,
};
```

### Beat 2

Терция, квинта, проходящая нота:

```ts
beat2 = {
  third: 0.35,
  fifth: 0.25,
  diatonicPassing: 0.25,
  chromaticPassing: 0.15,
};
```

### Beat 3

```ts
beat3 = {
  fifth: 0.4,
  root: 0.25,
  seventh: 0.25,
  third: 0.1,
};
```

### Beat 4

```ts
beat4 = {
  chromaticApproachFromBelow: 0.35,
  chromaticApproachFromAbove: 0.35,
  diatonicApproach: 0.2,
  chordTone: 0.1,
};
```

> Если следующий аккорд неизвестен — играй chord tone или octave.

---

## Особое правило для ii–V–I

Типичные варианты для ii–V–I в C major:

```
| Dm7        | G7         | Cmaj7      |
| D  F  A Ab | G  B  D Db | C  E  G  A |

| Dm7        | G7         | Cmaj7      |
| D  A  F F# | G  D  B Db | C  G  E  G |
```

```ts
if (progression === "ii-V-I") {
  return iiVIWalkingBassTemplate();
}
```

---

## Аккорды разной длительности

**Один аккорд на такт:**

```
Dm7: D F A Ab
```

**Два аккорда на такт:**

```
Dm7   G7
D  F  G  B

// или:
Dm7   G7
D  A  G  Ab
```

```ts
if (chordsPerBar === 2) {
  beat1 = chord1.root;
  beat2 = chord1.chordTone;
  beat3 = chord2.root;
  beat4 = approachToNextBar;
}
```

---

## Swing feel

Walking bass идёт ровными четвертями. Swing feel создаётся не нотами баса, а:

- барабанами и ride pattern;
- ghost notes;
- длительностью нот;
- микротаймингом и акцентами.

Для баса — добавляй лёгкую человечность:

| Доля    | Тайминг           |
| ------- | ----------------- |
| Beat 1  | почти точно       |
| Beat 2  | чуть relaxed      |
| Beat 3  | почти точно       |
| Beat 4  | чуть leading / relaxed |

```ts
const humanizeSeconds = (ms = 10) => (Math.random() * 2 - 1) * ms / 1000;
// humanizeMs: 5–18 ms
```

> Не делай ±50 ms — будет звучать неряшливо.

---

## Длительность нот

Контрабас в walking bass не должен звучать как орган с бесконечным sustain.

```ts
const bassArticulation = {
  defaultDuration: "8n",
  legatoProbability: 0.15,
  staccatoProbability: 0.2,
};
```

Стартовое распределение:
- 85% нот: medium
- 10% нот: slightly short
- 5% нот: slightly long

---

## Velocity и акценты

```ts
const beatVelocity = {
  1: 0.82,
  2: 0.68,
  3: 0.76,
  4: 0.7,
};

velocity += random(-0.05, 0.05);
```

> Не делай velocity слишком разным — walking bass потеряет ровность.

---

## Ghost notes

В библиотеке есть отдельная папка `ghost/` с реальными записями ghost notes.

```ts
ghostNotes: {
  enabled: true,
  probabilityBeforeBeat: 0.15,
  probabilityAfterBeat: 0.1,
  // velocity игнорируется — для ghost используется отдельный Sampler с артикуляцией "ghost"
}
```

> Ghost notes — это **отдельная артикуляция**, а не тихий finger. Диапазон `ghost/` начинается с A2; ниже Sampler транспонирует вниз с A2, что приемлемо для редко используемых нот.

---

## Сэмплы контрабаса (SneakyBass)

Библиотека находится в `public/samples/bass/`. Хроматическое покрытие — все 12 полутонов, пять артикуляций, настоящий round robin.

### Структура имён файлов

```
sneakybass_{note}{octave}_{articulation}_rr{n}.ogg
```

| Поле | Значения |
|---|---|
| `{note}` | `c` · `db` · `d` · `eb` · `e` · `f` · `gb` · `g` · `ab` · `a` · `bb` · `b` |
| `{octave}` | 2–5 (зависит от артикуляции) |
| `{articulation}` | `finger` · `ghost` · `mute` · `noise` · `pluck` |
| `{n}` | 1–4 (у `noise` — только 1–2) |

> Только бемоли: `ab`, `bb`, `db`, `eb`, `gb`. Диезов в именах нет.

### Пять артикуляций

| Папка | RR | Описание |
|---|---|---|
| `finger/` | 4 | Pizzicato пальцем — основная walking bass артикуляция |
| `pluck/` | 4 | Щипок с большей атакой — для акцентов, beat 1 |
| `ghost/` | 4 | Ghost note — приглушённая нота с различимой высотой |
| `mute/` | 4 | Полностью заглушённый удар без питча |
| `noise/` | 2 | Шум струн: слайды, переходы, призвуки |

### Диапазон по артикуляции

| Артикуляция | Самая низкая нота | Самая высокая нота |
|---|---|---|
| `finger` | C2 | C5 |
| `pluck` | C2 | C5 |
| `mute` | Db2 | ~G4 |
| `ghost` | A2 | ~G4 |
| `noise` | A2 | C5 |

> **Практический диапазон walking bass:** C2–G3. Полностью покрыт `finger` без транспозиции.

> Для `ghost` и `noise` ноты ниже A2 Sampler транспонирует вниз с A2 — приемлемо для редких случаев.

### Маппинг артикуляций к музыкальному контексту

| Ситуация | Артикуляция |
|---|---|
| Walking bass, все доли | `finger` |
| Beat 1, акцент, высокая velocity | `pluck` |
| Ghost note (между долями, тихо) | `ghost` |
| Percussive muted note | `mute` |
| Slide между далёкими нотами | `noise` (перед основной нотой, offset –30 ms) |

---

## Настройки Tone.js

### Round Robin (реальный, не синтетический)

В библиотеке каждая нота имеет 4 реальных записи (2 для `noise`) — настоящий round robin. Менять `playbackRate` или `detune` для разнообразия **не нужно**.

```ts
type BassArticulation = "finger" | "pluck" | "ghost" | "mute" | "noise";

class RoundRobinCounter {
  private counters = new Map<string, number>();

  next(note: string, articulation: BassArticulation): string {
    const key = `${note}_${articulation}`;
    const rrCount = articulation === "noise" ? 2 : 4;
    const i = (this.counters.get(key) ?? 0) % rrCount;
    this.counters.set(key, i + 1);
    // "C2" → "c2", "Db2" → "db2"
    const filename = note.toLowerCase().replace(/([a-g])#/, "$1b");
    return `/samples/bass/${articulation}/sneakybass_${filename}_${articulation}_rr${i + 1}.ogg`;
  }
}
```

### Sampler — один на артикуляцию

Поскольку каждый полутон записан отдельно, достаточно опорных нот через каждые 3–4 полутона — Tone.js транспонирует не более чем на ±2 полутона.

```ts
// Опорные ноты для finger/pluck (C2–C5)
const FINGER_ANCHORS = ["C2", "Eb2", "Gb2", "A2", "C3", "Eb3", "Gb3", "A3", "C4"];

function buildSamplerUrls(anchors: string[], articulation: BassArticulation) {
  return Object.fromEntries(
    anchors.map((note) => {
      const filename = note.toLowerCase().replace(/([a-g])#/, "$1b");
      return [note, `/samples/bass/${articulation}/sneakybass_${filename}_${articulation}_rr1.ogg`];
    })
  );
}

const fingerSampler = new Tone.Sampler({
  urls: buildSamplerUrls(FINGER_ANCHORS, "finger"),
  release: 0.2,
}).toDestination();

// Ghost/noise используют сужённый диапазон — начинать с A2
const GHOST_ANCHORS = ["A2", "C3", "Eb3", "Gb3", "A3", "C4"];

const ghostSampler = new Tone.Sampler({
  urls: buildSamplerUrls(GHOST_ANCHORS, "ghost"),
  release: 0.15,
}).toDestination();
```

### Цепочка эффектов

```ts
const bassChannel = new Tone.Channel({ volume: -8, pan: 0 }).toDestination();

const eq = new Tone.EQ3({ low: 1, mid: 0, high: -2 });

const compressor = new Tone.Compressor({
  threshold: -24,
  ratio: 3,
  attack: 0.01,
  release: 0.15,
});

bass.chain(eq, compressor, bassChannel);
```

### Envelope

```
release: 0.1–0.35
```

> Слишком длинный release даст кашу.

### EQ-пресет для веба

```ts
bassMixPreset = {
  highpass: 35,           // убрать ниже 40 Hz
  lowShelf: "+1 dB @ 100 Hz",   // тело
  lowMidCut: "-2 dB @ 250 Hz",  // убрать мутность
  presence: "+1 dB @ 900 Hz",   // читаемость атаки
};
```

### Swing в Tone.js

```ts
Tone.Transport.swing = 0.55;
Tone.Transport.swingSubdivision = "8n";
Tone.Transport.PPQ = 192;
```

> Для walking bass четвертями swing почти не влияет. Важнее для ride, hi-hat, comping.

---

## Архитектура генератора баса

### 1. Harmony parser

```ts
type ChordEvent = {
  symbol: string;
  root: string;
  quality: "maj7" | "m7" | "7" | "m7b5" | "dim7" | "m6" | "6";
  extensions: string[];
  alterations: string[];
  startBeat: number;
  durationBeats: number;
};
```

### 2. Chord spelling engine

```ts
type ChordTones = {
  root: Note;
  third: Note;
  fifth: Note;
  seventh?: Note;
  tensions?: Note[];
  scale?: Note[];
};
```

Примеры:

```
Dm7   → D F A C
G7    → G B D F
Cmaj7 → C E G B
```

### 3. Bass planner

Сначала планируем функции долей, не конкретные ноты:

```ts
// Dm7 bar:
[
  { beat: 1, role: "root" },
  { beat: 2, role: "third" },
  { beat: 3, role: "fifth" },
  { beat: 4, role: "approachToNextRoot" },
]
```

### 4. Note resolver

Роли → конкретные ноты с учётом регистра:

```
root D           → D2
third F          → F2
fifth A          → A2
approach to G    → Ab2 or F#2
```

### 5. Voice leading optimizer

```ts
maxLeapSemitones = 7;      // perfect fifth
preferStepwiseMotion = true;
avoidSameNoteMoreThan = 2;
```

Проверяет:
- нет слишком больших скачков;
- ноты в диапазоне;
- beat 4 ведёт к следующему beat 1;
- нет повторяющихся шаблонов.

---

## Пользовательские настройки

### Bass complexity

| Режим | Описание |
| ----- | -------- |
| 1 | Roots only |
| 2 | Root on every beat (octave alternation) |
| 3 | Root + fifth |
| 4 | Chord tones |
| 5 | Walking bass with approach notes |

### Управление громкостью

- bass volume
- metronome volume
- chords volume
- melody volume

### Bass on/off

- только метроном
- бас
- бас + аккорды
- без баса

### Feel

`Straight / Light Swing / Medium Swing`

---

## Обучающий слой

Хранить не только ноту, но и полное объяснение:

```ts
{
  note: "Ab2",
  beat: 4,
  chord: "Dm7",
  role: "chromaticApproach",
  target: "G2",
  targetChord: "G7",
  explanation: "Chromatic approach from above to the root of G7"
}
```

Это позволит в будущем:
- показывать роль каждой ноты;
- делать режим анализа walking bass;
- генерировать упражнения на распознавание движения;
- визуализировать голосоведение.

---

## План работ

| Этап | Задача |
| ---- | ------ |
| 1 | Стабильный аудио-движок (Transport, BPM, metronome, sampler, start/stop) |
| 2 | Самый простой бас: root на первую долю |
| 3 | Root на каждую четверть |
| 4 | Root + fifth |
| 5 | Chord tones + chord spelling engine |
| 6 | Approach notes на beat 4 |
| 7 | Voice leading optimizer |
| 8 | Humanization (velocity, duration, timing, ghost notes) |
| 9 | Педагогические режимы сложности |

> Сначала грамматика — потом человечность. Плохую басовую линию humanize не спасёт.
