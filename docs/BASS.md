# Bass в джазовом тренажёре

> **Статус:** 🟢 Реализовано
> **Модуль:** `packages/music-core/src/audio/bassInstrument.ts`
> **Манифест:** `bassManifest.ts` (SneakyBass)

## 1. Роль баса

Бас — фундамент ритм-секции. В Jazz Trainer он выполняет три функции:

- **Гармонический фундамент:** играет root и 5-ю ступень аккордов, определяя гармонический контекст
- **Ритмический пульс:** walking bass (четверти) в swing, half-notes в bossa, синкопы в funk
- **Связки (approach notes):** хроматические и диатонические подходы к следующему аккорду

## 2. Стили и уровни сложности

`BassInstrument` поддерживает 5 стилей, каждый со своей ритмической стратегией:

| Стиль    | Сложность по умолчанию | Стратегия                                        |
| -------- | ---------------------- | ------------------------------------------------ |
| `swing`  | 5 (walking bass)       | Четверти + восьмые связки между аккордами        |
| `bossa`  | 3 (root-5th)           | Половинные: root на 1-ю долю, 5-я на 3-ю         |
| `funk`   | 5 (syncopated eighths) | Восьмые с синкопами, пропуск сильных долей       |
| `latin`  | 3 (montuno)            | Синкопированный паттерн: нота + пауза + нота     |
| `ballad` | 7 (two-feel)           | Половинные: root на 1-ю и 3-ю доли, длинные ноты |

**Уровни сложности (1–7):** управляют плотностью нот и частотой связок.

## 3. Архитектура BassInstrument

```
BassInstrument implements Instrument
├── timeline: ChordTimeline        ← источник аккордов
├── complexity: 1-7                ← плотность
├── octaveShift: number            ← смещение октавы (-12..+12)
├── style: Style                   ← текущий стиль (swing|bossa|funk|latin|ballad)
└── randomizer: BassRandomizer     ← вариативность связок
```

### 3.1. Методы

```ts
class BassInstrument implements Instrument {
  setTimeline(timeline: ChordTimeline): void;
  setStyle(style: Style): void; // меняет complexity на дефолт стиля
  setComplexity(level: 1 | 2 | 3 | 4 | 5 | 6 | 7): void;
  setOctaveShift(shift: number): void; // -12..+12
  setRandomizationLevel(level: BassRandomizationLevel): void;
  schedule(window: ScheduleWindow, ctx: ScheduleContext): void;
}
```

### 3.2. Диспетчеризация по стилю

Метод `schedule()` делегирует в один из 5 частных планировщиков:

```
schedule(style)
├── swing  → scheduleSwing()
├── bossa  → scheduleBossa()
├── funk   → scheduleFunk()
├── latin  → scheduleLatin()
└── ballad → scheduleBallad()
```

Каждый планировщик — самодостаточный алгоритм, не зависящий от других стилей.

## 4. Алгоритм walking bass (swing)

Walking bass в swing — ядро басового движка. Алгоритм:

1. **Определение долей:** сильные (1, 3 в 4/4) и слабые (2, 4)
2. **Root на сильные:** на каждую сильную долю — root текущего аккорда
3. **Связки на слабые:** подход к следующему аккорду за 1–2 доли до смены
4. **Multi-chord бары:** если в такте >1 аккорда — sparse (половинные вместо четвертей)

### 4.1. Нота на долю

```ts
// Сильная доля: root (или 5-я для вариативности)
note = resolveRootNote(chord, octave);
articulation = 'pluck';

// Слабая доля: связка к следующему аккорду
note = resolveApproachNote(chord, nextChord, barIndex, beat);
articulation = 'pluck';
```

### 4.2. Связки (approach notes)

`resolveApproachNote()` выбирает ноту за полтона-тон до целевого root:

| Вариант          | Пример (к C) |
| ---------------- | ------------ |
| `chromaticAbove` | Db → C       |
| `chromaticBelow` | B → C        |
| `diatonicAbove`  | D → C        |
| `diatonicBelow`  | B → C        |

Выбор варианта — через `BassRandomizer.selectApproachVariant()`.

### 4.3. Артикуляции

Басовые ноты чередуют две артикуляции:

- **pluck** — основная, звучит 92% длительности слота (`GATE_RATIO = 0.92`)
- **mute** — заглушенная, для синкопированных паттернов (funk/latin)

## 5. Другие стили

### 5.1. Bossa (root-5th)

```
| Dm7       | G7        |
| D   A     | G   D     |  ← root на 1, 5-я на 3
```

Две ноты на такт: root и 5-я ступень.

### 5.2. Funk (syncopated eighths)

Восьмые с активной синкопой. Пропуск 1-й доли, акцент на offbeat:

```
| Dm7               |
|   x   x   x   x   |  ← смещённые восьмые
|   1&  2&  3&  4&  |
```

### 5.3. Latin (montuno)

Синкопированный рисунок: звучащая нота → пауза → звучащая нота:

```
| Dm7               |
| x     x     x     |  ← нота на 1, 3 + offbeat после 4
```

### 5.4. Ballad (two-feel)

Половинные ноты, длинные и плавные:

```
| Dm7       |
| x     x   |  ← root на 1 и 3
```

## 6. Рандомайзер (BassRandomizer)

`BassRandomizer` добавляет вариативность через псевдослучайные решения (seed от `barIndex`). Детерминирован — одинаковый вход даёт одинаковый выход.

| Уровень    | Шанс изменений |
| ---------- | -------------- |
| `off`      | 0%             |
| `subtle`   | 15%            |
| `moderate` | 35%            |

**Операции:**

- `selectApproachVariant()` — выбор типа связки (хроматическая/диатоническая, сверху/снизу)
- `shouldPlaySparse()` — sparse-режим при 3+ аккордах в такте
- `shouldShiftOctave()` — октавный скачок вверх для вариативности
- `shouldDropOctave()` — октавный скачок вниз (балансирует подъёмы)

## 7. Семплы (SneakyBass)

**Источник:** SneakyBass (сэмплированный контрабас)
**Формат:** AAC (`.m4a`) с MP3-фолбэком
**Диапазон:** C2–C4 (анкерные ноты через малую терцию)
**Размещение:** `apps/web/public/samples/aac/bass/`

### 7.1. Velocity-слои

Басовые сэмплы используют velocity для выбора round-robin варианта (не громкости):

| Скорость | Значение |
| -------- | -------- |
| Сильная  | 0.82     |
| Слабая 2 | 0.68     |
| Слабая 3 | 0.76     |
| Слабая 4 | 0.70     |

### 7.2. Round-robin

4 варианта на каждую ноту × артикуляцию (pluck, mute). `RoundRobinCounter` циклически перебирает варианты, избегая «machine gun effect».

```ts
// Пример: C2 pluck
pluck / sneakybass_c2_pluck_rr1.m4a;
pluck / sneakybass_c2_pluck_rr2.m4a;
pluck / sneakybass_c2_pluck_rr3.m4a;
pluck / sneakybass_c2_pluck_rr4.m4a;
```

### 7.3. Анкерные ноты

Pluck: `C2, Eb2, Gb2, A2, C3, Eb3, Gb3, A3, C4`
Mute: `Db2, E2, G2, Bb2, Db3, E3, G3, Bb3`

Tone.js интерполирует ±2 полутона от каждого анкера.

## 8. Манифест (bassManifest)

```ts
export const bassManifest: InstrumentManifest = {
  id: 'bass',
  name: 'Bass',
  createInstrument: () => new BassInstrument(new ChordTimeline()),
  sampleManifest: BASS_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: true,
    volume: 0.8,
    complexity: 3,
    octaveUp: false,
  },
};
```

## 9. Взаимодействие с другими инструментами

| Инструмент | Правило                                                     |
| ---------- | ----------------------------------------------------------- |
| **Drums**  | Независимы. Бас держит гармонию, барабаны — groove          |
| **Rhodes** | Rhodes избегает низкого регистра (C3–C4), оставляя его басу |
| **Piano**  | Бас — нижний слой, Piano — средний/верхний (C3–C6)          |

## 10. Тесты

- `bassInstrument.test.ts` — покрытие всех 5 стилей, сложностей, связок
- `bassRandomizer.ts` — детерминированность рандомайзера
- `rrCounter.ts` — round-robin логика

---

_См. также: `docs/PIANO.md`, `docs/RHODES.md`, `docs/DRUMS.md`_
