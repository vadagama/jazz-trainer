# Grand Piano в джазовом тренажёре

> **Статус:** 🟢 Реализовано
> **Модуль:** `packages/music-core/src/audio/pianoInstrument.ts`
> **Манифесты:** `pianoManifest.ts` (Upright KW), `salamanderManifest.ts` (Salamander Grand)

## 1. Роль Grand Piano в аранжировке

Grand Piano — **основной гармонический инструмент** в аранжировке Jazz Trainer. В отличие от Rhodes, который выполняет роль комплементарного слоя, Grand Piano берёт на себя ведущую гармоническую партию:

- **Гармоническая опора:** полные аккордовые voicing'и — shell2, rootless3, rootless4, quartal
- **Ритмический драйв:** составные 4-тактовые профили компинга из простых паттернов («кирпичиков»)
- **Голосоведение:** плавные переходы с минимальным движением голосов и гравитационным смещением вниз
- **Вариативность:** встроенный детерминированный рандомайзер для естественного звучания

## 2. Grand Piano + Rhodes: основной + комплементарный слой

| Аспект    | Grand Piano                        | Rhodes                       |
| --------- | ---------------------------------- | ---------------------------- |
| Роль      | Основная гармония                  | Текстурный слой              |
| Ритм      | Активный компинг (профили)         | Разреженный (pads, offbeats) |
| Регистр   | C3–C6 (полный)                     | C4–C6 (средний/верхний)      |
| Voicings  | shell2/rootless3/rootless4/quartal | shell2/rootless3/rootless4   |
| Активация | Всегда основной                    | Опциональный слой            |

**Правила избегания конфликтов** (`pianoRhodesInteraction.ts`):

- Rhodes не играет в том же ритмическом слоте (±1/16), что и Grand Piano
- При конфликте Rhodes-событие сдвигается на 1/16 позже
- Громкость конфликтующего Rhodes снижается на 30%
- Rhodes-режимы `pads` и `ambient-swells` специально спроектированы для работы поверх Grand Piano

## 3. Сэмплы

### 3.1. Upright KW (по умолчанию)

- **Источник:** UprightPianoKW-SFZ-20220221 (CC0, FreePats) — вертикальное пианино Kawai
- **Формат:** AAC (`.m4a`) с MP3-фолбэком
- **Velocity-слои:** 2 (`soft` — до 0.5, `hard` — от 0.5)
- **Охват:** A0–C8, анкерные ноты через малую терцию
- **Размещение:** `apps/web/public/samples/aac/piano/upright/`

### 3.2. Salamander Grand Piano

- **Источник:** Salamander Grand Piano (Yamaha C5, 16 velocity layers в оригинале)
- **Формат:** AAC (`.m4a`) с MP3-фолбэком
- **Velocity-слои:** 3 (`p` — до 0.4, `mf` — до 0.7, `f` — от 0.7)
- **Охват:** A0–C7, анкерные ноты через малую терцию
- **Размещение:** `apps/web/public/samples/aac/piano/salamander/`

Обе библиотеки используют одинаковый `PianoInstrument` — различаются только `SampleManifest`.

## 4. Voicing-движок

### 4.1. Типы voicing'ов

| Voicing     | Нот | Состав                              | Для каких аккордов |
| ----------- | --- | ----------------------------------- | ------------------ |
| `shell2`    | 2   | 3-й + 7-й тон                       | Все типы           |
| `rootless3` | 3   | 3 + 7 + 9 (color tone)              | Все типы           |
| `rootless4` | 4   | 3 + 7 + 9 + 13                      | Все типы           |
| `quartal`   | 3–4 | Квартовые стеки (McCoy Tyner style) | Все типы           |

### 4.2. Интервальные таблицы

Алгоритм `voicingIntervals()` возвращает интервалы от root для каждого типа аккорда:

| Аккорд | shell2 | rootless3 | rootless4 | quartal                     |
| ------ | ------ | --------- | --------- | --------------------------- |
| Maj7   | 4, 11  | 4, 11, 14 | +19       | стек от 3-й: 4, 9, 14, 19   |
| m7     | 3, 10  | 3, 10, 14 | +19       | стек от b3: 3, 8, 13, 18    |
| Dom7   | 4, 10  | 4, 10, 14 | +21       | стек от 3-й                 |
| m7b5   | 3, 10  | 3, 10, 13 | +18       | стек от b7: 10, 15, 20      |
| Dim7   | 3, 9   | 3, 6, 9   | +12       | симметричный: 9, 14, 19, 24 |

### 4.3. Построение voicing'а

1. Для заданного аккорда и плотности определяются интервалы
2. Генерируются все уникальные перестановки pitch-классов в регистре C3–C6
3. Отбрасываются варианты с размахом >24 полутонов
4. При наличии предыдущего voicing'а — выбирается кандидат с минимальным voice-leading расстоянием

## 5. Голосоведение (Voice Leading)

Алгоритм `buildPianoVoicing()` реализует направленное голосоведение:

1. **Минимальное движение:** сумма полутоновых перемещений всех голосов между voicing'ами
2. **Направленный bias:**
   - Движение **вниз** стоит 0.7× (дешевле — поощряется)
   - Движение **вверх** стоит 1.3× (дороже)
3. **Мягкий потолок (C5, MIDI 72):** когда верхний голос выше C5, движение вверх стоит 2.0×
4. **Жёсткий потолок (MIDI 80):** если voicing упирается в C6, сбрасывается в root-position
5. **При равной дистанции:** выбирается более узкий (меньший span) voicing

Это создаёт естественное «гравитационное» смещение вниз, предотвращая бесконечный дрейф вверх.

## 6. Профили компинга

### 6.1. Простые паттерны («кирпичики»)

16 паттернов в `pianoComping.ts`. Каждый — массив `CompEvent` (beat, subdivision, durationBeats, velocity):

| Паттерн              | Доли       | Описание            |
| -------------------- | ---------- | ------------------- |
| `charleston`         | 1, 2&      | Charleston rhythm   |
| `reverse-charleston` | 1&, 3      | Reverse Charleston  |
| `basie-2-4`          | 2, 4       | Basie-style 2 & 4   |
| `offbeat-2-4`        | 2&, 4&     | Offbeat акценты     |
| `anticipation-4and`  | 4& (next)  | Антиципация         |
| `one-twoand-four`    | 1, 2&, 4   | 3-hit паттерн       |
| `oneand-three`       | 1&, 3      | Offbeat + downbeat  |
| `twoand-only`        | 2&         | Минимальный         |
| `four-and-sparse`    | 4& (next)  | Редкая антиципация  |
| `two-threeand`       | 2, 3&      | Средний драйв       |
| `halfNotes`          | 1, 3       | Половинные          |
| `quarterNotes`       | 1, 2, 3, 4 | Четверти            |
| `quarter-comp`       | 1, 2, 3, 4 | Плотные четверти    |
| `two-and-four`       | 2, 4       | Акценты на backbeat |
| `one-three`          | 1, 3       | Сильные доли        |
| `wholeNotes`         | 1          | Целые               |
| `rest`               | —          | Пауза               |

### 6.2. Составные профили (5 шт.)

Каждый профиль — 4-тактовая последовательность «кирпичиков»:

| Профиль         | Сложность | Такт 1      | Такт 2          | Такт 3             | Такт 4            | Стиль по умолчанию |
| --------------- | --------- | ----------- | --------------- | ------------------ | ----------------- | ------------------ |
| `swing-sparse`  | 1         | basie-2-4   | charleston      | basie-2-4          | halfNotes         | swing, bossa       |
| `swing-medium`  | 2         | charleston  | one-twoand-four | reverse-charleston | oneand-three      | —                  |
| `basie-light`   | 1         | basie-2-4   | rest            | basie-2-4          | twoand-only       | latin              |
| `offbeat-push`  | 3         | offbeat-2-4 | two-threeand    | offbeat-2-4        | anticipation-4and | funk               |
| `beginner-safe` | 1         | halfNotes   | wholeNotes      | halfNotes          | wholeNotes        | ballad             |

## 7. Адаптивный режим (adaptiveProfile)

При `setAdaptiveProfile(true)` плотность автоматически повышается для multi-chord тактов:

- 3+ аккорда в такте → `quarter-comp` (все 4 доли)
- 2 аккорда в такте → `two-and-four` (2 и 4 доли)

## 8. Рандомайзер (PianoRandomizer)

Встроенный в `PianoInstrument` рандомайзер добавляет естественную вариативность. **Детерминирован** — seed от `barIndex`.

| Уровень    | Шанс изменений |
| ---------- | -------------- |
| `off`      | 0%             |
| `subtle`   | 10%            |
| `moderate` | 25%            |
| `high`     | 40%            |

**Операции (применяются последовательно):**

1. **Skip beats** — пропуск неакцентных долей (beat 1 никогда не пропускается)
2. **Eighth shifts** — сдвиг долей на восьмую (35% от базового шанса)
3. **Anticipations** — антиципации на beat 3–4 (только если есть следующий аккорд)
4. **Passing chords** — короткие проходящие аккорды на beat 4.5 (30% от базового шанса)
5. **Voicing variation** — переключение между shell2 ↔ rootless4 (50% от базового шанса)

## 9. Humanization

- **Timing jitter:** ±6 мс (преобразуется в тики: `0.006 * (bpm / 60) * PPQ`)
- **Velocity variation:** ±0.05
- Отключается через `setHumanize(false)`

## 10. Манифесты

```ts
// pianoManifest.ts — Upright KW (по умолчанию)
export const pianoManifest: InstrumentManifest = {
  id: 'piano',
  name: 'Upright Piano KW',
  createInstrument: () => new PianoInstrument(new ChordTimeline()),
  sampleManifest: UPRIGHT_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.7,
    profile: 'swing-sparse',
    voicingDensity: 'rootless3',
    sampleLibrary: 'upright-kw',
  },
};

// salamanderManifest.ts — Salamander Grand Piano
export const salamanderManifest: InstrumentManifest = {
  id: 'piano',
  name: 'Salamander Grand Piano',
  createInstrument: () => new PianoInstrument(new ChordTimeline()),
  sampleManifest: SALAMANDER_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.7,
    profile: 'swing-sparse',
    voicingDensity: 'rootless3',
    sampleLibrary: 'salamander',
  },
};
```

Оба манифеста используют один и тот же `PianoInstrument`. Разница — в сэмплах и настройках по умолчанию.

## 11. API

```ts
class PianoInstrument implements Instrument {
  setTimeline(timeline: ChordTimeline): void;
  setProfile(profileId: CompingProfileId): void;
  setVoicingDensity(density: PianoVoicingDensity): void; // shell2|rootless3|rootless4|quartal
  setBaseVelocity(velocity: number): void; // [0, 2]
  setHumanize(enabled: boolean): void;
  setStyle(style: Style): void; // меняет профиль по умолчанию
  setRandomizationLevel(level: PianoRandomizationLevel): void;
  setAdaptiveProfile(enabled: boolean): void; // авто-повышение плотности
  reset(): void; // сброс голосоведения
  dispose(): void;
  schedule(window: ScheduleWindow, ctx: ScheduleContext): void;
}
```

## 12. Тесты

- `pianoInstrument.test.ts` — ≥25 тестов: все профили, voicing-типы, голосоведение, humanization
- `pianoRandomizer.test.ts` — ≥15 тестов: детерминизм, уровни, операции
- `pianoVoicing.ts` — генерация voicing'ов для всех типов аккордов
- `pianoRhodesInteraction.test.ts` — избегание конфликтов

---

_См. также: `docs/RHODES.md` (комплементарный слой), `docs/BASS.md` (бас)_
