# Guitar в джазовом тренажёре

> **Статус:** 🟢 Реализовано
> **Модуль:** `packages/music-core/src/audio/guitarInstrument.ts`
> **Манифесты:** `guitarManifest.ts` (Nylon/Steel), `electricGuitarManifest.ts` (Electric)

## 1. Роль гитары

Гитара в Jazz Trainer — **ритмический и гармонический инструмент** среднего регистра. Представлена двумя вариантами сэмплов, использующими один класс `GuitarInstrument`:

- **Nylon/Steel Guitar** — классическая/акустическая гитара, богатые voicing'и, comping и fingerstyle
- **Electric Guitar** — электрогитара, 2 velocity-слоя, стиле-специфичные паттерны

## 2. Guitar + Electric Guitar: общий движок, разные сэмплы

| Аспект        | Nylon/Steel Guitar                  | Electric Guitar                       |
| ------------- | ----------------------------------- | ------------------------------------- |
| Семплы        | Nylon (Spanish Classical, CC0)      | Electric (2 velocity-слоя, CC0)       |
| Velocity-слои | 1 (однослойные сэмплы)              | 2 (normal — полный пик, soft — mute)  |
| Диапазон      | E2–E5                               | E2–C#6                                |
| Анкерных нот  | 9 (E2–E5 через каждые 4–5 полутонов) | 12 (E2–C#6)                           |
| Release       | 2.0s                                | 1.2s                                  |
| ID            | `guitar`                            | `electric-guitar`                     |

## 3. Режимы игры

`GuitarInstrument` поддерживает два режима (`GuitarMode`):

### 3.1. Comp (аккомпанемент)

Четыре удара на такт: downstroke на сильных долях (1, 3), upstroke на слабых (2, 4):

| Доля | Strum   | Velocity | Длительность |
| ---- | ------- | -------- | ------------ |
| 1    | down    | 0.75     | 0.85 beats   |
| 2    | up      | 0.55     | 0.45 beats   |
| 3    | down    | 0.70     | 0.85 beats   |
| 4    | up      | 0.50     | 0.45 beats   |

### 3.2. Fingerstyle (арпеджио)

Две ноты на такт (половинные), cycling через ноты voicing'а:

| Доля | Strum | Velocity | Длительность |
| ---- | ----- | -------- | ------------ |
| 1    | down  | 0.70     | 1.8 beats    |
| 3    | down  | 0.65     | 1.8 beats    |

## 4. Стиле-специфичные паттерны

В режиме `comp` гитара диспетчеризует в один из трёх стилевых паттернов (`GuitarPattern`):

| Стиль    | Паттерн          | Описание                                           |
| -------- | ---------------- | -------------------------------------------------- |
| `swing`  | `freddie-green`  | Классический Freddie Green: ровные четверти на все доли |
| `bossa`  | `bossa-comping`  | Bossa nova: синкопированный паттерн с басовыми нотами  |
| `funk`   | `funk-chops`     | Funk: резкие chop-аккорды на 16-х                  |
| `latin`  | (fallback)       | Стандартный comp-паттерн                            |
| `ballad` | (fallback)       | Стандартный comp-паттерн                            |

Выбор паттерна — через `StyleProfile.instrumentDefaults.guitar.pattern`.

## 5. Voicing'и

Два типа voicing'ов (`GuitarVoicing`):

| Voicing | Нот    | Состав                                  | Применение              |
| ------- | ------ | --------------------------------------- | ----------------------- |
| `open`  | 5–6    | root, 3, 5, 7, 9, 5+oct                 | Богатый, полнозвучный   |
| `jazz`  | 3–4    | root, 3, 7 (+9/13 при расширениях)      | Компактный, джазовый    |

### 5.1. Построение voicing'а

1. Интервалы от root: для каждого качества аккорда определены 3-я, 5-я, 7-я ступени
2. MIDI-ноты генерируются от root в октаве 2 (для более насыщенного баса)
3. Ноты зажимаются в диапазон E2–E5 (GUITAR_MIN_MIDI=40, GUITAR_MAX_MIDI=76)
4. Дубликаты от октавного wrapping удаляются
5. Ноты сортируются от низких к высоким

## 6. Humanization

- **Timing jitter:** ±8 мс (преобразуется в тики)
- Отключается через `setHumanize(false)`
- Применяется per-event в `schedule()`

## 7. Манифесты

### 7.1. Nylon/Steel Guitar

```ts
export const guitarManifest: InstrumentManifest = {
  id: 'guitar',
  name: 'Guitar',
  createInstrument: () => new GuitarInstrument(new ChordTimeline(), 'guitar'),
  sampleManifest: GUITAR_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.7,
    mode: 'comp',
    voicing: 'jazz',
    stringType: 'nylon',
  },
  perStyleDefaults: {
    // Стиле-специфичные оверрайды (mode, voicing, stringType)
  },
};
```

### 7.2. Electric Guitar

```ts
export const electricGuitarManifest: InstrumentManifest = {
  id: 'electric-guitar',
  name: 'Electric Guitar',
  createInstrument: () => new GuitarInstrument(new ChordTimeline(), 'electric-guitar'),
  sampleManifest: ELECTRIC_GUITAR_SAMPLE_MANIFEST,
  defaultSettings: {
    enabled: false,
    volume: 0.7,
    mode: 'comp',
    voicing: 'jazz',
  },
  perStyleDefaults: {
    swing: { mode: 'comp', voicing: 'jazz' },
    bossa: { mode: 'comp', voicing: 'jazz' },
    funk: { mode: 'comp', voicing: 'jazz' },
    latin: { mode: 'comp', voicing: 'jazz' },
    ballad: { mode: 'comp', voicing: 'jazz' },
  },
};
```

## 8. Взаимодействие с другими инструментами

| Инструмент    | Правило                                                          |
| ------------- | ---------------------------------------------------------------- |
| **Piano**     | Разные EventSink'и, не конфликтуют. Гитара в среднем регистре    |
| **Rhodes**    | Разные EventSink'и. Rhodes выше (C4–C6), гитара ниже (E2–E5)     |
| **Bass**      | Бас — нижний слой (C2–C4), гитара — средний (E2–E5)              |
| **Clarinet**  | Разные EventSink'и. Кларнет монофонический, гитара полифоническая |

## 9. Тесты

- `guitarInstrument.test.ts` — все режимы, voicing'и, паттерны, humanization
- Покрытие: comp, fingerstyle, open/jazz voicing, bossa-comping, funk-chops, freddie-green

---

_См. также: `docs/PIANO.md` (основная гармония), `docs/BASS.md` (бас)_
