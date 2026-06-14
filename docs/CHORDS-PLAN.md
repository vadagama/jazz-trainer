# CHORDS-PLAN — Multi-Chord Bars & Swing Style Refinement

**Дата:** 2026-06-14
**Статус:** 🟡 Черновик
**Контекст:** Анализ стилей/паттернов bass, piano, rhodes + план изменений для swing, чтобы при смене аккордов внутри такта (1–4 аккорда на такт) отыгрывались адекватные паттерны.

---

## 1. Анализ текущего состояния

### 1.1. Как устроена модель данных

```
Bar { chords: ChordSlot[] }
ChordSlot { symbol, parsed, beats: number|null }
```

- `beats` = null → 1 аккорд на такт (весь такт).
- `beats` = 2 → 2 аккорда по 2 доли (2+2).
- `beats` = 2/1/1 → 3 аккорда: первый 2 доли, остальные по 1 (2+1+1).
- `beats` = 1 → 4 аккорда по 1 доле (1+1+1+1).

DSL `| Dm7 G7 | Cmaj7 |` парсится корректно — создаётся Bar с двумя ChordSlot'ами, каждому назначается `beats: 2`.

### 1.2. Корень проблемы: ChordTimeline — побаровый, не подольный

```ts
// chordTimeline.ts — текущая реализация
getChordAtTick(virtualTick: number, sig: TimeSignature): ChordSymbol | null {
  const tpBar = ticksPerBar(sig);
  const virtualBar = Math.floor(virtualTick / tpBar);
  return this.entries[virtualBar]?.chord ?? null;  // ← один аккорд на такт
}
```

`ChordTimelineEntry` хранит ровно **один** `chord` на такт. Нет понятия «на какой доле внутри такта какой аккорд активен».

### 1.3. Точка потери данных: `buildChordTimelineEntries`

```ts
// apps/web/src/hooks/useTransport.ts:155
const slot = allBars[originalBarIdx]?.chords[0];  // ← только первый!
```

Даже если в баре 2, 3 или 4 ChordSlot'а — берётся **только `chords[0]`**. Остальные игнорируются. Это и есть первопричина.

### 1.4. Как это проявляется в инструментах

| Инструмент | Разрешение аккорда | Multi-chord behaviour | Проблема |
|---|---|---|---|
| **Bass** | `getChordAtTick(atTicks, sig)` на каждой доле | Все доли получают **один и тот же** аккорд (первый в баре) | Walking bass на `\| Dm7 G7 \|` играет все 4 доли под Dm7; G7 не слышен |
| **Piano** | `getChordAtTick(barStartTicks, sig)` раз в такт | Весь такт — один voicing | `anticipation-4and` с `chordRef: 'next'` смотрит на **следующий такт**, а не на второй аккорд внутри текущего |
| **Rhodes** | Аналогично Piano | Аналогично | `chordRef: 'next'` = следующий такт, пропуская G7 внутри `\| Dm7 G7 \|` |

### 1.5. Детальный разбор: Bass swing walking (complexity 5–6)

Текущий паттерн (для 4/4, один аккорд на такт):

| Доля | Нота | Логика |
|---|---|---|
| 1 | Root | `resolveRootNote(chord, octave)` |
| 2 | Third | `resolveThirdNote(chord, ...)` |
| 3 | Fifth | `resolveFifthNote(chord, ...)` |
| 4 | Approach | Хроматический подход к root **следующего такта** |

**Что должно быть при `| Dm7 G7 | Cmaj7 |` (2+2):**

| Доля | Аккорд | Нота | Логика |
|---|---|---|---|
| 1 | Dm7 | Root (D) | Первый аккорд такта |
| 2 | Dm7 | Third (F) или Approach к G7 | Переход внутрь такта |
| 3 | G7 | Root (G) | **Второй аккорд такта** ← сейчас пропускается |
| 4 | G7 | Approach к C (из G7) | Подход к следующему такту **из контекста G7** |

При 3 и 4 аккордах на такт логика ещё более дробная: нужна адаптивная walking-линия, которая уважает границы аккордов внутри такта.

### 1.6. Детальный разбор: Piano swing-sparse

Профиль `swing-sparse` (4-тактовый цикл):

| Такт | Паттерн | События |
|---|---|---|
| 1 | `basie-2-4` | beat 2, beat 4 |
| 2 | `charleston` | beat 1, beat 2& |
| 3 | `basie-2-4` | beat 2, beat 4 |
| 4 | `halfNotes` | beat 1, beat 3 |

**Проблема при `| Dm7 G7 |` (такт 1, basie-2-4):**
- beat 2: должно быть Dm7 (✓ попадает на первый аккорд)
- beat 4: должно быть G7 (✓ должно попадать на второй аккорд)
- **Сейчас оба — Dm7**, потому что аккорд резолвится один раз на начало такта

**Проблема при `| Dm7 G7 |` (такт 2, charleston):**
- beat 1: Dm7 (?), но если это уже другой такт — то следующий аккорд
- beat 2&: задержка — здесь нужно резолвить аккорд по позиции

### 1.7. Детальный разбор: Rhodes (комплементарный слой)

Те же проблемы, что у Piano. Дополнительно:
- `chordRef: 'next'` в паттернах (`anticipation-4and`, `four-and-sparse`) резолвится как `getChordAtTick((bar + 1) * tpBar)` — **следующий такт**, а не следующий аккорд внутри такта.
- Voice leading между аккордами: prevVoicing обновляется при каждой смене аккорда внутри такта — это корректно, **если** аккорд правильно резолвится.

---

## 2. Целевой механизм

### 2.1. Принципы

1. **Sub-bar chord resolution:** каждый инструмент резолвит аккорд на **момент звучания ноты**, а не на начало такта.
2. **Обратная совместимость:** поведение для 1 аккорда на такт не меняется.
3. **Контекстно-зависимые паттерны:** для 2, 3, 4 аккордов на такт инструменты выбирают/адаптируют паттерны, уважая границы аккордов.
4. **Voice leading сохраняется:** `prevVoicing` обновляется при каждой смене аккорда (в том числе внутри такта), обеспечивая плавное голосоведение.

### 2.2. Архитектурное решение: ChordTimeline с поддержкой sub-bar

**Вариант A (рекомендуемый): Расширить ChordTimeline до «событийной» модели**

```ts
interface ChordTimelineEntry {
  barIndex: number;
  /** Beat within the bar (0-based) where this chord becomes active. */
  beatStart: number;
  /** Beat within the bar (exclusive) where this chord ends. */
  beatEnd: number;
  chord: ChordSymbol | null;
}
```

Новый метод `getChordAtTick` резолвит аккорд по `(barIndex, beatInBar)`:

```ts
getChordAtTick(virtualTick: number, sig: TimeSignature): ChordSymbol | null {
  const tpBar = ticksPerBar(sig);
  const tpBeat = ticksPerBeat(sig);
  const bar = Math.floor(virtualTick / tpBar);
  const beatInBar = ((virtualTick % tpBar) / tpBeat) | 0;
  // Ищем ChordTimelineEntry, где beatStart <= beatInBar < beatEnd
  for (const e of entriesForBar(bar)) {
    if (beatInBar >= e.beatStart && beatInBar < e.beatEnd) return e.chord;
  }
  return null;
}
```

`buildChordTimelineEntries` раскладывает ChordSlot'ы в timeline-entries:

```ts
function buildChordTimelineEntries(sections: Section[], flatBars: number[]): ChordTimelineEntry[] {
  const allBars = sections.flatMap(s => s.bars);
  const result: ChordTimelineEntry[] = [];
  
  for (const barIdx of flatBars) {
    const bar = allBars[barIdx];
    if (!bar) { result.push({ barIndex: barIdx, beatStart: 0, beatEnd: 4, chord: null }); continue; }
    
    const beatsPerBar = 4; // из time signature
    const chords = bar.chords;
    
    if (chords.length === 0) {
      result.push({ barIndex: barIdx, beatStart: 0, beatEnd: beatsPerBar, chord: null });
      continue;
    }
    
    let beatCursor = 0;
    for (const slot of chords) {
      const chordBeats = slot.beats ?? Math.floor(beatsPerBar / chords.length);
      const resolvedBeatEnd = Math.min(beatCursor + chordBeats, beatsPerBar);
      const chord = slot.parsed ?? (slot.symbol ? parseChord(slot.symbol).value ?? null : null);
      
      result.push({
        barIndex: barIdx,
        beatStart: beatCursor,
        beatEnd: resolvedBeatEnd,
        chord: chord,
      });
      
      beatCursor = resolvedBeatEnd;
    }
  }
  return result;
}
```

**Вариант B (упрощённый): Передать массив ChordSlot'ов прямо в инструменты**

Меньше изменений в `ChordTimeline`, но каждый инструмент должен сам парсить слоты. Вариант A предпочтительнее — один источник правды для всех инструментов.

**Решение: Вариант A.**

### 2.3. Инструменты: изменения для swing

#### 2.3.1. Bass — swing (complexity 5–6, walking bass)

Логика четвертных нот сохраняется, но меняется резолвинг аккорда и логика approach:

```ts
// Для каждой доли резолвим аккорд:
const chord = this.timeline.getChordAtTick(atTicks, sig); // теперь sub-bar!

// beat 0 (доля 1): root текущего аккорда
// beat 1 (доля 2): 
//   - если аккорд тот же: third
//   - если аккорд сменился на этой доле: root нового аккорда
// beat 2 (доля 3):
//   - если аккорд сменился: root нового
//   - иначе: fifth (или approach если это последний аккорд такта)
// beat 3 (доля 4):
//   - если аккорд сменился на этой доле: root нового
//   - иначе: approach к следующему аккорду

function resolveWalkingNote(
  chord: ChordSymbol,
  beatInBar: number,
  beatInChord: number,
  chordsInBar: number,
  isLastBeatOfChord: boolean,
  nextChord: ChordSymbol | null,
  os: number,
): string {
  // beatInChord — номер доли внутри текущего аккорда (0-based)
  // isLastBeatOfChord — это последняя доля данного аккорда?
  
  if (beatInChord === 0) return resolveRootNote(chord, 2 + os);
  
  if (isLastBeatOfChord && nextChord) {
    return resolveApproachNote(nextChord, true, 2 + os, os);
  }
  
  // Внутренние доли: third, fifth, seventh — циклично
  switch (beatInChord % 3) {
    case 0: return resolveThirdNote(chord, 2 + os, os);
    case 1: return resolveFifthNote(chord, 2 + os, os);
    default: return resolveSeventhNote(chord, 2 + os, os);
  }
}
```

**Адаптивные сложности для multi-chord:**

| Аккордов в такте | Complexity 5–6 | Complexity 3–4 | Complexity 1–2 |
|---|---|---|---|
| 1 | Walking: root-3rd-5th-approach | Root-5th половинными | Root четвертями |
| 2 | Root-approach-root-approach (переходы внутри такта) | Root пятого на сильных долях | Root на доле 1 и 3 |
| 3 | Root-3rd-root-root (на границах аккордов) | Root на границах | Root на сильных |
| 4 | Root каждого аккорда с подходом к следующему | Root на каждой доле | Root на 1 и 3 |

#### 2.3.2. Piano — swing

**Ключевое изменение:** каждый `CompEvent` резолвит аккорд **на момент своего звучания**, а не на начало такта.

```ts
// Было:
const currentChord = this.timeline.getChordAtTick(barStartTicks, sig);
const nextChord = this.timeline.getChordAtTick((bar + 1) * tpBar, sig);

// Стало:
for (const event of events) {
  const eventTicks = barStartTicks + (event.beat - 1) * tpBeat + subdivTicks;
  const chord = event.chordRef === 'next'
    ? this.timeline.getChordAtTick(eventTicks + tpBeat, sig)  // следующий аккорд
    : this.timeline.getChordAtTick(eventTicks, sig);           // текущий аккорд
  // ...
}
```

**Новый chordRef: `'next'`** теперь означает «следующий аккорд по timeline», а не «следующий такт». Для этого:

```ts
getNextChord(tick: number, sig: TimeSignature): ChordSymbol | null {
  // Возвращает аккорд, который начнётся после текущего (в этом же такте или следующем)
  const current = this.getChordAtTick(tick, sig);
  const tpBar = ticksPerBar(sig);
  const tpBeat = ticksPerBeat(sig);
  // Ищем вперёд с шагом в 1 долю, пока не найдём другой аккорд
  for (let t = tick + tpBeat; t < tick + tpBar * 2; t += tpBeat) {
    const next = this.getChordAtTick(t, sig);
    if (next && next !== current) return next;
  }
  return null;
}
```

**Адаптация паттернов под multi-chord бары:**

При 2+ аккордах в такте профиль автоматически не меняется, но:
- `basie-2-4` в такте `| Dm7 G7 |`: beat 2 = Dm7, beat 4 = G7 ✓ (автоматически, за счёт sub-bar резолвинга)
- `charleston` в такте `| Dm7 G7 |`: beat 1 = Dm7, beat 2& = задержанный Dm7 → можно добавить эвристику: если на beat 2& аккорд уже сменился, брать новый (G7)
- `halfNotes` в такте `| Dm7 G7 Cmaj7 |`: beat 1 = Dm7, beat 3 = последний аккорд (Cmaj7? G7?) — резолвится по позиции

**Новый опциональный профиль для dense multi-chord:** `'quarter-comp'` — 4 доли, каждая с новым voicing'ом. Включается когда в такте 4 аккорда.

#### 2.3.3. Rhodes — swing

Аналогично Piano:
- Каждый `CompEvent` резолвит аккорд на момент звучания.
- `chordRef: 'next'` резолвится через `getNextChord`.
- Комплементарные слои (`pads`, `ambient-swells`) — для multi-chord баров: `pads` берёт первый аккорд такта (целая нота — логично), `ambient-swells` тоже первый (длинный пэд).

### 2.4. Voice leading при multi-chord

Сейчас `prevVoicing` обновляется **для каждого события** в цикле. При sub-bar резолвинге это работает автоматически:
- Событие на beat 2 (Dm7) → voicing для Dm7, `prevVoicing` = voicing Dm7
- Событие на beat 4 (G7) → voicing для G7, `prevVoicing` = voicing Dm7 → voice leading от Dm7 к G7

**Важно:** при 3–4 аккордах в такте голосоведение должно быть особенно компактным. Текущий алгоритм (`buildPianoVoicing` / `buildVoicing`) выбирает кандидат с минимальным суммарным движением голосов — это корректно для любых переходов, в том числе внутритактовых.

---

## 3. План реализации

### Этап 1: Sub-bar ChordTimeline (P0 — MVP)

#### T-101. Расширить `ChordTimeline` до sub-bar модели

- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/audio/chordTimeline.ts`
- **Сложность:** M (3–5d)
- **Описание:**
  1. Изменить `ChordTimelineEntry`: добавить `beatStart`, `beatEnd`.
  2. Изменить `getChordAtTick` для резолвинга по `(bar, beatInBar)`.
  3. Добавить `getNextChord(tick, sig)` — поиск следующего аккорда.
  4. Сохранить обратную совместимость: для 1 аккорда на такт поведение идентично.
  5. Обновить тесты `chordTimeline` (сейчас тестов может не быть — добавить).
- **DoD:** typecheck + lint + test, покрытие sub-bar случаев (1/2/3/4 аккорда на такт).
- **Зависит от задач:** — (первая задача)

#### T-102. Переписать `buildChordTimelineEntries` с учётом всех ChordSlot'ов

- **Слой:** `apps/web`
- **Модуль:** `apps/web/src/hooks/useTransport.ts`
- **Сложность:** S (1–2d)
- **Описание:**
  1. Вместо `allBars[idx]?.chords[0]` — обход всех `chords` в баре.
  2. Вычисление `beatStart/beatEnd` из `ChordSlot.beats` (с учётом time signature).
  3. Fallback: если `beats` = null, равномерно распределить доли между аккордами.
- **DoD:** typecheck + lint + test. Проверка: `| Dm7 G7 |` даёт 2 timeline-entries.
- **Зависит от задач:** T-101

### Этап 2: Адаптация инструментов к sub-bar (P0 — MVP)

#### T-103. Адаптировать BassInstrument под sub-bar

- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/audio/bassInstrument.ts`
- **Сложность:** M (3–5d)
- **Описание:**
  1. В `scheduleSwing` для complexity 5–6: заменить `switch(beatInBar)` на контекстно-зависимую логику (см. §2.3.1).
  2. Доля 4: approach к следующему аккорду (внутри такта или следующего такта) через `getNextChord`.
  3. Для complexity ≤4: адаптировать логику сильных/слабых долей к смене аккорда внутри такта.
  4. Обновить тесты: multi-chord бары, проверка правильных нот на каждой доле.
- **DoD:** typecheck + lint + test (≥5 новых тестов для multi-chord).
- **Зависит от задач:** T-101, T-102

#### T-104. Адаптировать PianoInstrument под sub-bar

- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/audio/pianoInstrument.ts`
- **Сложность:** M (3–5d)
- **Описание:**
  1. Изменить `schedule`: аккорд резолвится для каждого `CompEvent` отдельно (а не раз в такт).
  2. `chordRef: 'next'` → вызов `getNextChord(eventTicks, sig)`.
  3. `prevVoicing` обновляется при каждом событии — voice leading через границы аккордов внутри такта работает автоматически.
  4. Обновить тесты: multi-chord бары, проверка разных voicing'ов в пределах одного такта.
  5. Опционально: добавить профиль `'quarter-comp'` для 4-аккордных тактов.
- **DoD:** typecheck + lint + test (≥5 новых тестов для multi-chord).
- **Зависит от задач:** T-101, T-102

#### T-105. Адаптировать RhodesInstrument под sub-bar

- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/audio/rhodesInstrument.ts`
- **Сложность:** S (1–2d)
- **Описание:**
  1. Аналогично Piano: аккорд резолвится для каждого `CompEvent` отдельно.
  2. `chordRef: 'next'` → `getNextChord`.
  3. `scheduleLayer` для комплементарного режима: проверить, нужно ли менять поведение для multi-chord (вероятно, нет — pads/ambient-swells работают с первым аккордом такта, что логично).
  4. Обновить тесты.
- **DoD:** typecheck + lint + test (≥3 новых теста для multi-chord).
- **Зависит от задач:** T-101, T-102

### Этап 3: Расширение паттернов и вариативности (P1)

#### T-106. Новые Piano-паттерны для multi-chord тактов

- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/audio/pianoComping.ts`
- **Сложность:** S (1–2d)
- **Описание:**
  1. Добавить паттерн `'quarter-comp'`: 4 четверти, durationBeats 0.5, velocity 0.45–0.55.
  2. Добавить паттерн `'two-and-four'`: beat 2 + beat 4, для 2-аккордных тактов.
  3. Добавить паттерн `'one-three'`: beat 1 + beat 3, альтернатива halfNotes для 2-аккордных.
  4. Обновить профиль `'swing-sparse'` или создать `'swing-dense'` для тактов с 3–4 аккордами.
- **DoD:** typecheck + lint + test (новые паттерны).
- **Зависит от задач:** T-104

#### T-107. Адаптивный выбор профиля Piano по плотности аккордов

- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/audio/pianoInstrument.ts`
- **Сложность:** S (1–2d)
- **Описание:**
  1. В `schedule`: определить количество аккордов в текущем такте.
  2. Если 3–4 аккорда → принудительно использовать `'quarter-comp'` вместо профиля из цикла.
  3. Если 2 аккорда → можно оставить профиль (basie-2-4 хорошо ложится), либо переключить на `'two-and-four'`.
  4. Сделать поведение настраиваемым (опция `adaptiveProfile: boolean`).
- **DoD:** typecheck + lint + test.
- **Зависит от задач:** T-104, T-106

#### T-108. Улучшенный Bass randomizer для multi-chord

- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/audio/bassInstrument.ts`
- **Сложность:** S (1–2d)
- **Описание:**
  1. При 2 аккордах в такте: вариативность в выборе approach ноты (хроматический сверху/снизу, диатонический, скалярный).
  2. При 3–4 аккордах: иногда пропускать доли (играть только границы аккордов), добавлять октавные скачки для разнообразия.
  3. Опционально: интегрировать существующий `PianoRandomizer`-подход (детерминированный seed от barIndex).
- **DoD:** typecheck + lint + test (≥3 теста на вариативность).
- **Зависит от задач:** T-103

### Этап 4: Тесты и документация (P1)

#### T-109. Интеграционные тесты: multi-chord бары, полный цикл

- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/audio/`
- **Сложность:** M (3–5d)
- **Описание:**
  1. Создать интеграционный тест, прогоняющий `| Dm7 G7 | Cmaj7 |` через Bass + Piano + Rhodes.
  2. Проверить: правильные аккорды на правильных долях, voice leading, отсутствие конфликтов.
  3. Проверить граничные случаи: 1/2/3/4 аккорда, пустые такты, смена размера.
  4. Проверить обратную совместимость: существующие тесты проходят без изменений.
- **DoD:** typecheck + lint + test (≥10 новых интеграционных тестов).
- **Зависит от задач:** T-103, T-104, T-105

#### T-110. Обновить `docs/FUNCTIONS.md` и создать `docs/CHORDS.md`

- **Слой:** `docs`
- **Сложность:** XS (<1d)
- **Описание:**
  1. В `FUNCTIONS.md` §6.3 обновить описание инструментов: указать поддержку multi-chord баров.
  2. Создать `docs/CHORDS.md` — документация по механизму multi-chord: как работает, какие паттерны, примеры.
  3. Обновить `CLAUDE.md` — добавить `docs/CHORDS.md` в карту навигации.
- **DoD:** review + принятие PR.
- **Зависит от задач:** T-101–T-108

---

## 4. Последовательность (Ordering)

```
Этап 1 (P0): T-101 → T-102
                ↓
Этап 2 (P0): T-103 (Bass) + T-104 (Piano) + T-105 (Rhodes)  [параллельно]
                ↓
Этап 3 (P1): T-106 → T-107 (Piano patterns)  [после T-104]
             T-108 (Bass randomizer)          [после T-103]
                ↓
Этап 4 (P1): T-109 (интеграционные тесты)     [после всех]
             T-110 (документация)              [параллельно с T-109]
```

---

## 5. Оценка суммарной трудоёмкости

| Сложность | Кол-во | Задачи |
|---|---|---|
| XS (<1d) | 1 | T-110 |
| S (1–2d) | 4 | T-102, T-105, T-106, T-107, T-108 |
| M (3–5d) | 4 | T-101, T-103, T-104, T-109 |
| **Итого** | | **~16–28 рабочих дней** |

---

## 6. Критические пути

1. **T-101 (ChordTimeline sub-bar)** — блокирует все остальные задачи. Должна быть сделана первой.
2. **T-104 (Piano sub-bar)** — самая сложная адаптация (5 профилей × multi-chord логика). Критична для MVP.
3. **T-109 (интеграционные тесты)** — финальный валидатор. Пока не пройдены, релизить нельзя.

---

## 7. Риски и допущения

| Риск | Вероятность | Смягчение |
|---|---|---|
| Изменение `ChordTimeline` ломает существующие тесты | Средняя | Сохранить старый `getChordAtTick` как `getChordAtBar`, новый как `getChordAtBeat`; поэтапная миграция |
| Voice leading между аккордами внутри такта звучит «дёргано» | Средняя | Алгоритм уже минимизирует движение; протестировать на реальных примерах (ii–V–I в 2 тактах vs 1 такте) |
| Производительность: sub-bar резолвинг на каждом тике | Низкая | Timeline entries кешируются; поиск O(n) по длине такта (макс 4) — negligible |
| 3–4 аккорда на такт звучат «каша» | Средняя | Для такой плотности автоматически включать разреженные паттерны (quarter-comp с короткими длительностями) |

---

## 8. Примеры: как будет звучать

### Пример 1: ii–V–I, 2 аккорда на такт

```
| Dm7 G7 | Cmaj7 | Cmaj7 |
```

**Bass (walking, complexity 5):**
- Такт 1, доля 1: D (root Dm7)
- Такт 1, доля 2: F (third Dm7) или Ab (хроматический подход к G)
- Такт 1, доля 3: G (root G7) ← **новое: смена аккорда внутри такта**
- Такт 1, доля 4: Db (хроматический подход к C из G7)
- Такт 2: стандартный walking на Cmaj7

**Piano (swing-sparse, такт 1 = basie-2-4):**
- beat 2: Dm7 voicing (shell2: F3, C4)
- beat 4: G7 voicing (rootless3: B3, F4, A4) ← **новое: G7 вместо Dm7**

**Rhodes (halfNotes):**
- beat 1: Dm7 voicing
- beat 3: G7 voicing ← **новое: G7 вместо Dm7**

### Пример 2: turnaround, 4 аккорда на такт

```
| Cmaj7 Am7 | Dm7 G7 |
```

**Bass (walking):**
- Такт 1: C → E → A → подход к D
- Такт 2: D → F → G → подход к следующему

**Piano (автоматически quarter-comp):**
- beat 1: Cmaj7
- beat 2: Am7
- beat 3: Dm7
- beat 4: G7 (anticipation к следующему? Или сам G7)

---

## 9. Out of Scope (сознательно не делаем)

- ❌ Полноценный «стиль-движок» с MIDI-файлами паттернов (как в iReal Pro / Band-in-a-Box). Текущий подход с «кирпичиками» + рандомайзером достаточен.
- ❌ Стили кроме swing для multi-chord. Bossa/funk/latin/ballad — следующим этапом.
- ❌ Редактор паттернов пользователем. Пока только программно.
- ❌ Автоматическое определение «лучшего» паттерна по аккордовой сетке (AI/ML). Правила фиксированы.
- ❌ Изменение визуализации в редакторе (хотя `beats` уже отображаются — это существующая фича).

---

_Документ создан 2026-06-14 на основе анализа кодовой базы `packages/music-core/src/audio/` и `apps/web/src/hooks/useTransport.ts`._
