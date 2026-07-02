# Clarinet в джазовом тренажёре

> **Статус:** 🟢 Реализовано
> **Модуль:** `packages/music-core/src/audio/clarinetInstrument.ts`
> **Манифест:** `clarinetManifest.ts`

## 1. Роль кларнета

Кларнет — **монофонический деревянный духовой инструмент** для мелодических линий и контрапункта. В отличие от полифонических инструментов (Piano, Organ), играет одну ноту за раз:

- **Counterpoint:** контрапункт — независимая мелодическая линия, отвечающая гармонии
- **Melodic Phrases:** мелодические фразы из chord tones и passing tones

## 2. Паттерны

| Паттерн           | Описание                                                   | Стиль по умолчанию      |
| ----------------- | ---------------------------------------------------------- | ----------------------- |
| `counterpoint`    | 3 ноты на такт (beats 1, 2.5, 4), cycling через voicing    | swing, funk, ballad     |
| `melodicPhrases`  | Мелодические фразы из chord tones с passing tones          | bossa, latin            |

### 2.1. Counterpoint

```
| Dm7                       |
| ●     ●     ●             |  ← ноты на beats 1, 2.5, 4
```

3 ноты на такт, cycling через массив voicing-нот в alternating contour (вверх/вниз). Фразы строятся так, чтобы создавать независимую вторичную линию, контрастирующую с основной гармонией.

### 2.2. Melodic Phrases

Мелодические фразы на основе chord tones с добавлением passing tones (проходящих нот) между аккордовыми тонами. Создают более «вокальную», певучую линию.

## 3. Сэмплы

- **Источник:** CC0 clarinet samples
- **Velocity-слои:** 2 (soft — <0.5, hard — ≥0.5)
- **Диапазон:** D3–C6
- **Размещение:** `apps/web/public/samples/aac/clarinet/`

## 4. Voicing-движок

Использует общий с Piano voicing-движок (`buildPianoVoicing`) для получения пула нот. Из voicing'а выбираются отдельные ноты для монофонической линии. Поддерживаемые плотности: `shell2`, `rootless3`, `rootless4`. По умолчанию: `rootless3`.

## 5. Humanization

- **Timing jitter:** ±6 мс
- **Velocity variation:** ±0.05
- Отключается через `setHumanize(false)`
- При backward seek сбрасывается состояние: голосоведение, индекс фразы, направление контура

## 6. Манифест

```ts
export const clarinetManifest: InstrumentManifest = {
  id: 'clarinet',
  name: 'Clarinet',
  createInstrument: () => new ClarinetInstrument(new ChordTimeline()),
  sampleManifest: CLARINET_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.7,
    pattern: 'counterpoint',
    voicingDensity: 'rootless3',
  },
};
```

## 7. API

```ts
class ClarinetInstrument implements Instrument {
  setTimeline(timeline: ChordTimeline): void;
  setPattern(pattern: ClarinetPattern): void;          // 'counterpoint' | 'melodicPhrases'
  setVoicingDensity(density: PianoVoicingDensity): void;
  setBaseVelocity(velocity: number): void;              // [0, 2]
  setHumanize(enabled: boolean): void;
  setStyleProfile(profile: StyleProfile): void;         // стиле-зависимый паттерн
  setStyle(style: Style): void;                         // @deprecated
  reset(): void;                                        // сброс состояния
  schedule(window: ScheduleWindow, ctx: ScheduleContext): void;
}
```

## 8. Взаимодействие с другими инструментами

| Инструмент    | Правило                                                              |
| ------------- | -------------------------------------------------------------------- |
| **Piano**     | Кларнет монофонический (одна нота), Piano полифонический — дополняют |
| **Organ**     | Разные EventSink'и. Кларнет — мелодия, Organ — гармонический фон     |
| **Vibraphone**| Разные EventSink'и, не конфликтуют                                    |
| **Guitar**    | Разные EventSink'и, не конфликтуют                                    |

## 9. Тесты

- `clarinetInstrument.test.ts` — оба паттерна, стилевая диспетчеризация, humanization, backward seek

---

_См. также: `docs/PIANO.md` (voicing-движок), `docs/ORGAN.md` (родственный инструмент)_
