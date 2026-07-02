# Percussion в джазовом тренажёре

> **Статус:** 🟢 Реализовано
> **Модуль:** `packages/music-core/src/audio/percussionInstrument.ts`
> **Манифест:** `percussionManifest.ts`

## 1. Роль перкуссии

Перкуссия — **unpitched инструмент** для латиноамериканской ритмической текстуры. В отличие от барабанов (которые держат основной groove), перкуссия добавляет этнический колорит и ритмическую плотность:

- **Cascara + Clave** — кубинская ритмическая основа
- **Bossa Texture** — бразильская текстурная перкуссия
- **Funk Accents** — синкопированные акценты для funk

## 2. Звуки (16 шт.)

### 2.1. Core (8 звуков, включены по умолчанию)

| Звук           | Функция                                     |
| -------------- | ------------------------------------------- |
| `congaHigh`    | Высокая конга — ритмический рисунок         |
| `congaLow`     | Низкая конга — басовые акценты              |
| `timbales`     | Тимбалес — металлические акценты            |
| `cowbell`      | Ковбелл — ритмический pulse                 |
| `clave`        | Клаве — ключевой ритмический паттерн         |
| `shaker`       | Шейкер — непрерывная текстурная пульсация    |
| `guiro`        | Гуиро — скребущий звук                      |
| `triangle`     | Треугольник — высокие акценты                |

### 2.2. Extended (8 звуков, отключены по умолчанию)

| Звук           | Функция                                     |
| -------------- | ------------------------------------------- |
| `bongoLow`     | Низкий бонго                                |
| `tumba`        | Тумба — глубокая конга                      |
| `cabasa`       | Кабаса — металлическая текстура             |
| `tambourine`   | Тамбурин — яркие акценты                    |
| `vibraslap`    | Вибраслэп — эффектный звук                  |
| `belltree`     | Колокольчики — нисходящее глиссандо         |
| `whistle`      | Свисток — сигнальные акценты                |
| `sleighBells`  | Бубенцы — праздничная текстура              |

## 3. Паттерны и стили

| Стиль    | Паттерн          | Описание                                         |
| -------- | ---------------- | ------------------------------------------------ |
| `swing`  | `cascara-clave`  | Кубинский cascara + clave для джазового контекста |
| `bossa`  | `bossa-texture`  | Бразильская текстурная перкуссия                  |
| `funk`   | `funk-accents`   | Синкопированные акценты для funk                  |
| `latin`  | `cascara-clave`  | Основной латиноамериканский ритм                  |
| `ballad` | `bossa-texture`  | Мягкая текстурная поддержка                       |

### 3.1. Cascara + Clave (cascara-clave)

Кубинская ритмическая основа: cascara на timbales/conga + clave-паттерн (3-2 или 2-3). Ядро латиноамериканского groove.

### 3.2. Bossa Texture (bossa-texture)

Бразильская текстурная перкуссия: shaker-пульсация восьмыми, guiro-акценты, треугольник на сильных долях.

### 3.3. Funk Accents (funk-accents)

Синкопированные акценты: cowbell на offbeat'ах, conga-слэпы, timbales-акценты.

## 4. Настройки

```ts
interface PercussionInstrumentSettings {
  enabled: boolean;            // мастер-выключатель
  volume: number;              // общая громкость
  pattern: PercussionPattern;  // 'cascara-clave' | 'bossa-texture' | 'funk-accents'

  // Core (8 звуков) — per-sound enable + volume
  congaHighEnabled: boolean;   congaHighVolume: number;
  congaLowEnabled: boolean;    congaLowVolume: number;
  timbalesEnabled: boolean;    timbalesVolume: number;
  cowbellEnabled: boolean;     cowbellVolume: number;
  claveEnabled: boolean;       claveVolume: number;
  shakerEnabled: boolean;      shakerVolume: number;
  guiroEnabled: boolean;       guiroVolume: number;
  triangleEnabled: boolean;    triangleVolume: number;

  // Extended (8 звуков) — отключены по умолчанию
  bongoLowEnabled: boolean;    bongoLowVolume: number;
  tumbaEnabled: boolean;       tumbaVolume: number;
  cabasaEnabled: boolean;      cabasaVolume: number;
  tambourineEnabled: boolean;  tambourineVolume: number;
  vibraslapEnabled: boolean;   vibraslapVolume: number;
  belltreeEnabled: boolean;    belltreeVolume: number;
  whistleEnabled: boolean;     whistleVolume: number;
  sleighBellsEnabled: boolean; sleighBellsVolume: number;

  humanizeIntensity: HumanizeIntensity;  // 'off' | 'low' | 'med' | 'high'
}
```

## 5. Humanization

| Уровень | Timing jitter |
| ------- | ------------- |
| `off`   | 0 мс          |
| `low`   | ±2 мс         |
| `med`   | ±4 мс         |
| `high`  | ±6 мс         |

## 6. Манифест

```ts
export const percussionManifest: InstrumentManifest = {
  id: 'percussion',
  name: 'Percussion',
  createInstrument: () => new PercussionInstrument(),
  sampleManifest: PERCUSSION_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.7,
    pattern: 'cascara-clave',
    // ... per-sound defaults (см. DEFAULT_PERCUSSION_SETTINGS)
  },
};
```

## 7. Взаимодействие с другими инструментами

| Инструмент     | Правило                                                           |
| -------------- | ----------------------------------------------------------------- |
| **Drums**      | Разные EventSink'и (`'drums'` vs `'percussion'`). Могут звучать вместе |
| **Modern Kit** | Аналогично drums — независимый EventSink                          |
| **Bass**       | Разные частотные диапазоны, не конфликтуют                         |

## 8. Тесты

- `percussionInstrument.test.ts` — все три паттерна, per-sound настройки, humanization, стилевая диспетчеризация

---

_См. также: `docs/DRUMS.md` (барабаны), `docs/BASS.md` (бас)_
