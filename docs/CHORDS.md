# CHORDS — Multi-Chord Bars & Swing Style

> **Назначение:** Документация по механизму multi-chord баров — поддержка нескольких аккордов в одном такте.
> **Аудитория:** Разработчики, AI-агенты.
> **Дата:** 2026-06-14

---

## 1. Что такое multi-chord бары

Jazz Trainer поддерживает запись нескольких аккордов в одном такте. Например:

```
| Dm7 G7 | Cmaj7 |
```

В первом такте — два аккорда (Dm7 и G7), по 2 доли каждый. DSL парсит это корректно: создаётся `Bar` с двумя `ChordSlot`'ами, каждому назначается `beats: 2`.

**Распределение долей:**

| `ChordSlot.beats` | Пример               | Распределение                 |
| ----------------- | -------------------- | ----------------------------- |
| `null`            | `\| Cmaj7 \|`        | 1 аккорд на такт              |
| `2`               | `\| Dm7 G7 \|`       | 2 аккорда по 2 доли (2+2)     |
| `2/1/1`           | `\| Dm7 G7 Cmaj7 \|` | 3 аккорда: 2+1+1              |
| `1`               | `\| C Am Dm G7 \|`   | 4 аккорда по 1 доле (1+1+1+1) |

---

## 2. Архитектурное решение: Sub-bar ChordTimeline

### 2.1. Модель данных

```ts
interface ChordTimelineEntry {
  barIndex: number;
  beatStart?: number; // 0-based, начало действия аккорда в такте
  beatEnd?: number; // exclusive, конец действия
  chord: ChordSymbol | null;
}
```

Для одного аккорда на такт `beatStart`/`beatEnd` опускаются — обратная совместимость.
Для multi-chord: каждая `ChordTimelineEntry` представляет один `ChordSlot`.

### 2.2. Резолвинг аккорда

```ts
// ChordTimeline.getChordAtTick(virtualTick, sig)
// Находит Entry, где beatStart <= beatInBar < beatEnd
```

Инструменты резолвят аккорд **на момент звучания ноты**, а не на начало такта. Это позволяет:

- На beat 2 в такте `| Dm7 G7 |` получить Dm7
- На beat 4 в том же такте получить G7

### 2.3. Следующий аккорд (chordRef: 'next')

```ts
// ChordTimeline.getNextChord(tick, sig)
// Сканирует вперёд с шагом в 1 долю (до 2 тактов), возвращает первый отличающийся аккорд
```

Используется в паттернах `anticipation-4and` и `four-and-sparse`. Теперь `'next'` означает «следующий аккорд по timeline» (внутри такта или в следующем), а не «следующий такт».

### 2.4. Сборка: `buildChordTimelineEntries`

Функция в `apps/web/src/hooks/useTransport.ts` раскладывает все `ChordSlot`'ы в timeline-entries:

- 1 аккорд → одна entry без beatStart/beatEnd (backward compat)
- 2+ аккордов → по одной entry на каждый, с вычисленными beatStart/beatEnd

---

## 3. Поведение инструментов

### 3.1. Bass

| Комплексити | 1 аккорд/такт                   | 2 аккорда/такт              | 4 аккорда/такт                   |
| ----------- | ------------------------------- | --------------------------- | -------------------------------- |
| 1–2         | Root на каждой доле             | Root каждого аккорда        | Root на каждой доле              |
| 3–4         | Root (сильные) + fifth (слабые) | Root + fifth на границах    | Root на сильных, fifth на слабых |
| 5–6         | Walking: root-3rd-5th-approach  | Root-approach-root-approach | Root каждого аккорда             |
| 7           | Все аккордовые тона по долям    | Dense chord tones           | Все доли — root                  |

**Ключевое изменение:** approach note теперь резолвится к **следующему аккорду внутри такта** (через `getNextChord`), а не к следующему такту.

**BassRandomizer:** для 3–4 аккордных баров может переключаться в sparse-режим (половинные вместо четвертей) с октавными прыжками. Варианты approach: chromatic above, chromatic below, diatonic.

### 3.2. Piano

Каждый `CompEvent` резолвит аккорд на момент своего звучания:

```ts
const eventTicks = barStartTicks + (event.beat - 1) * tpBeat + subdivTicks;
const chord =
  event.chordRef === 'next'
    ? this.timeline.getNextChord(eventTicks, sig)
    : this.timeline.getChordAtTick(eventTicks, sig);
```

**Профили при multi-chord:**

- `basie-2-4`: beat 2 = первый аккорд, beat 4 = второй аккорд ✓
- `charleston`: beat 1 = первый аккорд, beat 2& = задержанный первый (или второй, если аккорд уже сменился)
- `halfNotes`: beat 1 = первый, beat 3 = резолвится по позиции
- `quarter-comp` (адаптивный): 4 доли, каждая с новым voicing'ом (для 3+ аккордов в такте)

**Voice leading:** `prevVoicing` обновляется для каждого события, обеспечивая плавное голосоведение даже при смене аккорда внутри такта.

### 3.3. Rhodes (комплементарный слой)

Аналогично Piano — каждый `CompEvent` резолвит аккорд на момент звучания. `chordRef: 'next'` использует `getNextChord`.

Особенности комплементарных слоёв при multi-chord:

- `pads` (wholeNotes): берёт первый аккорд такта (целая нота)
- `ambient-swells`: тоже первый (длинный пэд)
- `subtle-offbeats`, `high-comping`, `stab-accents`: резолвят по позиции

---

## 4. Voice leading при multi-chord

Алгоритм `buildPianoVoicing` / `buildVoicing` выбирает кандидат с минимальным суммарным движением голосов относительно `prevVoicing`. Это работает для любых переходов, включая внутритактовые:

- Событие на beat 2 (Dm7) → voicing для Dm7, `prevVoicing` = voicing Dm7
- Событие на beat 4 (G7) → voicing для G7, `prevVoicing` = voicing Dm7 → voice leading от Dm7 к G7

---

## 5. Примеры

### 5.1. `| Dm7 G7 | Cmaj7 |` (swing, Bass c5–6 + Piano swing-sparse)

**Bass:**
| Доля | Аккорд | Нота | Логика |
| ---- | ------ | ---- | ------ |
| 1 | Dm7 | D2 | Root |
| 2 | Dm7 | Ab | Approach к G7 (from above, even bar) |
| 3 | G7 | G2 | Root |
| 4 | G7 | F | Seventh (нет следующего аккорда) |
| 5 | Cmaj7 | C2 | Root |
| 6 | Cmaj7 | E3 | Third |
| 7 | Cmaj7 | G2 | Fifth |
| 8 | Cmaj7 | B | Seventh (нет следующего) |

**Piano (swing-sparse, bar 0 = basie-2-4):**

- beat 2: Dm7 voicing
- beat 4: G7 voicing

### 5.2. `| Dm7 G7 Cmaj7 A7 |` (turnaround, 4 аккорда)

**Bass (c5–6):** каждая доля — root своего аккорда (D2, G2, C2, A2).

**Piano (адаптивный quarter-comp):** 4 доли, каждая с voicing'ом своего аккорда.

---

## 6. Обратная совместимость

- Все существующие гриды с 1 аккордом на такт работают без изменений.
- `ChordTimelineEntry` без `beatStart`/`beatEnd` → весь такт (поведение как раньше).
- Все существующие тесты (704 теста) проходят.

---

## 7. Тестирование

- **Unit-тесты ChordTimeline:** `packages/music-core/src/audio/chordTimeline.test.ts` (sub-bar resolution, getNextChord, getChordCountInBar)
- **Unit-тесты инструментов:** multi-chord секции в `bassInstrument.test.ts`, `pianoInstrument.test.ts`, `rhodesInstrument.test.ts`
- **Интеграционные тесты:** `packages/music-core/src/audio/multiChordIntegration.test.ts` (полный цикл Bass + Piano + Rhodes, edge cases)
- **Сборка timeline:** тестируется опосредованно через интеграционные тесты инструментов

---

_Документ создан 2026-06-14. Отражает механизм sub-bar ChordTimeline и multi-chord поддержку._
