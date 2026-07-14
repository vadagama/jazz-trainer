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

## 3. Стили и паттерны

Percussion работает только для **3 стилей**: `latin`, `bossa`, `funk`.
Для `swing` и `ballad` percussion отключён (`enabled: false`).

| Стиль    | Organism         | Описание                                                |
| -------- | ---------------- | ------------------------------------------------------- |
| `latin`  | `latin-default`  | Cascara + clave (son 3-2), tumbao, cowbell, montuno     |
| `bossa`  | `bossa-default`  | Бразильская текстура: shaker 8-ми, clave, conga, guiro   |
| `funk`   | `funk-default`   | Ровный текстурный бит: even 16-е shaker/tambourine, cowbell на 1/3. Humanize **off** |

Паттерны реализованы через pattern-engine (organism → cell → molecule → atom),
как и drum kit. См. `packages/plugins/instruments/percussion/` и
`packages/music-core/src/audio/percussionMolecules.ts`.

## 4. Настройки

```ts
interface PercussionInstrumentSettings {
  enabled: boolean;            // мастер-выключатель
  volume: number;              // общая громкость

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
    organismId: null,
    // ... per-sound defaults (см. DEFAULT_PERCUSSION_SETTINGS)
  },
  perStyleDefaults: {
    swing:  { enabled: false },
    bossa:  { organismId: 'bossa-default', enabled: true },
    funk:   { organismId: 'funk-default', enabled: true, humanizeIntensity: 'off' },
    latin:  { organismId: 'latin-default', enabled: true },
    ballad: { enabled: false },
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

- `percussionInstrument.test.ts` — organism-driven scheduling (latin/bossa/funk), per-sound настройки, humanization, degraded fallback
- `packages/plugins/instruments/percussion/src/manifest.test.ts` — per-style defaults (все 5 стилей), schema validation

---

_См. также: `docs/DRUMS.md` (барабаны), `docs/BASS.md` (бас)_
