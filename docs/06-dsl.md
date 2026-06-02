# 06 — DSL гармонии и модель аккорда

## Цель документа

Описать текстовый DSL для ввода гармонии, грамматику, модель `ChordSymbol`, набор
распознаваемых джазовых аккордов, стратегию расширения и обработку ошибок. Реализация —
в `packages/music-core`.

> Принцип ТЗ: **не строим идеальный музыкальный парсер на первом этапе**, но архитектура
> должна позволять расширение. Цель MVP — практичный, расширяемый, хорошо протестированный
> парсер базовых джазовых аккордов.

---

## 1. Грамматика DSL

Пример:
```
Dm7 | Am7b5 | C7 | G7b5 ||
```

Правила:
- `|` — разделитель тактов.
- `||` — конец формы/секции (терминатор; завершающий `||` опционален).
- Внутри такта аккорды разделяются **пробелом или запятой**:
  `Cmaj7 A7` или `Cmaj7, A7` — два аккорда в одном такте.
- Лишние пробелы игнорируются; пустой такт допускается (`| |` → такт без аккордов или
  «продолжение» — в MVP трактуем как пустой такт, валидатор предупреждает).
- Перенос строки эквивалентен пробелу между тактами (можно писать многострочно).

Неформальная грамматика (EBNF-подобно):
```
form        := bar ( "|" bar )* ( "||" )?
bar         := chord ( (" " | ",") chord )*
chord       := root accidental? quality? extensions* ( "/" bassRoot accidental? )?
root        := "A".."G"
accidental  := "#" | "b"
bassRoot    := "A".."G"
```

---

## 2. Модель `ChordSymbol`

```ts
type NoteName = 'C'|'D'|'E'|'F'|'G'|'A'|'B';
type Accidental = '#' | 'b' | '';

interface ChordSymbol {
  raw: string;            // исходный текст, напр. "Dm7b5"
  root: NoteName;
  rootAccidental: Accidental;
  quality: ChordQuality;  // major | minor | dominant | diminished | halfDiminished | augmented | suspended | power
  extensions: Extension[];// ['7','9','13', ...]
  alterations: Alteration[]; // ['b5','#5','b9','#9','#11','b13']
  alt: boolean;           // признак "alt" (altered dominant)
  sus?: 'sus2' | 'sus4';
  bass?: { note: NoteName; accidental: Accidental } | null; // slash-аккорд, напр. C/E
}
```

`ChordQuality`, `Extension`, `Alteration` — enum'ы/строковые литералы; список — §3.

В БД хранится только текст (`symbol`); `ChordSymbol` — производное, считается парсером
(см. [03-data-model.md](03-data-model.md)).

---

## 3. Распознаваемые аккорды (MVP)

Базовый набор джазовых символов (требование ТЗ):

| Символ | Quality / расшифровка |
|---|---|
| `C`, `Cmaj`, `CM` | major |
| `Cmaj7`, `CM7`, `CΔ` | major 7 |
| `Cm`, `Cmin`, `C-` | minor |
| `Cm7`, `Cmin7`, `C-7` | minor 7 |
| `C7` | dominant 7 |
| `Cm7b5`, `Cø` | half-diminished (m7♭5) |
| `Cdim`, `C°` | diminished |
| `Cdim7`, `C°7` | diminished 7 |
| `Caug`, `C+` | augmented |
| `Csus`, `Csus4`, `Csus2` | suspended |
| `C7b5` | dominant 7♭5 |
| `C7#5` | dominant 7♯5 |
| `C7b9` | dominant 7♭9 |
| `C9` | dominant 9 |
| `C11` | dominant 11 |
| `C13` | dominant 13 |
| `Calt`, `C7alt` | altered dominant |
| `C/E` | slash (bass note) — поверх любого качества |

Парсер распознаёт комбинации (напр. `Dm9`, `G13b9`, `Am7b5`) через слой quality +
extensions + alterations, а не фиксированным списком — это и есть точка расширения.

---

## 4. Стратегия парсинга (расширяемость)

Многошаговый разбор символа аккорда:
1. **root + accidental** — первый символ A–G + опц. `#`/`b`.
2. **bass split** — отделить `/X` (slash), распарсить bass отдельно.
3. **quality** — сопоставить с таблицей качеств (порядок: длинные/специфичные раньше:
   `maj7`, `m7b5`, `dim7`, `m7`, `7`, `m`, `dim`, `aug`, `sus`…).
4. **extensions** — `9/11/13` и наличие `7`.
5. **alterations** — `b5/#5/b9/#9/#11/b13`, `alt`.

Таблицы качеств/расширений — **данные**, не хардкод в логике; добавление нового символа =
строка в таблице. Парсер толерантен к синонимам (`-`/`m`/`min`, `Δ`/`maj7`, `ø`/`m7b5`,
`°`/`dim`, `+`/`aug`).

---

## 5. API парсера/сериализатора (music-core)

```ts
// парсинг одного символа
parseChord(text: string): ParseResult<ChordSymbol>;

// парсинг всего DSL в структуру
parseGrid(dsl: string): ParseResult<GridContent>;

// сериализация обратно в DSL
serializeGrid(content: GridContent): string;

// сериализация одного аккорда (нормализованный вид)
serializeChord(chord: ChordSymbol): string;

interface ParseResult<T> {
  ok: boolean;
  value?: T;
  errors: ParseError[];     // { message, position, token }
}
```

- `parseGrid` строит `GridContent` (version, bars, chords) из [03-data-model.md](03-data-model.md).
- Round-trip: `parseGrid(serializeGrid(content))` эквивалентно исходному (с точностью до
  нормализации символов) — покрывается тестами.

---

## 6. Валидация и ошибки

- Неизвестный токен/символ → `ParseError` с позицией; парсинг продолжается (сбор всех
  ошибок), невалидный аккорд помечается, но не роняет всю форму.
- На фронте ошибки подсвечиваются в DSL-панели с позицией; в редакторе — по месту ввода
  аккорда в такте.
- На бэке `POST /grids/import` возвращает `400 VALIDATION_ERROR` с массивом ошибок.

---

## 7. Импорт / экспорт

- **Импорт**: текст DSL → `parseGrid` → `GridContent` → создать/обновить сетку.
- **Экспорт**: `GridContent` → `serializeGrid` → текст DSL (с `|` и завершающим `||`).
- Используется одинаковый код на фронте (предпросмотр) и бэке (`/grids/import|export`).

---

## 8. Тестирование (F1)

- Unit: `parseChord` на каждый символ из §3 + комбинации + синонимы + невалидные.
- Unit: `parseGrid` (разделители, многострочность, `||`, пустые такты, ошибки с позицией).
- Unit: `serializeChord` / `serializeGrid`.
- **Round-trip**: parse → serialize → parse для набора реальных стандартов
  (ii-V-I, blues, rhythm changes) — структура сохраняется.
