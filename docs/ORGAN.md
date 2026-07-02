# Organ в джазовом тренажёре

> **Статус:** 🟢 Реализовано
> **Модуль:** `packages/music-core/src/audio/organInstrument.ts`
> **Манифест:** `organManifest.ts`

## 1. Роль органа

Орган — **Hammond-style полифонический инструмент** для плотных аккордовых подкладов и ритмических stabs. Добавляет тёплый, насыщенный гармонический слой:

- **Pads:** целые ноты — sustained фон
- **Stabs:** короткие аккорды на восьмых offbeat'ах — ритмические акценты
- **Pads+Stabs:** комбинированный режим — pads на beat 1 + stabs на offbeat'ах

> Первая версия без Leslie-эмуляции и percussion click.

## 2. Паттерны

| Паттерн      | Описание                                                   | Стиль по умолчанию |
| ------------ | ---------------------------------------------------------- | ------------------ |
| `pads`       | Целая нота на beat 1, длительность 0.92 такта              | swing, bossa, latin, ballad |
| `stabs`      | Короткие аккорды (0.15 длительности) на 2&, 3&, 4&         | —                  |
| `pads-stabs` | pads на beat 1 + stabs на offbeat'ах                       | funk               |

### 2.1. Pads

```
| Dm7                       |
| ● (sustained, 0.92 bar)   |  ← плотный аккорд на весь такт
```

Voicing через `buildPianoVoicing()` с плотностью `rootless4` по умолчанию (4 ноты для толстой гармонической текстуры).

### 2.2. Stabs

```
| Dm7               |
|   ●   ●   ●       |  ← короткие аккорды на 2&, 3&, 4&
```

Длительность: 0.15 от длительности доли. Velocity: 0.55 × baseVelocity (ярче, чем pads).

### 2.3. Pads+Stabs

Комбинация: pads на beat 1 + stabs на offbeat'ах в одном такте. Создаёт плотную ритмическую текстуру, характерную для funk.

## 3. Сэмплы

- **Источник:** CC0 Hammond-style organ samples
- **Velocity-слои:** 2 (soft — <0.5, hard — ≥0.5)
- **Диапазон:** C2–C7
- **Размещение:** `apps/web/public/samples/aac/organ/`

## 4. Voicing-движок

Использует общий с Piano voicing-движок (`buildPianoVoicing`). По умолчанию плотность `rootless4` — 4 ноты для максимальной гармонической плотности. Voice leading с направленным bias (вниз 0.7×, вверх 1.3×).

## 5. Humanization

- **Timing jitter:** ±6 мс
- **Velocity variation:** ±0.05
- Отключается через `setHumanize(false)`
- При backward seek состояние голосоведения сбрасывается

## 6. Манифест

```ts
export const organManifest: InstrumentManifest = {
  id: 'organ',
  name: 'Organ',
  createInstrument: () => new OrganInstrument(new ChordTimeline()),
  sampleManifest: ORGAN_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.65,
    pattern: 'pads',
    voicingDensity: 'rootless4',
  },
};
```

По умолчанию орган отключён — включается пользователем.

## 7. API

```ts
class OrganInstrument implements Instrument {
  setTimeline(timeline: ChordTimeline): void;
  setPattern(pattern: OrganPattern): void;              // 'pads' | 'stabs' | 'pads-stabs'
  setVoicingDensity(density: PianoVoicingDensity): void;
  setBaseVelocity(velocity: number): void;               // [0, 2]
  setHumanize(enabled: boolean): void;
  setStyleProfile(profile: StyleProfile): void;          // стиле-зависимый паттерн
  setStyle(style: Style): void;                          // @deprecated
  reset(): void;                                         // сброс голосоведения
  schedule(window: ScheduleWindow, ctx: ScheduleContext): void;
}
```

## 8. Взаимодействие с другими инструментами

| Инструмент    | Правило                                                          |
| ------------- | ---------------------------------------------------------------- |
| **Piano**     | Разные EventSink'и. Орган — фоновый pads, Piano — активный компинг |
| **Vibraphone**| Разные EventSink'и. Оба pads-инструменты, орган плотнее (rootless4 vs rootless3) |
| **Bass**      | Орган в среднем/верхнем регистре (C2–C7), не конфликтует с басом    |

## 9. Тесты

- `organInstrument.test.ts` — все три паттерна, стилевая диспетчеризация, humanization, backward seek

---

_См. также: `docs/PIANO.md` (voicing-движок), `docs/VIBRAPHONE.md` (родственный pads-инструмент)_
