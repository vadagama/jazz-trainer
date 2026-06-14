# Drums в джазовом тренажёре

## План задач

### Фаза 1 — Аудио-пайплайн

- [x] Создать `packages/music-core/src/audio/drumSampleRegistry.ts`
  - [x] Описать 3 звука: `ride`, `stir`, `hihatFoot`
  - [x] Для каждого звука — 4 round-robin варианта (`rr1`–`rr4`)
  - [x] Реализовать `pickRoundRobin(sound)` с рандомным выбором без повторений
- [x] OGG-файлы размещены в `apps/web/public/samples/drums/` (libopus 128k, конвертированы из WAV):
  - `hh_foot_vl5_rr1-4.ogg` — hi-hat foot (pedal), 1 velocity layer, 4 RR
  - `ride_vl6_rr1-4.ogg` — ride cymbal, 1 velocity layer, 4 RR
  - `stir_dl2_skin_rr1-4.ogg` — brushes stir on snare, dynamics level 2, 4 RR

### Фаза 2 — Движок (пакет `music-core`)

- [x] Создать класс `DrumInstrument` (аналог `BassInstrument`)
- [x] Реализовать 3 отдельных `Tone.Sampler` — по одному на каждый звук
- [x] Реализовать метод `schedule(window, ctx)` из интерфейса `Instrument`
- [x] Паттерн swing 4/4:
  - [x] на каждую долю (1 2 3 4), длительность = 1 четверть
  - [x] на доли 2 и 4
  - [x] паттерн по настройке: `quarters` или `swingRide`
- [x] Humanization: ±5 ms timing, ±0.05 velocity
- [x] Управление громкостью каждого звука через `Tone.Channel`
- [x] Управление enable/disable каждого звука (skip scheduling если отключён)

### Фаза 3 — Transport / Scheduling

- [x] Добавить `DrumSink` тип в `transportEngine.ts`
- [x] Добавить опцию `drumSink` в `TransportEngineOptions`
- [x] Добавить `scheduleDrum` в контекст `scheduleWindow`
- [x] Интегрировать `DrumInstrument` в transport engine
- [x] Правила взаимодействия: drums не конфликтуют с bass/rhodes — независимое расписание

### Фаза 4 — Настройки и API

- [x] Добавить поля в DB schema (`apps/api/src/db/schema.ts`):
  ```ts
  drumsEnabled: boolean; // default: true
  drumsVolume: number; // master, dB, default: 0
  drumsRideEnabled: boolean; // default: true
  drumsRideVolume: number; // dB, default: 0
  drumsStirEnabled: boolean; // default: true
  drumsStirVolume: number; // dB, default: 0
  drumsHihatEnabled: boolean; // default: true
  drumsHihatVolume: number; // dB, default: -3
  drumsRidePattern: string; // 'quarters' | 'swingRide', default: 'swingRide'
  ```
- [x] Создать миграцию `0008_add_drums_settings.sql`
- [x] Обновить `UserSettingsDTOSchema` (Zod) в `packages/shared/src/dto.ts`
- [x] Обновить `toSettingsDTO` и PATCH `/api/settings`

### Фаза 5 — Frontend

- [x] Добавить поля drums в `useLocalSettingsStore`
- [x] Добавить `useEffect` хуки для синхронизации с `DrumInstrument`
- [x] Добавить секцию «Drums» в `SettingsForm.tsx`:
  - [x] (enabled)
  - [x] (slider)
  - [x] — для каждого: checkbox enabled + slider volume
  - [x] pattern

### Фаза 6 — Тесты

- [x] Unit тесты для `drumSampleRegistry` (round-robin distribution, нет двух одинаковых подряд)
- [x] Unit тесты для `DrumInstrument`:
  - [x] 4/4: stir на все 4 доли, hihat на 2 и 4
  - [x] 3/4: stir на все 3 доли, hihat на 2 и 3
  - [x] 2/4: stir на обе доли, hihat только на 2
  - [x] 5/4: stir на все 5 долей, hihat на 4 и 5
  - [x] 6/8: stir только на восьмых 1, 3, 5; hihat на восьмой 4
  - [x] `swingRide` включается только при 4/4, деградирует до `quarters` в других размерах
  - [x] Отключённый звук не попадает в sink
  - [x] Humanize jitter не выходит за границы окна (`tick >= window.startTicks`)
- [x] TypeScript compilation check (`tsc --noEmit`)

---

## 1. Роль барабанов

Контрабас держит пульс и гармонию. Rhodes даёт аккордовую окраску. Барабаны делают другое:

- задают swing feel — неравные восьмые (1:2 или 2:3)
- подчёркивают сильные и слабые доли
- дают «дыхание» через brushes stir
- отмечают фразы через ride

В jazz-тренажёре drums работают как **фоновый ритм-секция** — не солируют, только держат groove.

**Три звука для MVP:**

| Звук        | Техника          | Функция                     |
| ----------- | ---------------- | --------------------------- |
| `stir`      | Brushes on snare | Непрерывный swing, все доли |
| `hihatFoot` | Hi-hat pedal     | Акцент на 2 и 4 (backbeat)  |
| `ride`      | Ride cymbal      | Пульс, swing pattern        |

## 2. Паттерны по размерам

Проект поддерживает 5 тайм-сигнатур: `4/4`, `3/4`, `2/4`, `5/4`, `6/8`.
Логика бэкбитов берётся из `defaultSecondStrongBeats(sig)` — не хардкодится.

### 4/4 — стандартный swing

```
Beat:        1         2         3         4
Stir:        ●─────────●─────────●─────────●
HiHat foot:            ●                   ●     (backbeat: 2 и 4)
Ride:        ●         ●         ●         ●
```

- `hihatFoot` — на долях из `defaultSecondStrongBeats` → `[2]` (0-indexed) = доли 2 и 4
- `swingRide` доступен только в `4/4`

### 3/4 — jazz waltz

```
Beat:        1         2         3
Stir:        ●─────────●─────────●
HiHat foot:            ●         ●           (доли 2 и 3)
Ride:        ●         ●         ●
```

- `defaultSecondStrongBeats` возвращает `[]` для 3/4, поэтому для hihat используем специальное правило: доли 2 и 3 (весь нижний пульс кроме первой)
- `swingRide` недоступен — только `quarters`

### 2/4

```
Beat:        1         2
Stir:        ●─────────●
HiHat foot:            ●                     (только доля 2)
Ride:        ●         ●
```

- `defaultSecondStrongBeats` → `[]`, hihat только на последней доле такта

### 5/4 — группировка 3+2 или 2+3

```
Beat:        1    2    3    4    5
Stir:        ●    ●    ●    ●    ●
HiHat foot:            ●         ●           (defaultSecondStrongBeats → [3])
Ride:        ●    ●    ●    ●    ●
```

- `defaultSecondStrongBeats` → `[3]` (0-indexed) = доля 4
- `swingRide` недоступен

### 6/8 — compound duple (3+3)

```
Beat (8th):  1    2    3    4    5    6
Stir:        ●         ●         ●           (downbeats каждой группы: 1, 3, 5)
HiHat foot:                 ●               (доля 4 — начало второй группы)
Ride:        ●    ●    ●    ●    ●    ●      (все восьмые)
```

- `beatUnit = 8`, так что одна «доля» = восьмая (PPQ/2 тиков)
- Stir играет только на нечётных восьмых (1, 3, 5) — «пульс» групп
- `defaultSecondStrongBeats` → `[3]` (0-indexed) = четвёртая восьмая
- `swingRide` недоступен

---

### Swing ride pattern (`swingRide`) — только 4/4

Классический джазовый ride: «ding ding-a-ding»

```
Beat:        1    &    2    &    3    &    4    &
Ride:        ●         ●    ●    ●         ●    ●
             down      down up   down      down up
```

В делениях тактовой сетки (PPQ=480, 4/4: 1920 ticks/такт, 480 ticks/доля):

```ts
const swingRidePattern = [
  { beat: 0, subdivision: 0 }, // доля 1
  { beat: 1, subdivision: 0 }, // доля 2
  { beat: 1, subdivision: 0.67 }, // &-доля 2 (swing triplet)
  { beat: 2, subdivision: 0 }, // доля 3
  { beat: 3, subdivision: 0 }, // доля 4
  { beat: 3, subdivision: 0.67 }, // &-доля 4
];
```

> **Swing feel:** &-доли сдвигаются к 2/3 от четверти (триольная восьмая), не к ровной 1/2.
> `swingRide` автоматически деградирует до `quarters` если `beatsPerBar !== 4 || beatUnit !== 4`.

---

### Сводная таблица по размерам

| Размер | Stir            | HiHat foot           | swingRide | Источник backbeat                     |
| ------ | --------------- | -------------------- | --------- | ------------------------------------- |
| 4/4    | все 4 доли      | 2 и 4 (0-ind: 1, 3)  | ✅        | `defaultSecondStrongBeats`→[2] + last |
| 3/4    | все 3 доли      | 2 и 3 (0-ind: 1, 2)  | ❌        | все кроме первой                      |
| 2/4    | обе доли        | только 2 (0-ind: 1)  | ❌        | все кроме первой                      |
| 5/4    | все 5 долей     | 4 и 5 (0-ind: 3, 4)  | ❌        | `defaultSecondStrongBeats`→[3] + last |
| 6/8    | восьмые 1, 3, 5 | восьмая 4 (0-ind: 3) | ❌        | `defaultSecondStrongBeats`→[3]        |

## 3. Семплы

### Именование файлов

```
{звук}_{параметры}_{rr}.ogg

hh_foot_vl5_rr1.ogg   → hi-hat foot, velocity layer 5, round-robin 1
ride_vl6_rr1.ogg      → ride cymbal, velocity layer 6, round-robin 1
stir_dl2_skin_rr1.ogg → brushes stir, dynamics level 2, skin head, RR 1
```

> Формат: OGG/Opus (libopus 128k), конвертированы из исходных WAV.

### Все файлы в `apps/web/public/samples/drums/`

| Файл                      | Звук         | Слои       |
| ------------------------- | ------------ | ---------- |
| `hh_foot_vl5_rr1-4.ogg`   | HiHat foot   | vl5 × 4 RR |
| `ride_vl6_rr1-4.ogg`      | Ride cymbal  | vl6 × 4 RR |
| `stir_dl2_skin_rr1-4.ogg` | Stir brushes | dl2 × 4 RR |

### Round-robin

Все 4 варианта одного звука чередуются чтобы избежать «machine gun effect»:

```ts
export type DrumSound = 'ride' | 'stir' | 'hihatFoot';

const rrCounters: Record<DrumSound, number> = {
  ride: 0,
  stir: 0,
  hihatFoot: 0,
};

export function pickDrumSample(sound: DrumSound): string {
  const rr = (rrCounters[sound] % 4) + 1;
  rrCounters[sound]++;
  return DRUM_SAMPLES[sound][rr];
}
```

## 4. Архитектура DrumInstrument

### Интерфейс

```ts
export interface DrumInstrumentSettings {
  enabled: boolean;
  masterVolume: number; // dB
  ride: { enabled: boolean; volume: number };
  stir: { enabled: boolean; volume: number };
  hihatFoot: { enabled: boolean; volume: number };
  ridePattern: 'quarters' | 'swingRide';
}
```

### Структура класса

```ts
export class DrumInstrument implements Instrument {
  private rideSampler: Tone.Sampler;
  private stirSampler: Tone.Sampler;
  private hihatSampler: Tone.Sampler;
  private rideChannel: Tone.Channel;
  private stirChannel: Tone.Channel;
  private hihatChannel: Tone.Channel;
  private masterChannel: Tone.Channel;
  private settings: DrumInstrumentSettings;

  constructor(settings: DrumInstrumentSettings) { ... }
  updateSettings(settings: Partial<DrumInstrumentSettings>): void { ... }
  schedule(window: ScheduleWindow, ctx: ScheduleContext): void { ... }
  dispose(): void { ... }
}
```

### Цепочка эффектов

```
RideSampler  → rideChannel  ─┐
StirSampler  → stirChannel  ─┼→ masterChannel → Destination
HihatSampler → hihatChannel ─┘
```

## 5. Настройки барабанов

### DB поля

```sql
-- Migration: 0008_add_drums_settings.sql
ALTER TABLE user_settings ADD COLUMN drums_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE user_settings ADD COLUMN drums_volume INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_settings ADD COLUMN drums_ride_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE user_settings ADD COLUMN drums_ride_volume INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_settings ADD COLUMN drums_stir_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE user_settings ADD COLUMN drums_stir_volume INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_settings ADD COLUMN drums_hihat_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE user_settings ADD COLUMN drums_hihat_volume INTEGER NOT NULL DEFAULT -3;
ALTER TABLE user_settings ADD COLUMN drums_ride_pattern TEXT NOT NULL DEFAULT 'swingRide';
```

### Zod-схема (dto.ts)

```ts
drumsEnabled:      z.boolean().default(true),
drumsVolume:       z.number().min(-30).max(6).default(0),
drumsRideEnabled:  z.boolean().default(true),
drumsRideVolume:   z.number().min(-30).max(6).default(0),
drumsStirEnabled:  z.boolean().default(true),
drumsStirVolume:   z.number().min(-30).max(6).default(0),
drumsHihatEnabled: z.boolean().default(true),
drumsHihatVolume:  z.number().min(-30).max(6).default(-3),
drumsRidePattern:  z.enum(['quarters', 'swingRide']).default('swingRide'),
```

### Frontend SettingsForm секция

```tsx
<SectionHeader>Drums</SectionHeader>

{/* Мастер */}
<ToggleRow label="Drums" field="drumsEnabled" />
<SliderRow label="Volume" field="drumsVolume" min={-30} max={6} step={1} unit="dB" />
<SelectRow label="Ride pattern" field="drumsRidePattern"
  options={[
    { value: 'swingRide', label: 'Swing ride (ding ding-a-ding)' },
    { value: 'quarters',  label: 'Quarter notes' },
  ]} />

{/* Per-sound */}
<SubSection label="Ride cymbal">
  <ToggleRow label="Enabled" field="drumsRideEnabled" />
  <SliderRow label="Volume" field="drumsRideVolume" min={-30} max={6} step={1} unit="dB" />
</SubSection>

<SubSection label="Stir (brushes)">
  <ToggleRow label="Enabled" field="drumsStirEnabled" />
  <SliderRow label="Volume" field="drumsStirVolume" min={-30} max={6} step={1} unit="dB" />
</SubSection>

<SubSection label="Hi-hat foot">
  <ToggleRow label="Enabled" field="drumsHihatEnabled" />
  <SliderRow label="Volume" field="drumsHihatVolume" min={-30} max={6} step={1} unit="dB" />
</SubSection>
```

## 6. Scheduling — алгоритм

### Backbeat helper

Вместо хардкода «2 и 4» используем `defaultSecondStrongBeats` и правило последней доли:

```ts
import { defaultSecondStrongBeats } from '../time/timeSignature.js';

function hihatBeats(sig: TimeSignature): Set<number> {
  const second = defaultSecondStrongBeats(sig); // [2] для 4/4, [3] для 5/4, [3] для 6/8
  if (second.length > 0) {
    // 4/4 → {2, 4} т.е. secondStrong=2 → beats 2 и beatsPerBar-1=3 (0-indexed)
    return new Set([...second, sig.beatsPerBar - 1]);
  }
  // 3/4, 2/4: нет secondStrong → все доли кроме первой
  return new Set(Array.from({ length: sig.beatsPerBar - 1 }, (_, i) => i + 1));
}
```

### 6/8: stir только на нечётных восьмых

```ts
function isStirBeat(beatIndex: number, sig: TimeSignature): boolean {
  if (sig.beatUnit === 8) return beatIndex % 2 === 0; // восьмые: 0, 2, 4
  return true; // все доли для /4
}
```

### Основной цикл

```ts
schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
  if (!this.settings.enabled || !ctx.scheduleDrum) return;

  const { startTicks, endTicks } = window;
  const sig = ctx.timeSignature;
  const tpBeat = ticksPerBeat(sig);
  const tpBar  = ticksPerBar(sig);
  const backbeats = hihatBeats(sig);
  const useSwingRide = this.settings.ridePattern === 'swingRide'
    && sig.beatsPerBar === 4 && sig.beatUnit === 4;

  for (let tick = startTicks; tick < endTicks; tick += tpBeat) {
    const beatInBar = Math.round((tick % tpBar) / tpBeat); // 0-indexed

    // Stir
    if (this.settings.stir.enabled && isStirBeat(beatInBar, sig)) {
      const jitter = (Math.random() - 0.5) * 10;
      const t = Math.max(window.startTicks, tick + jitter);
      ctx.scheduleDrum(t, 'stir', 0.6 + Math.random() * 0.1, tpBeat);
    }

    // Hi-hat foot
    if (this.settings.hihatFoot.enabled && backbeats.has(beatInBar)) {
      const jitter = (Math.random() - 0.5) * 8;
      const t = Math.max(window.startTicks, tick + jitter);
      ctx.scheduleDrum(t, 'hihatFoot', 0.7 + Math.random() * 0.1, 20);
    }

    // Ride: quarters на все доли; swingRide добавит &-доли отдельно
    if (this.settings.ride.enabled && !useSwingRide) {
      const jitter = (Math.random() - 0.5) * 6;
      const t = Math.max(window.startTicks, tick + jitter);
      ctx.scheduleDrum(t, 'ride', 0.65 + Math.random() * 0.1, 20);
    }
  }

  // Swing ride — отдельный проход только для 4/4
  if (this.settings.ride.enabled && useSwingRide) {
    this.scheduleSwingRide(window, ctx, tpBeat, tpBar);
  }
}
```

## 7. Humanization

| Параметр       | Значение    |
| -------------- | ----------- |
| Timing jitter  | ±5 ms       |
| Velocity range | ±0.05 (0–1) |

Jitter не должен вывести ноту за начало окна (`tick >= window.startTicks`).

## 8. Взаимодействие с другими инструментами

Drums полностью независимы от Bass и Rhodes — нет никаких ограничений на совместное расписание. Единственное правило: drums используют свой `DrumSink`, а не `noteSink`/`chordSink`.

```ts
export type DrumSink = (
  atTicks: number,
  sound: DrumSound,
  velocity: number,
  durationTicks: number,
) => void;
```
