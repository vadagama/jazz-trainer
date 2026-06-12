# ENGINE.md — Аудиодвижок Jazz Trainer

## Цель документа

Описать архитектуру аудиодвижка: как устроены бас, Rhodes-пианино и барабаны, какие режимы
доступны, и как система спроектирована для лёгкого добавления новых инструментов.

---

## 1. Общая архитектура: три слоя абстракции

Аудиодвижок построен на трёх уровнях, каждый из которых ничего не знает о верхнем:

```
┌──────────────────────────────────────────────────────────────┐
│  useTransport.ts  (apps/web)                                  │
│  — создаёт Tone.js-ноды, связывает sinks с реальным звуком    │
│  — реактивные эффекты: громкость, режимы, включение/выключение│
└───────────────┬──────────────────────────────────────────────┘
                │ вызывает
┌───────────────┴──────────────────────────────────────────────┐
│  TransportEngine  (packages/music-core/audio)                 │
│  — владелец времени: bpm, timeSignature, позиция              │
│  — look-ahead scheduling: раздаёт окна всем инструментам      │
│  — не зависит от Tone.js, тестируется в Node                  │
└───────────────┬──────────────────────────────────────────────┘
                │ итерирует
┌───────────────┴──────────────────────────────────────────────┐
│  Instrument[]  (packages/music-core/audio)                    │
│  — MetronomeInstrument, BassInstrument, RhodesInstrument,     │
│    DrumInstrument                                             │
│  — чистые планировщики: получают окно + контекст,             │
│    вызывают schedule*() колбэки                               │
│  — тестируются без Tone.js (unit-тесты на Vitest)            │
└──────────────────────────────────────────────────────────────┘
```

**Ключевой принцип**: инструменты не издают звук — они планируют события. Звук рендерится
на верхнем уровне (`useTransport.ts`) через колбэки-«sinks». Это позволяет тестировать
всю музыкальную логику в Node без браузера и без Tone.js.

---

## 2. Интерфейс Instrument — контракт для любого инструмента

```ts
// packages/music-core/src/audio/instrument.ts

interface ScheduleWindow {
  fromTicks: number;  // начало окна (включительно)
  toTicks: number;    // конец окна (исключительно)
}

interface ScheduleContext {
  bpm: number;
  timeSignature: TimeSignature;

  scheduleClick(atTicks: number, beatType: 'strong' | 'strong2' | 'weak'): void;
  scheduleNote?(atTicks, note, velocity, durationTicks, articulation): void;
  scheduleChord?(atTicks, notes[], velocity, durationTicks): void;
  scheduleDrum?(atTicks, sound, velocity, durationTicks): void;
}

interface Instrument {
  schedule(window: ScheduleWindow, ctx: ScheduleContext): void;
  dispose?(): void;
}
```

`TransportEngine.scheduleWindow()` итерирует все зарегистрированные инструменты и
передаёт каждому окно + контекст с доступными sinks. Если конкретный sink не подключён
(например, `scheduleDrum` не передан в опциях), поле будет `undefined` — инструмент
должен проверить наличие и молча пропустить свою работу.

**Как это работает в рантайме** (25ms look-ahead loop в `useTransport.ts`):

1. `setInterval(25ms)` считывает `Tone.Transport.ticks`
2. Вычисляет окно: `[lastScheduled, currentTicks + LOOKAHEAD_TICKS)`
3. Вызывает `engine.scheduleWindow({ fromTicks, toTicks })`
4. Engine передаёт окно всем инструментам
5. Инструменты вызывают `ctx.scheduleClick/scheduleNote/...`
6. Sinks (замыкания над Tone.js-нодами) планируют реальный звук через `tone.scheduleOnce(time, callback)`

---

## 3. Три инструмента: устройство и режимы

### 3.1 Бас (BassInstrument)

**Файл**: `packages/music-core/src/audio/bassInstrument.ts`

**Входные данные**: `ChordTimeline` — последовательность аккордов по тактам.

**Генерация нот**: на основе символа аккорда (`Dm7`, `G7`, `Cmaj7`) вычисляются
ступени (root, 3rd, 5th, 7th) с учётом quality (major/minor/dominant/diminished) и
альтераций (b5).

**7 уровней сложности** (`complexity: 1–7`):

| # | Название | Что играет | Слотов на такт |
|---|----------|-----------|----------------|
| 1 | Root only | Только тоника на 1-ю долю, целая нота | 1 |
| 2 | Root all beats | Тоника на каждую долю, чередование октав 2/3 | 4 |
| 3 | Root + fifth | Тоника на сильные доли, квинта на слабые | 4 |
| 4 | Chord tones | Root → 3rd → 5th → 7th по долям | 4 |
| 5 | Walking bass | Root-3rd-5th + хроматический approach на последнюю долю | 4 |
| 6 | All chord tones | То же что #4, но все pluck | 4 |
| 7 | Two-feel | Root на 1-ю, 5th на 3-ю долю (half-note feel) | 2 |

**Артикуляции**: `pluck` (щипок) и `mute` (глушение). Каждая имеет 4 round-robin варианта.
RR-счётчик (`RoundRobinCounter`) независимо циклит варианты для каждой ноты.

**Octave shift**: флаг `bassOctaveUp` сдвигает весь диапазон на октаву вверх.

**Диапазон**: C2–Bb3 (с учётом ceiling G3+octaveShift для интервалов выше квинты).

**Акценты по долям**: velocity зависит от позиции в такте (beat 1 = 0.82, beat 3 = 0.76,
beat 2/4 = 0.68/0.70).

**Звуковой тракт** (в `useTransport.ts`):
```
8 Tone.Samplers (4 pluck × 4 mute) → Tone.Channel (bassVolume) → Destination
```

### 3.2 Пианино (RhodesInstrument)

**Файл**: `packages/music-core/src/audio/rhodesInstrument.ts`

**Входные данные**: `ChordTimeline`.

**Войсинги**: 3 плотности (`shell2`, `rootless3`, `rootless4`).
- `shell2` — терция + септима (2 ноты)
- `rootless3` — терция + септима + дополнительный тон (3 ноты)
- `rootless4` — 4-нотные безосновные войсинги

**Voice leading**: при смене аккорда выбирается ближайшее по голосоведению
расположение (минимизация суммы полутоновых перемещений голосов). При разрыве
(seek назад) состояние сбрасывается.

**Velocity layers**: 4 слоя сэмплов, выбираются по velocity:
- `soft` (< 0.35) — ~5xx нумерация
- `medium` (0.35–0.65) — ~28x нумерация
- `hard` (0.65–0.88) — ~43x нумерация
- `bark` (≥ 0.88) — ~11xx/21xx нумерация

**13 ритмических паттернов** (`mode`):

Базовые (3):
| Режим | Описание |
|-------|----------|
| `wholeNotes` | 1 аккорд на такт (1-я доля) |
| `halfNotes` | 2 аккорда на такт (1-я и 3-я доли) |
| `quarterNotes` | 4 аккорда на такт (все доли) |

Swing-паттерны (10):
| Режим | Хиты | Особенность |
|-------|------|-------------|
| `charleston` | 1 + 2& | Классический джазовый паттерн |
| `reverse-charleston` | 1& + 3 | Обратный чарльстон |
| `basie-2-4` | 2 + 4 | «Count Basie» — только 2-я и 4-я |
| `offbeat-2-4` | 2& + 4& | Оффбит на 2& и 4& |
| `anticipation-4and` | 4& (next) | Антиципация следующего аккорда |
| `one-twoand-four` | 1 + 2& + 4 | Три удара с оффбитом |
| `oneand-three` | 1& + 3 | Оффбит на 1& и даунбит на 3 |
| `twoand-only` | 2& | Минимальный — один удар |
| `four-and-sparse` | 4& (next) | Редкий удар с антиципацией |
| `two-threeand` | 2 + 3& | Даунбит на 2, оффбит на 3& |

**Humanization**: джиттер ±6ms по таймингу и ±5% по velocity.

**Звуковой тракт** (в `useTransport.ts`):
```
4 Tone.Samplers (soft/medium/hard/bark)
  → EQ3 (low -2, mid 0, high +1)
  → Tremolo (5.5 Hz, depth 0.18, wet 0.25)
  → Chorus (1.4 Hz, depth 0.25, wet 0.25)
  → Reverb (decay 1.8s, wet 0.12)
  → Channel (rhodesVolume, pan +0.05)
  → Destination
```

### 3.3 Барабаны (DrumInstrument)

**Файл**: `packages/music-core/src/audio/drumInstrument.ts`

**Не зависит от ChordTimeline** — чисто ритмический инструмент.

**3 звука** (`DrumSound`):
| Звук | Название | 4 round-robin файла |
|------|----------|---------------------|
| `ride` | Тарелка ride | `ride_vl6_rr1..4.ogg` |
| `stir` | Щётка (stir) | `stir_dl2_skin_rr1..4.ogg` |
| `hihatFoot` | Хай-хэт педаль | `hh_foot_vl5_rr1..4.ogg` |

**Логика распределения по долям**:

| Звук | 4/4, 3/4, 2/4, 5/4 | 6/8 |
|------|---------------------|-----|
| `stir` | Все доли (четверти) | Только чётные доли (1, 3, 5) |
| `hihatFoot` | Только backbeats (доли кроме strong и secondStrong) | Только secondStrong (доля 3) |
| `ride` | Зависит от ridePattern | Зависит от ridePattern |

**Backbeat logic** (через `hihatBeats()`):
- 4/4: hihat на доли 1 и 3 (не-strong, не-secondStrong)
- 3/4: hihat на доли 1 и 2
- 6/8: hihat только на secondStrong (доля 3 = вторая группа восьмых)

**Ride pattern**: `quarters` — ровные четверти; `swingRide` — свинговый рисунок
(только для 4/4):

```
Beat:  1    .    2    .    3    .    4    .
       ██         ██   █▌        ██   █▌
Vel:  0.75       0.65 0.50      0.70 0.50
```

**Humanization**: джиттер ±5ms по таймингу и ±5% по velocity для stir и hihat.
Для ride — ±5ms тайминг, velocity ±2.5%.

**Звуковой тракт** (в `useTransport.ts`):
```
4× Tone.Player (ride)    → Channel (drumsRideVolume)   ┐
4× Tone.Player (stir)    → Channel (drumsStirVolume)   ├→ MasterChannel → Destination
4× Tone.Player (hihatFoot)→ Channel (drumsHihatVolume)  ┘
                                          ↑
                              drumsVolume (master)
```

Каждый звук можно включить/выключить независимо: `drumsRideEnabled`, `drumsStirEnabled`,
`drumsHihatEnabled`. Round-robin циклит 4 варианта сэмпла для естественного звучания.

---

## 4. ChordTimeline — источник гармонии

```ts
// packages/music-core/src/audio/chordTimeline.ts

class ChordTimeline {
  constructor(entries: ChordTimelineEntry[]);
  getChordAtTick(virtualTick: number, sig: TimeSignature): ChordSymbol | null;
}
```

`ChordTimeline` — это развёрнутая во времени последовательность аккордов. Каждый
`ChordTimelineEntry` содержит `barIndex` (исходный индекс в сетке) и `chord`
(распарсенный `ChordSymbol` или `null`).

Bass и Rhodes получают **один и тот же** ChordTimeline, но интерпретируют его
по-разному:
- Бас извлекает root/3rd/5th/7th для построения басовой линии
- Rhodes строит безосновные войсинги с голосоведением

Последовательность строится в `useTransport.ts` при старте воспроизведения:
1. `buildFlatSequence(sections)` — разворачивает секции с repeat-маркерами в
   линейную последовательность индексов тактов
2. `buildChordTimelineEntries(sections, flatBars)` — для каждого индекса извлекает
   `chords[0]` из соответствующего такта, парсит `symbol` если нет `parsed`
3. `new ChordTimeline(entries)` — передаётся в бас и Rhodes

**Бесконечный луп**: последняя секция с `repeatEnd.count = null` зацикливается
через `Tone.Transport.loop`. При завороте транспорта `lastScheduledRef`
корректируется, чтобы избежать двойного срабатывания границы.

---

## 5. TransportEngine — владелец музыкального времени

```ts
// packages/music-core/src/audio/transportEngine.ts

class TransportEngine {
  bpm: number;
  timeSignature: TimeSignature;
  status: PlaybackStatus;
  positionTicks: number;

  constructor(opts: TransportEngineOptions);
  addInstrument(instrument: Instrument): void;
  setBpm(bpm: number): void;
  setTimeSignature(sig: TimeSignature | string): void;
  scheduleWindow(window: ScheduleWindow): void;
  onTick(listener: (pos: MusicalPosition) => void): () => void;
  emitTick(ticks: number): void;
  ticksToSeconds(ticks: number): number;
  play() / pause() / stop() / seekToBar(bar: number): void;
}
```

**Опции конструктора**:
```ts
interface TransportEngineOptions {
  bpm?: number;                              // по умолчанию 120
  timeSignature?: TimeSignature | string;    // по умолчанию 4/4
  sink: ClickSink;                           // метроном (обязателен)
  noteSink?: NoteSink;                       // бас (опционально)
  chordSink?: ChordSink;                     // Rhodes (опционально)
  drumSink?: DrumSink;                       // барабаны (опционально)
}
```

**Паттерн внедрения**: каждый sink — это опциональный колбэк. Если sink не передан,
соответствующее поле в `ScheduleContext` будет `undefined`, и инструмент сам решит,
работать ему или нет. Это позволяет подключать инструменты независимо.

**Tick resolution**: PPQ = 480 (pulses per quarter note). Все времена измеряются
в тиках от начала формы. Перевод в секунды: `ticksToSeconds(ticks, bpm)`.

**Поддержка размеров**: `parseTimeSignature("4/4")`, `parseTimeSignature("6/8")` и т.д.
`beatUnit = 4` (четверть) или `8` (восьмая). В 6/8 доля = восьмая, PPQ/2 = 240
тиков на долю.

---

## 6. Точки расширения: как добавить новый инструмент

Текущая архитектура поддерживает добавление инструментов без изменения ядра
`TransportEngine`. Шаги для добавления нового инструмента:

### 6.1 В music-core (чистая логика)

1. **Создать класс, реализующий `Instrument`**:
   ```ts
   class NewInstrument implements Instrument {
     schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
       if (!ctx.scheduleNote) return; // или scheduleChord/scheduleDrum
       // ... логика планирования ...
     }
   }
   ```

2. **Если нужен новый тип событий** — добавить поле в `ScheduleContext`
   и соответствующий sink-тип в `TransportEngineOptions`:
   ```ts
   // В instrument.ts
   export interface ScheduleContext {
     // ... существующие поля ...
     scheduleNewType?(atTicks, data, velocity, dur): void;
   }

   // В transportEngine.ts
   export type NewSink = (atTicks, data, velocity, dur) => void;

   export interface TransportEngineOptions {
     // ... существующие поля ...
     newSink?: NewSink;
   }
   ```
   Затем в `scheduleWindow()` передать `newSink` в контекст:
   ```ts
   const ctx = {
     // ...
     scheduleNewType: newSink ? (...) => newSink(...) : undefined,
   };
   ```

3. **Экспортировать из `index.ts`**.

### 6.2 В apps/web (звуковой рендеринг)

4. **Создать Tone.js-ноды** в `useTransport.ts` (Sampler/Player/Synth + Channel).

5. **Реализовать sink** — замыкание, которое через `tone.scheduleOnce(time, cb)`
   запускает реальный звук.

6. **Создать экземпляр инструмента** и зарегистрировать:
   ```ts
   engine.addInstrument(newInstrument);
   ```

7. **Добавить реактивные эффекты** (`useEffect`) для настроек (громкость, режим, и т.д.).

8. **Добавить cleanup** в `useEffect` return.

### 6.3 В shared (настройки)

9. **Расширить `UserSettingsDTOSchema`** новыми полями.

10. **Добавить миграцию БД** если нужны новые колонки.

11. **Добавить endpoint** в `settings.routes.ts` для обработки новых полей.

12. **Добавить UI** в `SettingsForm.tsx`.

---

## 7. Проблемы текущей архитектуры и путь к модульности

### 7.1 Что хорошо

- **Чистое разделение**: логика инструментов не зависит от Tone.js, React, или БД
- **Единый интерфейс**: все инструменты реализуют `Instrument`
- **Sink-паттерн**: инструменты планируют события, не зная как они рендерятся
- **Тестируемость**: 100% музыкальной логики тестируется в Node (Vitest)
- **ChordTimeline**: единый источник гармонии для всех инструментов
- **Multi-meter**: все инструменты работают с любым размером (4/4, 3/4, 6/8, ...)

### 7.2 Точки напряжения

1. **Монолитный `useTransport.ts`** (880 строк):
   - Смешивает создание всех Tone.js-нод, реактивные эффекты, логику loop/sequence
   - Добавление нового инструмента требует правки этого файла
   - **Решение**: вынести каждый инструмент в отдельный хук
     (`useBassEngine`, `useRhodesEngine`, `useDrumsEngine`)

2. **Sink-типы захардкожены в TransportEngine**:
   - `ScheduleContext` и `TransportEngineOptions` содержат поля для конкретных
     инструментов (`scheduleNote`, `scheduleChord`, `scheduleDrum`)
   - Добавление нового sink-типа требует изменения `TransportEngine`
   - **Решение**: обобщённый `schedule(type: string, ...args)` или
     EventEmitter-паттерн, где инструменты эмитят типизированные события,
     а engine пробрасывает их sinks

3. **Плоский DTO настроек**:
   - Все настройки всех инструментов в одном `UserSettingsDTOSchema`
   - **Решение**: сгруппировать по инструментам:
     ```ts
     { bass: { enabled, volume, complexity, ... }, rhodes: { ... }, drums: { ... } }
     ```

4. **Sample registry разрознен**:
   - `sampleRegistry.ts` (метроном, бас, piano-заглушка, drums-заглушка)
   - `rhodesSampleRegistry.ts` (Rhodes)
   - `drumSampleRegistry.ts` (drums)
   - **Решение**: единый интерфейс `SampleRegistry { baseUrl, files }`, каждый
     инструмент экспортирует свой реестр

5. **Инструменты не знают о настройках**:
   - Настройки передаются через отдельные `set*()` методы
   - **Решение**: `Instrument.configure(settings: InstrumentSettings)` —
     единый метод конфигурации, типизированный под каждый инструмент

### 7.3 План рефакторинга к модульной архитектуре

Фаза A — разбиение useTransport (низкий риск):
```
useTransport.ts (только transport + loop)
  ├── useMetronomeEngine.ts  (click players, метроном-эффекты)
  ├── useBassEngine.ts       (bass samplers, note sink, бас-эффекты)
  ├── useRhodesEngine.ts     (rhodes samplers, fx chain, chord sink, rhodes-эффекты)
  └── useDrumsEngine.ts      (drum players, per-sound channels, drum sink, drums-эффекты)
```

Фаза B — обобщение sink-паттерна (средний риск):
```ts
// Типобезопасный event bus для инструментов
type InstrumentEvent =
  | { type: 'click'; atTicks: number; beatType: BeatType }
  | { type: 'note'; atTicks: number; note: string; velocity: number; durationTicks: number; articulation: BassArticulation }
  | { type: 'chord'; atTicks: number; notes: string[]; velocity: number; durationTicks: number }
  | { type: 'drum'; atTicks: number; sound: DrumSound; velocity: number; durationTicks: number }

// TransportEngine принимает обобщённый обработчик
engine.onEvent((event: InstrumentEvent) => { /* wire to Tone.js */ });
```

Фаза C — группировка настроек (средний риск, требует миграции):
```ts
interface BassSettings { enabled, volume, complexity, octaveUp }
interface RhodesSettings { enabled, volume, mode, voicingDensity }
interface DrumsSettings { enabled, volume, rideEnabled, rideVolume, ... }

interface UserSettingsDTO {
  // ... общие настройки ...
  bass: BassSettings;
  rhodes: RhodesSettings;
  drums: DrumsSettings;
}
```

Эти изменения не меняют публичное API и могут вноситься инкрементально.

---

## 8. Сводная таблица: инструменты и режимы

| Инструмент | Вход | Режимы | Сэмплы | FX |
|-----------|------|--------|--------|-----|
| **Metronome** | — | `activeBeats[]`, strong/secondStrong | 5 звуков клика (MP3) | Громкость dB |
| **Bass** | ChordTimeline | 7 complexity, pluck/mute, octave shift | 4×2 RR сэмпла (OGG) | Channel volume |
| **Rhodes** | ChordTimeline | 3 basic + 10 swing паттернов, 3 voicing density, voice leading | 4 velocity × 15 нот (OGG) | EQ3, Tremolo, Chorus, Reverb |
| **Drums** | TimeSignature (размер) | quarters / swingRide, humanization, per-sound enable | 3 звука × 4 RR (OGG) | 3 per-sound Channels + Master Channel |

---

## 9. Ссылки

- [01-architecture.md](docs/01-architecture.md) — общая архитектура системы
- [02-audio-engine.md](docs/02-audio-engine.md) — дизайн аудиодвижка, модель времени
- [03-data-model.md](docs/03-data-model.md) — модель данных
- [05-frontend.md](docs/05-frontend.md) — фронтенд и сторы
- `packages/music-core/src/audio/` — исходный код движка
- `apps/web/src/engine/useTransport.ts` — интеграция с Tone.js
