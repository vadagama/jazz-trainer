# F1 — DSL parser + serializer + chord model

**Ветка:** `feature/dsl-parser`

## Scope
Реализовать в `packages/music-core` парсинг/сериализацию гармонии и модель аккорда
согласно [06-dsl.md](../06-dsl.md).

- `chords/` — модель `ChordSymbol`, таблицы качеств/расширений/альтераций (данные),
  `parseChord(text)`, `serializeChord(chord)`.
- `dsl/` — `parseGrid(dsl)`, `serializeGrid(content)`, сбор ошибок с позицией.
- Типы `GridContent`/`Bar`/`ChordSlot` — в `@jazz/shared` + Zod `GridContentSchema`
  (используется здесь и API).
- Толерантность к синонимам (`-`/`m`, `Δ`/`maj7`, `ø`/`m7b5`, `°`/`dim`, `+`/`aug`).
- Slash-аккорды (`C/E`), несколько аккордов в такте, `|`/`||`, многострочность.

## Зависимости
F0. Использует `@jazz/shared` (GridContent типы/схема).

## Контракты
`parseGrid/serializeGrid/parseChord/serializeChord`, `ParseResult<T>` — см.
[06-dsl.md §5](../06-dsl.md). Структура `GridContent` — [03-data-model.md §3](../03-data-model.md).

## Тесты (unit, Vitest)
- `parseChord` на каждый символ из [06-dsl.md §3](../06-dsl.md) + комбинации (`Dm9`,
  `G13b9`, `Am7b5`) + синонимы + невалидные (ошибка с позицией).
- `parseGrid`: разделители (пробел/запятая), `|`, `||`, пустые такты, многострочность,
  множественные ошибки.
- `serializeChord` / `serializeGrid` — нормализованный вывод.
- **Round-trip**: `parseGrid(serializeGrid(parseGrid(x)))` стабилен для ii-V-I, blues,
  rhythm changes.

## Definition of Done
- Полное покрытие core-логики DSL тестами; все тесты зелёные.
- Публичные функции экспортируются из `@jazz/music-core`.
