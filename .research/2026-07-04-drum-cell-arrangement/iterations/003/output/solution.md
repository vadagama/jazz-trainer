# Solution

## Mode

`architecture`

## Context

Итерация 003 закрывает дизайн после ответов на open questions 002. Единственный «не знаю»
(частота выбора из взвешенного пула) решается архитектурно: **выбор на каждый такт спана**.
Остальное подтверждено: `moleculeId` уникален во всей клетке; crash/crash_sizzle становятся
одноатомными accent-молекулами; 7 типов dynamics достаточно; per-clip probability не нужна;
лейнов произвольно, максимум ~15. Итерация фиксирует финальную модель и добавляет конкретный
черновик конвертера (`swing-16-verse`), сигнатуру `validateCell()` и тест-план — готово к
финализации и переходу к реализации.

## Input Summary

- Ответы на 6 open questions 002 (`input/prompt.md`): weightedPick — «не знаю» (решает архитектор);
  уникальность moleculeId — вся клетка; crash-молекулы — да; 7 типов dynamics — достаточно;
  per-clip probability — нет; лейнов произвольно, макс ~15.
- Предыдущая итерация: `../002/output/solution.md` (модель lanes×clips×weighted pools).

## Proposed Solution

Финальная модель = `DrumCell { velocity, dynamics{type,amount}, lanes[≤15] }`,
`DrumLane { name, probability, clips[] }`, `DrumClip { startBar, lengthBars, pool: WeightedMolecule[] }`.
Движок собирает такт детерминированно: по каждому лейну берёт покрывающий клип, применяет
`lane.probability` (сид по `barInOrganism`+lane), **на каждый такт** взвешенно выбирает молекулу
из пула клипа (сид по `barInOrganism`+lane+':pick'), тайлит её по спану (фикс `bars:2`) и эмитит
атомы с `vel = atom.vel × cell.velocity × dynMul`. Инварианты: клипы лейна не пересекаются;
`moleculeId` уникален во всей клетке; лейнов ≤ 15. Миграция — одномоментная через
`convertLegacyCell()` (пример для `swing-16-verse` ниже) + `validateCell()` + A/B-сверка. crash
представлен одноатомными молекулами. Дизайн закрыт — открытых вопросов не осталось.

## Key Decisions

- **weightedPick — на каждый такт спана** (решение по «не знаю»): напрямую даёт «произвольное
  применение на отрезке»; веса + сид держат контроль и идемпотентность (высокий вес базовой
  молекулы → в основном она, вариации редко). Управляемо и не даёт «суеты».
- **`moleculeId` уникален во всей клетке** — подтверждено; валидатор запрещает дубли.
- **crash/crash_sizzle → одноатомные accent-молекулы** — всё есть молекулы, модель единая.
- **7 типов dynamics финальны** (steady/crescendo/decrescendo/arch/valley/wave/pulse) + `amount`.
- **probability только per-lane** — per-clip не вводим (проще, достаточно).
- **Лейнов ≤ 15** — новый инвариант в `validateCell()`.
- **Дизайн закрыт** — переход к реализации: типы → движок+тесты → конвертер 20 клеток → редактор.

## Details

### Final Data Model (без изменений структуры 002, с уточнениями)

```ts
export type DrumDynamicsType =
  | 'steady' | 'crescendo' | 'decrescendo' | 'arch' | 'valley' | 'wave' | 'pulse';

export interface DrumDynamics { type: DrumDynamicsType; amount: number; } // amount 0..1
export interface WeightedMolecule { moleculeId: string; weight: number; } // weight > 0
export interface DrumClip {
  startBar: number;          // 0-based, 0 ≤ startBar < length
  lengthBars: number;        // ≥1, startBar + lengthBars ≤ length
  pool: WeightedMolecule[];  // ≥1; взвешенный выбор НА КАЖДЫЙ такт спана
}
export interface DrumLane {
  name: string;              // роль/свободная метка
  probability: number;       // 0..1 per-lane «иногда»
  clips: DrumClip[];         // непересекающиеся
}
export interface DrumCell {
  id: string; style: DrumPatternStyle;
  length: 8 | 16 | 32; timeSignature: [4, 4] | [5, 4];
  velocity: number;          // 0..1 мастер
  dynamics: DrumDynamics;
  lanes: DrumLane[];         // 1..15
  weight: number;            // выбор клетки организмом
}
```

### convertLegacyCell() — черновик и worked example (swing-16-verse)

Правила конвертера:
1. `velocity ← legacy.volumeMul`; `dynamics ← { type: legacy.dynamicsType, amount: 0.15 }`.
2. Каждую молекулу `grooveMoleculePool` → отдельный лейн (по семье звука/тегу), клип `[0,length]`,
   пул `[{id, weight:10}]`, `probability:1`.
3. Молекулы `variationMoleculePool` — свернуть в пул лейна той же семьи с меньшим весом (≈3);
   несопоставленные → отдельный лейн `variation` (`[0,length]`, `probability` < 1). Логировать
   несопоставленные для ручной доводки.
4. `fillMoleculePool` → лейн `fill`: 1-тактовые клипы в барах `k*fillEveryBars-1`; `probability≈0.6`.
5. `crashType` → лейн `accent`: 1-тактовые клипы в crash-барах (`k*fillEveryBars`, k≥1, плюс бар 0);
   пул `[{crashMoleculeId, 1}]` (одноатомная accent-молекула).
6. Прогнать `validateCell()`; при ошибках — ручная правка.

Результат для `swing-16-verse` (legacy: groove=[ride-basic, feathering-1, foot-chick, stir-texture,
snare-ghost-phrase], variation=[snare-backbeat]@4, fill=[fill-triplet-1]@8, crash, volumeMul=1, steady):

```ts
{
  id: 'swing-16-verse', style: 'swing', length: 16, timeSignature: [4, 4],
  velocity: 1.0,
  dynamics: { type: 'steady', amount: 0.15 },
  weight: 1.0,
  lanes: [
    { name: 'ride',   probability: 1,    clips: [{ startBar: 0, lengthBars: 16, pool: [{ moleculeId: 'swing-ride-basic', weight: 10 }] }] },
    { name: 'kick',   probability: 1,    clips: [{ startBar: 0, lengthBars: 16, pool: [{ moleculeId: 'swing-feathering-1', weight: 10 }] }] },
    { name: 'hihat',  probability: 1,    clips: [{ startBar: 0, lengthBars: 16, pool: [{ moleculeId: 'swing-foot-chick', weight: 10 }] }] },
    { name: 'stir',   probability: 1,    clips: [{ startBar: 0, lengthBars: 16, pool: [{ moleculeId: 'swing-stir-texture', weight: 10 }] }] },
    { name: 'snare',  probability: 0.85, clips: [{ startBar: 0, lengthBars: 16, pool: [
        { moleculeId: 'swing-snare-ghost-phrase', weight: 10 },
        { moleculeId: 'swing-snare-backbeat',     weight: 3  }] }] },
    { name: 'fill',   probability: 0.6,  clips: [
        { startBar: 7,  lengthBars: 1, pool: [{ moleculeId: 'swing-fill-triplet-1', weight: 1 }] },
        { startBar: 15, lengthBars: 1, pool: [{ moleculeId: 'swing-fill-triplet-1', weight: 1 }] }] },
    { name: 'accent', probability: 1,    clips: [
        { startBar: 0, lengthBars: 1, pool: [{ moleculeId: 'crash', weight: 1 }] },
        { startBar: 8, lengthBars: 1, pool: [{ moleculeId: 'crash', weight: 1 }] }] },
  ],
}
```

Проверка уникальности: ride-basic, feathering-1, foot-chick, stir-texture, snare-ghost-phrase,
snare-backbeat, fill-triplet-1, crash — 8 уникальных id. Лейнов 7 (≤15). ✓
Примечание-приближение: legacy variation «каждые 4 такта» → в новой модели backbeat всплывает по
весу 3 (≈23% тактов), а fill «каждые 8» → 1-тактовые клипы @7,@15 с p=0.6. Точное совпадение
не гарантируется — ручная доводка после A/B.

### validateCell() — сигнатура и правила

```ts
export interface CellValidationError { code: string; lane?: string; detail: string; }
export function validateCell(cell: DrumCell): CellValidationError[];
```

Правила:
- `1 ≤ lanes.length ≤ 15`.
- Для каждого лейна: клипы попарно не пересекаются по `[startBar, startBar+lengthBars)`;
  `0 ≤ startBar`, `lengthBars ≥ 1`, `startBar + lengthBars ≤ length`.
- Каждый клип: `pool.length ≥ 1`, все `weight > 0`.
- `moleculeId` уникален по ВСЕЙ клетке (по всем лейнам/клипам/пулам); дубль → ошибка.
- Диапазоны: `velocity, probability, amount ∈ [0,1]`, `weight > 0`, `cell.weight > 0`.
- Все `moleculeId` существуют в `DRUM_MOLECULES` (или в overrides).
Редактор вызывает `validateCell` на лету и блокирует недопустимые действия (пересечение,
добавление уже присутствующей молекулы, >15 лейнов).

### Test Plan (движок и валидатор)

- **Идемпотентность**: `assembleBar(...)` дважды с одинаковыми аргументами → идентичные `DrumHit[]`.
- **probability детерминизм**: `p=0` → лейн молчит всегда; `p=1` → всегда; `p=0.5` → одинаковый
  паттерн вкл/выкл по тактам при фиксированном seed; отличается при разных seed.
- **weightedPick**: фиксированный seed → воспроизводимая последовательность; при {base ×10, var ×1}
  base доминирует (~90%); один пул-элемент → всегда он.
- **bars:2 тайлинг**: 2-тактовая молекула в клипе `[0,4]` → такт0/2 берут atoms molBar0,
  такт1/3 — molBar1 (atTick сдвинут на −1920); проверить на нечётной длине спана.
- **Границы спана**: `barInCell = startBar-1` и `startBar+lengthBars` → лейн молчит.
- **dynamics**: для каждого типа проверить конечные точки кривой (crescendo: 1-amount→1;
  arch: пик в середине; pulse: чётные=1, нечётные=1-amount) с заданным amount.
- **cell.velocity**: масштабирует все атомы; `velocity=0` → тишина.
- **validateCell**: ловит пересечение клипов, дубль moleculeId, >15 лейнов, out-of-range,
  несуществующий moleculeId.
- **Конвертер A/B**: для каждой из 20 клеток сравнить структуру hits по тактам legacy↔new
  (с поправкой на приближения variation/fill/probability); фиксировать расхождения.

### Components and Responsibilities

- `drumPatternTypes.ts` — финальные типы (см. выше); удаление legacy-полей.
- `DrumPatternEngine.assembleBar` — лейн-сборка (Runtime из 002); `weightedPick`/`seeded` утилиты.
- `drumCells.ts` — `convertLegacyCell()`, `validateCell()`; 20 клеток в новой модели.
- `drumMolecules.ts` — добавить одноатомные `crash`, `crash_sizzle` accent-молекулы.
- `admin-drum-constructor` CellEditor — таймлайн-редактор с валидацией инвариантов.
- Организмы — без изменений.

### Options and Trade-offs

- weightedPick «на каждый такт» (выбрано) vs «один раз на клип»: первый — вариативность и
  живость на отрезке (цель п.3); второй — предсказуемее, но статичнее и не отвечает «произвольно
  на отрезке». Веса позволяют сделать первый вариант сколь угодно стабильным (высокий вес базы).

## Assumptions

- `weightedPick` — на каждый такт спана (решение по «не знаю»); поведение тюнится весами.
- Одноатомные crash-молекулы (`crash`, `crash_sizzle`) добавляются как контент в `drumMolecules.ts`.
- Конвертер даёт музыкально близкий, но не побитово идентичный результат; допускается ручная доводка.
- Все активные клетки 4/4; barTicks = 4×480.
- Лейн играет максимум одну молекулу за такт (инвариант непересечения клипов).

## Risks

- High: одномоментный рефактор + переписывание 20 клеток. Mitigation: `validateCell` + A/B-сверка
  конвертера потакетно + тест-план идемпотентности.
- Medium: сворачивание variations в пулы по семье — эвристика. Mitigation: лог несопоставленных +
  ручная доводка; A/B.
- Medium: «на каждый такт» weightedPick при плоских весах может звучать пёстро. Mitigation:
  дефолтные веса база≫вариации; превью в редакторе.
- Low: тайлинг bars:2 при length не кратно 2 — обрезка по спану/такту (покрыто тестом).

## Open Questions

- [ ] Нет открытых вопросов — дизайн закрыт. (Следующий шаг — реализация; при разработке возможны
      мелкие уточнения весов/probability по слуху.)

## Visual Artifacts

| Artifact                        | Type       | Path                                            | Preview       | Purpose                                                                 |
| ------------------------------- | ---------- | ----------------------------------------------- | ------------- | ----------------------------------------------------------------------- |
| Модель данных v2 (лейны/пулы)   | Mermaid    | `output/files/data-model.mmd`                   | not generated | `DrumCell`→`DrumLane`→`DrumClip`→`WeightedMolecule`, dynamics, организм  |
| Сборка такта v2                 | Mermaid    | `output/files/assemble-bar-flow.mmd`            | not generated | Детерминированная лейн-сборка: probability + weightedPick + тайлинг      |
| Конвертер legacy→new (пример)   | Mermaid    | `output/files/converter-mapping.mmd`            | not generated | Маппинг полей `swing-16-verse` в лейны/клипы/пулы                        |
| Редактор-таймлайн v2 (эскиз)    | Excalidraw | `output/files/cell-timeline-editor.excalidraw`  | not generated | UX: лейны с probability, клипы со взвешенными пулами, инспектор velocity |

## Changes From Previous Iteration

- **Разрешено**: последний «не знаю» — weightedPick фиксирован «на каждый такт спана» (с
  обоснованием и заметкой, что тюнится весами).
- **Подтверждено/зафиксировано**: уникальность moleculeId — вся клетка; crash/crash_sizzle —
  одноатомные молекулы; 7 типов dynamics финальны; per-clip probability не вводится; лейнов ≤ 15
  (новый инвариант).
- **Добавлено**: черновик `convertLegacyCell()` с worked example для `swing-16-verse`; сигнатура и
  правила `validateCell()`; тест-план движка и валидатора.
- **Структура модели не менялась** относительно 002 — только доуточнения и артефакты реализации.
- Open Questions обнулены — дизайн закрыт.

## Next Steps

- Финализировать (`зафиксируй финальную версию`) — скопирует 003 в `final/`.
- Реализация (уже как код, вне grooming): типы → `assembleBar` + тесты → `convertLegacyCell`/
  `validateCell` + миграция 20 клеток + accent-молекулы → таймлайн-редактор в `admin-drum-constructor`.
