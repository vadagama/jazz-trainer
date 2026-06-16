# Drums в джазовом тренажёре

> **Статус:** 🟢 Реализовано
> **Модуль:** `packages/music-core/src/audio/drumInstrument.ts`
> **Манифест:** `drumsManifest.ts` (Swirly Drums v2)

## 1. Роль барабанов

Барабаны в Jazz Trainer работают как **фоновая ритм-секция** — не солируют, держат groove:

- Задают **swing feel** через ride-паттерн и хай-хэт
- Подчёркивают **backbeat** (2 и 4 долю) через snare
- Добавляют **текстуру** через bass drum, crash, rim
- Автоматически адаптируются под размер и стиль

**Восемь звуков Swirly Drums v2:**

| Звук        | Функция                               |
| ----------- | ------------------------------------- |
| `bassDrum`  | Низкий пульс, акценты на сильные доли |
| `snare`     | Backbeat (2 и 4), ghost-ноты, fills   |
| `hihat`     | Закрытый хай-хэт — восьмые/четверти   |
| `hihatHalf` | Полуоткрытый хай-хэт                  |
| `hihatOpen` | Открытый хай-хэт — акценты            |
| `ride`      | Ride-тарелка — swing pattern          |
| `crash`     | Crash-тарелка — заполнения (fills)    |
| `rim`       | Рим-шот / клаве — bossa-акценты       |

## 2. Стили и паттерны

`DrumInstrument` поддерживает 3 стиля со специфическими планировщиками:

```
schedule(style)
├── swing  → scheduleSwing()
├── bossa  → scheduleBossa()
└── funk   → scheduleFunk()
```

Для неподдерживаемых стилей (`latin`, `ballad`) используется degraded `scheduleSwing()`.

### 2.1. Swing (scheduleSwing)

Классический джазовый паттерн:

| Доля | BassDrum    | Snare        | HiHat     | Ride |
| ---- | ----------- | ------------ | --------- | ---- |
| 1    | ● (сильная) |              | ● (chick) | ●    |
| 2    |             | ● (backbeat) | ● (chick) | ●    |
| 3    | ● (слабая)  |              | ● (chick) | ●    |
| 4    |             | ● (backbeat) | ● (chick) | ●    |

Ride играет классический `ding ding-a-ding` (доля + swing-восьмая), хай-хэт — chick на 2 и 4.

### 2.2. Bossa (scheduleBossa)

Латиноамериканский паттерн с rim/clave:

| Доля | BassDrum | Snare | HiHat      | Rim |
| ---- | -------- | ----- | ---------- | --- |
| 1    | ●        |       | ○ (закрыт) | ●   |
| 2    |          |       | ○ (закрыт) | ●   |
| 3    | ●        |       | ○ (закрыт) | ●   |
| 4    |          |       | ○ (закрыт) |     |

Snare не используется в bossa — вместо неё rim/clave.

### 2.3. Funk (scheduleFunk)

Синкопированный грув с 16-ми нотами:

| Доля | BassDrum  | Snare        | HiHat      |
| ---- | --------- | ------------ | ---------- |
| 1    | ●         |              | ● (закрыт) |
| 1e   |           |              |            |
| 1&   | ○ (ghost) |              | ○ (открыт) |
| 2    |           | ● (backbeat) | ● (закрыт) |
| ...  |           |              |            |

Bass drum активнее, больше синкоп, открытый хай-хэт на offbeat'ах.

## 3. Настройки (DrumInstrumentSettings)

Барабаны имеют самые детальные настройки среди всех инструментов:

```ts
interface DrumInstrumentSettings {
  enabled: boolean; // мастер-выключатель
  volume: number; // общая громкость
  pattern: DrumsPattern; // 'swing' | 'bossa' | 'funk' | 'ballad' | 'latin'

  // Per-sound enable + volume
  bassDrumEnabled: boolean;
  bassDrumVolume: number;
  snareEnabled: boolean;
  snareVolume: number;
  hihatEnabled: boolean;
  hihatVolume: number;
  hihatOpenness: number; // 0..1 степень открытости
  rideEnabled: boolean;
  rideVolume: number;
  crashEnabled: boolean;
  crashVolume: number;
  crashFrequency: number; // частота crash (тактов)
  rimEnabled: boolean;
  rimVolume: number;

  // Humanization
  humanizeIntensity: HumanizeIntensity; // 'off' | 'low' | 'med' | 'high'

  // Randomization
  funkComplexity: number; // 1..3
  randomizationLevel: RandomizationLevel; // 'off' | 'subtle' | 'moderate' | 'high'
  fillFrequency: FillFrequency; // 'never' | '4bars' | '8bars' | '16bars'
  fillComplexity: FillComplexity; // 'simple' | 'medium' | 'complex'
  rideVariation: boolean; // вариации ride
  snareGhosts: boolean; // ghost-ноты на snare
  bassDrumVariation: boolean; // вариации bass drum
}
```

## 4. Humanization

Три уровня интенсивности с разной амплитудой jitter'а:

| Уровень | Timing jitter |
| ------- | ------------- |
| `off`   | 0 мс          |
| `low`   | ±3 мс         |
| `med`   | ±5 мс         |
| `high`  | ±8 мс         |

Jitter не выводит событие за границы окна (`atTicks >= window.fromTicks`).

## 5. Рандомайзер (DrumRandomizer)

`DrumRandomizer` добавляет вариативность через псевдослучайные решения (seed от `barIndex`):

| Уровень    | Шанс изменений |
| ---------- | -------------- |
| `off`      | 0%             |
| `subtle`   | 10%            |
| `moderate` | 25%            |
| `high`     | 40%            |

**Операции (применяются in-place к массиву hits):**

1. **Ride variation** — изменение velocity (×0.85–1.15),偶尔 пропуск (30% шанс)
2. **Bass drum variation** — изменение velocity (×0.7–1.3), ghost-kick на слабых долях (20% шанс)
3. **Snare ghost notes** — тихие ноты на субдивизиях 'e' и 'a' (кроме bossa и backbeat-долей)
4. **Fills** — заполнения каждые N тактов (4/8/16), стиль-специфичные:
   - Swing: snare + bass drum триольные bursts
   - Bossa: rim clave вариации + syncopated bass drum
   - Funk: 16-е snare fill + crash accent

## 6. Семплы (Swirly Drums v2)

**Источник:** Swirly Drums v2 (акустическая джазовая установка)
**Формат:** AAC (`.m4a`) с MP3-фолбэком
**Размещение:** `apps/web/public/samples/aac/drums/swirly/`

### 6.1. Файлы (4 round-robin на звук)

```ts
export const DRUM_SAMPLE_FILES: Record<DrumSound, string[]> = {
  bassDrum: ['bd_vl5_rr1.m4a', 'bd_vl5_rr2.m4a', 'bd_vl5_rr3.m4a', 'bd_vl5_rr4.m4a'],
  snare: ['sn_closed_rr1.m4a', 'sn_closed_rr2.m4a', 'sn_closed_rr3.m4a', 'sn_closed_rr4.m4a'],
  hihat: ['hh_closed_rr1.m4a', 'hh_closed_rr2.m4a', 'hh_closed_rr3.m4a', 'hh_closed_rr4.m4a'],
  hihatHalf: ['hh_half_rr1.m4a', 'hh_half_rr2.m4a', 'hh_half_rr3.m4a', 'hh_half_rr4.m4a'],
  hihatOpen: ['hh_open_rr1.m4a', 'hh_open_rr2.m4a', 'hh_open_rr3.m4a', 'hh_open_rr4.m4a'],
  ride: ['ride_vl6_rr1.m4a', 'ride_vl6_rr2.m4a', 'ride_vl6_rr3.m4a', 'ride_vl6_rr4.m4a'],
  crash: [
    'crash_accent_rr1.m4a',
    'crash_accent_rr2.m4a',
    'crash_accent_rr3.m4a',
    'crash_accent_rr4.m4a',
  ],
  rim: ['rim_click_rr1.m4a', 'rim_click_rr2.m4a', 'rim_click_rr3.m4a', 'rim_click_rr4.m4a'],
};
```

### 6.2. Round-robin

Все 4 варианта каждого звука циклически чередуются через `RoundRobinCounter`, избегая «machine gun effect».

### 6.3. Тип SampleManifest (oneshots)

В отличие от pitched-инструментов (слои `layers`), барабаны используют `oneshots`:

```ts
const DRUMS_SAMPLE_MANIFEST: SampleManifest = {
  baseUrl: '/samples/aac/drums/swirly/',
  fallbackBaseUrl: '/samples/mp3/drums/swirly/',
  oneshots: DRUM_SAMPLE_FILES,
  rrCount: 4,
};
```

## 7. Манифест

```ts
export const drumsManifest: InstrumentManifest = {
  id: 'drums',
  name: 'Drums',
  createInstrument: () => new DrumInstrument(),
  sampleManifest: DRUMS_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: true,
    volume: 0.7,
    pattern: 'swing',
    bassDrumEnabled: true,
    bassDrumVolume: 0.7,
    snareEnabled: true,
    snareVolume: 0.8,
    hihatEnabled: true,
    hihatVolume: 0.65,
    hihatOpenness: 0,
    rideEnabled: true,
    rideVolume: 0.7,
    crashEnabled: true,
    crashVolume: 0.8,
    crashFrequency: 4,
    rimEnabled: false,
    rimVolume: 0.6,
    humanizeIntensity: 'med',
  },
};
```

## 8. Взаимодействие с другими инструментами

| Инструмент | Правило                                                 |
| ---------- | ------------------------------------------------------- |
| **Bass**   | Независимы. Барабаны не конфликтуют с басом по частотам |
| **Piano**  | Независимы. Барабаны — ритм, Piano — гармония           |
| **Rhodes** | Независимы. Разные частотные диапазоны                  |

Drums полностью независимы от других инструментов — используют свой `EventSink` (`'drums'`), не пересекаются с `noteSink`/`chordSink`.

## 9. Тесты

- `drumInstrument.test.ts` — все стили, backbeat, отключение звуков, humanization
- `drumRandomizer.test.ts` — детерминизм, уровни, fills, ghost-ноты
- `drumSampleRegistry.ts` — round-robin, имена файлов

---

_См. также: `docs/BASS.md` (бас), `docs/PIANO.md` (основная гармония)_
