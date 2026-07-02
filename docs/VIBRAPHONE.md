# Vibraphone в джазовом тренажёре

> **Статус:** 🟢 Реализовано
> **Модуль:** `packages/music-core/src/audio/vibraphoneInstrument.ts`
> **Манифест:** `vibraphoneManifest.ts`

## 1. Роль вибрафона

Вибрафон — **полифонический pitched-инструмент** для аккордовых подкладов (pads) и арпеджированных вставок (inserts). Добавляет тёплую, «звенящую» текстуру в аранжировку:

- **Pads:** целые ноты на beat 1 — мягкий гармонический фон
- **Inserts:** арпеджированные ноты, cycling через voicing — ритмические вставки

Характерное vibrato (LFO на амплитуде) и мягкая атака (~0.15–0.3s) применяются на уровне аудио-движка (Tone.js Vibrato + огибающая Sampler).

## 2. Паттерны

| Паттерн   | Описание                                               | Стиль по умолчанию |
| --------- | ------------------------------------------------------ | ------------------ |
| `pads`    | Целая нота на beat 1, длительность 0.9 такта           | swing, bossa, funk, ballad |
| `inserts` | Арпеджио: 4 ноты на такт (beats 1, 2, 3, 4), cycling  | latin              |

### 2.1. Pads

```
| Dm7                       |
| ● (whole note, 0.9 bar)   |  ← один аккорд на такт
```

Voicing строится через `buildPianoVoicing()` (общий с Piano voicing-движок). Velocity: 0.5 × baseVelocity. При humanize: ±6 мс jitter, ±0.05 velocity variation.

### 2.2. Inserts

```
| Dm7               |
| ●   ●   ●   ●     |  ← по одной ноте из voicing'а на каждую долю
```

4 ноты на такт, cycling через массив voicing-нот. Индекс сбрасывается при backward seek (перемотка назад).

## 3. Сэмплы

- **Источник:** CC0 vibraphone samples
- **Velocity-слои:** 2 (soft — <0.5, hard — ≥0.5)
- **Диапазон:** C3–C6
- **Размещение:** `apps/web/public/samples/aac/vibraphone/`

## 4. Voicing-движок

Использует общий с Piano voicing-движок (`buildPianoVoicing`). Поддерживаемые плотности:

| Плотность    | Нот | Состав               |
| ------------ | --- | -------------------- |
| `shell2`     | 2   | 3-й + 7-й тон        |
| `rootless3`  | 3   | 3 + 7 + 9            |
| `rootless4`  | 4   | 3 + 7 + 9 + 13       |

По умолчанию: `rootless3`. Voice leading с направленным bias (вниз 0.7×, вверх 1.3×) как у Piano.

## 5. Humanization

- **Timing jitter:** ±6 мс
- **Velocity variation:** ±0.05
- Отключается через `setHumanize(false)`
- При backward seek (перемотка назад) состояние голосоведения и индекс insert сбрасываются

## 6. Манифест

```ts
export const vibraphoneManifest: InstrumentManifest = {
  id: 'vibraphone',
  name: 'Vibraphone',
  createInstrument: () => new VibraphoneInstrument(new ChordTimeline()),
  sampleManifest: VIBRAPHONE_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.65,
    pattern: 'pads',
    voicingDensity: 'rootless3',
  },
};
```

По умолчанию вибрафон отключён — включается пользователем как опциональный слой.

## 7. API

```ts
class VibraphoneInstrument implements Instrument {
  setTimeline(timeline: ChordTimeline): void;
  setPattern(pattern: VibraphonePattern): void;     // 'pads' | 'inserts'
  setVoicingDensity(density: PianoVoicingDensity): void;
  setBaseVelocity(velocity: number): void;            // [0, 2]
  setHumanize(enabled: boolean): void;
  setStyleProfile(profile: StyleProfile): void;       // стиле-зависимый паттерн
  setStyle(style: Style): void;                       // @deprecated
  reset(): void;                                      // сброс голосоведения
  schedule(window: ScheduleWindow, ctx: ScheduleContext): void;
}
```

## 8. Взаимодействие с другими инструментами

| Инструмент | Правило                                                      |
| ---------- | ------------------------------------------------------------ |
| **Piano**  | Разные EventSink'и. Вибрафон — текстурный слой, Piano — основной |
| **Organ**  | Разные EventSink'и. Оба pads-инструменты, дополняют друг друга  |
| **Bass**   | Вибрафон в среднем регистре (C3–C6), не конфликтует с басом      |

## 9. Тесты

- `vibraphoneInstrument.test.ts` — оба паттерна, стилевая диспетчеризация, humanization, backward seek

---

_См. также: `docs/PIANO.md` (voicing-движок), `docs/ORGAN.md` (родственный pads-инструмент)_
