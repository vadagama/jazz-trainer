# F7 — Harmony editor / trainer

**Ветка:** `feature/harmony-editor`

## Scope
Редактор **своей** сетки (auth) согласно [05-frontend.md §5–6](../05-frontend.md).
Публичные сетки read-only: чтобы редактировать — «скопировать себе» (F6 `CopyToMine`),
после чего открывается этот редактор.

- **HarmonyGrid** (custom CSS Grid): такты-ячейки с переносом по строкам, визуальное
  отделение тактов, чипы аккордов (деление по `beats`), клик по такту → выбор.
- **BarEditor**: редактирование выбранного такта — добавить/удалить аккорд, ввод символа
  с валидацией по месту (`music-core parseChord`), задание `beats`.
- **DslPanel**: импорт DSL (textarea → parseGrid → загрузка в редактор, подсветка ошибок
  с позицией) и экспорт (serializeGrid → текст).
- **GeneratorPanel**: выбор паттерна (`usePatterns`)/тональности/длины → `POST /generate`
  → предпросмотр → «применить в редактор».
- **TopBar редактора**: название, размер сетки (TimeSig-селект), сохранение (PATCH grid,
  optimistic), индикация dirty.
- `useEditorStore`: selectedBar, буфер правок, isDirty.

## Зависимости
F1 (DSL), F3/F5 (generate), F6 (web shell, queries).

## Контракты
[05-frontend.md](../05-frontend.md), [06-dsl.md](../06-dsl.md), grids API из [04-api.md](../04-api.md).

## Тесты
- Vitest + Testing Library: HarmonyGrid (рендер тактов, выбор по клику), BarEditor
  (добавление/валидация аккорда), DslPanel (импорт/ошибки, экспорт), GeneratorPanel
  (применение результата). `music-core` реальный (чистые функции), сеть замокана.

## Definition of Done
- Можно создать/отредактировать сетку, импортировать/экспортировать DSL, сгенерировать
  и применить прогрессию, сохранить. Тесты зелёные.
