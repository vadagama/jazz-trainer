# Rhodes в джазовом тренажёре

> **Статус:** 🟢 Реализовано
> **Модуль:** `packages/music-core/src/audio/rhodesInstrument.ts`
> **Манифест:** `rhodesManifest.ts` (jRhodes3c)

## 1. Роль Rhodes: комплементарный слой

> **Рефакторинг 2026:** Rhodes переведён из основного гармонического инструмента в роль **комплементарного слоя** поверх Piano. Основная гармоническая партия теперь у `PianoInstrument`.

Rhodes в роли комплементарного слоя:

- **Текстурная поддержка:** добавляет окраску и плотность, не перебивая Piano
- **Верхний регистр:** играет в C4–C6, оставляя низ (C3–C4) для Piano и баса
- **Разреженный ритм:** целые ноты, offbeat-акценты, ambient-свеллы — никогда не competing с Piano
- **Не дублирует Piano:** избегает тех же ритмических слотов и регистров (см. `pianoRhodesInteraction.ts`)

## 2. Два режима работы

### 2.1. Legacy-режим (RhodesCompingMode)

Исторический API — прямой выбор ритмического паттерна. **Deprecated**, заменён на `RhodesLayerMode`.

```ts
type RhodesCompingMode =
  | 'wholeNotes'
  | 'halfNotes'
  | 'quarterNotes'
  | 'charleston'
  | 'reverse-charleston'
  | 'basie-2-4'
  | 'offbeat-2-4'
  | 'anticipation-4and'
  | 'one-twoand-four'
  | 'oneand-three'
  | 'twoand-only'
  | 'four-and-sparse'
  | 'two-threeand';
```

### 2.2. Режим комплементарного слоя (RhodesLayerMode)

Новый API — выбор роли в миксе:

| Режим             | Описание                                      | Событий/такт | Velocity  |
| ----------------- | --------------------------------------------- | ------------ | --------- |
| `none`            | Rhodes отключён — 0 событий                   | 0            | —         |
| `pads`            | Целые ноты — медленные гармонические подклады | 1            | 0.35      |
| `subtle-offbeats` | Только 2& и 4& — лёгкие offbeat-акценты       | 2            | 0.35/0.32 |
| `high-comping`    | Половинные в верхнем регистре (+12 полутонов) | 2            | 0.34/0.30 |
| `ambient-swells`  | Длинные swell'ы каждые 2 такта (7.6 долей)    | 0.5\*        | 0.30      |
| `stab-accents`    | Короткие акценты на 2 и 4 (как Basie-style)   | 2            | 0.65/0.60 |

_\*ambient-swells: 1 событие раз в 2 такта_

Методы управления:

```ts
setLayerMode(mode: RhodesLayerMode): void;  // выбор режима
setLayerVolume(volume: number): void;       // громкость слоя [0, 1]
```

## 3. Сэмплы (jRhodes3c)

**Источник:** jRhodes3c (Rhodes Mark I, сэмплированный послойно)
**Формат:** AAC (`.m4a`) с MP3-фолбэком
**Диапазон:** F1–C7
**Размещение:** `apps/web/public/samples/aac/rhodes/`

### 3.1. Velocity-слои (4 уровня)

| Слой     | Порог velocity | Характер                      | Нот в слое |
| -------- | -------------- | ----------------------------- | ---------- |
| `soft`   | < 0.35         | Мягкий, тёплый                | 15         |
| `medium` | 0.35–0.65      | Средний, основной для comping | 10\*       |
| `hard`   | 0.65–0.88      | Яркий, articulate             | 15         |
| `bark`   | ≥ 0.88         | Перегруженный, перкуссивный   | 15         |

_\*medium-слой неполный: A5–C7 отсутствуют — Tone.js интерполирует от E5_

Выбор слоя: `pickRhodesLayer(velocity)`.

## 4. Voicing-движок

Общий с Piano voicing-движок в `rhodesVoicing.ts`. Использует те же алгоритмы, но с отдельной реализацией:

### 4.1. Типы voicing'ов

| Voicing     | Нот | Состав                 |
| ----------- | --- | ---------------------- |
| `shell2`    | 2   | 3-й + 7-й тон          |
| `rootless3` | 3   | 3 + 7 + 9 (color tone) |
| `rootless4` | 4   | 3 + 7 + 9 + 13         |

### 4.2. Голосоведение

Алгоритм идентичен Piano: направленный bias (вниз 0.7×, вверх 1.3×), мягкий потолок C5 (2.0×), жёсткий потолок MIDI 80.

### 4.3. Октавный сдвиг (high-comping)

В режиме `high-comping` все ноты сдвигаются на +12 полутонов (октава вверх) — Rhodes играет в C5–C7, полностью освобождая середину для Piano.

## 5. Ритмические паттерны (комплементарные)

```ts
export const LAYER_PATTERNS: Record<RhodesLayerMode, readonly CompEvent[]> = {
  pads: [{ beat: 1, durationBeats: 3.6, velocity: 0.35 }],
  'subtle-offbeats': [
    { beat: 2, subdivision: 0.5, durationBeats: 0.55, velocity: 0.35 },
    { beat: 4, subdivision: 0.5, durationBeats: 0.55, velocity: 0.32 },
  ],
  'high-comping': [
    { beat: 1, durationBeats: 1.65, velocity: 0.34 },
    { beat: 3, durationBeats: 1.45, velocity: 0.3 },
  ],
  'ambient-swells': [{ beat: 1, durationBeats: 7.6, velocity: 0.3 }],
  'stab-accents': [
    { beat: 2, durationBeats: 0.3, velocity: 0.65 },
    { beat: 4, durationBeats: 0.3, velocity: 0.6 },
  ],
  none: [],
};
```

## 6. Humanization

- **Timing jitter:** ±6 мс (преобразуется в тики)
- **Velocity variation:** ±0.05 в legacy-режиме, ±0.03 в layer-режиме (меньше, т.к. это фоновый слой)

## 7. Взаимодействие Piano ↔ Rhodes

`pianoRhodesInteraction.ts` — модуль разрешения конфликтов:

```ts
function avoidConflicts(
  rhodesEvents: CompEvent[],
  pianoEvents: readonly { beat: number; subdivision?: number }[],
  tpBeat: number,
): CompEvent[];
```

**Правила:**

1. Если Rhodes-событие в том же ритмическом слоте (±1/16), что и Piano — сдвиг на 1/16 позже
2. При сдвиге velocity снижается на 30% (множитель 0.7)
3. Если сдвиг невозможен (уже на max subdivision) — оставляется как есть (минорное перекрытие допустимо)

## 8. Манифест

```ts
export const rhodesManifest: InstrumentManifest = {
  id: 'rhodes',
  name: 'Rhodes',
  createInstrument: () => new RhodesInstrument(new ChordTimeline()),
  sampleManifest: RHODES_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.6,
    mode: 'halfNotes',
    voicingDensity: 'rootless3',
  },
};
```

По умолчанию Rhodes отключён (`enabled: false`) — включается пользователем как опциональный слой.

## 9. API

```ts
class RhodesInstrument implements Instrument {
  setTimeline(timeline: ChordTimeline): void;
  setStyle(style: Style): void; // меняет режим по умолчанию
  setMode(mode: RhodesCompingMode): void; // @deprecated
  setLayerMode(mode: RhodesLayerMode): void; // основной API
  setLayerVolume(volume: number): void; // [0, 1]
  setVoicingDensity(density: RhodesVoicingDensity): void;
  setBaseVelocity(velocity: number): void; // [0, 2]
  setHumanize(enabled: boolean): void;
  reset(): void;
  dispose(): void;
  schedule(window: ScheduleWindow, ctx: ScheduleContext): void;
}
```

## 10. Тесты

- `rhodesInstrument.test.ts` — legacy-режим, layer-режим, high-comping октавный сдвиг
- `rhodesVoicing.test.ts` — все типы аккордов, все плотности, голосоведение
- `pianoRhodesInteraction.test.ts` — избегание конфликтов

---

_См. также: `docs/PIANO.md` (основной слой), `docs/BASS.md` (бас)_
