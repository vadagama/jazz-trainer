# F3 — Harmony generator

**Ветка:** `feature/harmony-generator`

## Scope
Реализовать в `packages/music-core/generator/` data-driven генерацию прогрессий.

- Паттерны описаны **данными** (декларативно), а не зашиты в логику/UI:
  - ii-V-I major
  - ii-V-I minor
  - circle of fifths
  - rhythm changes fragment
  - modal vamp
  - dominant chain
  - random diatonic progression
  - jazz turnaround
- `generate({ patternId, key, lengthBars?, options? }) -> GridContent`.
- Выбор тональности (12 тональностей) и длины формы.
- Транспозиция степеней аккордов в выбранную тональность.
- `listPatterns() -> PatternInfo[]` (id, name, описание, параметры).

## Зависимости
F0, F1 (chord model / GridContent).

## Контракты
Вход/выход — `GenerateSchema` и `GridContent` ([04-api.md §5](../04-api.md),
[03-data-model.md §3](../03-data-model.md)). Используется бэком в `POST /api/generate`.

## Тесты (unit, Vitest)
- Каждый паттерн: корректная длина, корректные аккорды в нескольких тональностях
  (напр. ii-V-I в C → Dm7 G7 Cmaj7; в F → Gm7 C7 Fmaj7).
- Транспозиция степеней.
- `random diatonic` — детерминирован при переданном seed (для тестируемости).
- Результат проходит `GridContentSchema`.

## Definition of Done
- Все генераторы покрыты тестами; зелёные.
- Паттерны легко расширяемы (добавление = новая запись данных).
