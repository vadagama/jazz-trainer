# Solution

## Mode

`architecture`

## Context

Итерация 002 фиксирует модель клетки после ответов пользователя на open questions 001.
Клетка становится **таймлайном лейнов**: лейн = роль (ride/hihat/kick/snare/fill/accent) с
собственной `probability` («иногда»); на лейне лежат непересекающиеся **клипы**; клип несёт
**взвешенный пул молекул**, из которого движок случайно (по весам, детерминированно-сидированно)
выбирает молекулу для каждого такта своего диапазона. Единый музыкальный уровень —
`cell.velocity`. Динамика — набор типов + `amount` (глубина). Организмы остаются
последовательностью клеток. Цель итерации — зафиксировать точный TypeScript-интерфейс,
детерминированную сборку, инварианты и план миграции всех клеток сразу.

## Input Summary

- Ответы на 7 open questions 001 (см. `input/prompt.md`): нет `replace`; единый `cell.velocity`;
  клип = взвешенный пул; организмы = последовательность клеток; миграция сразу; запрет
  пересечений клипов и дублей молекул; dynamics = тип + amount; probability на лейне;
  без двухуровневого zoom.
- Предыдущая итерация: `../001/output/solution.md` (таймлайн-модель с `mode`, `velocityMul`,
  двухуровневым zoom — частично отменено этой итерацией).

## Proposed Solution

`DrumCell` = `{ velocity, dynamics, lanes[] }`. `DrumLane` = `{ name, probability, clips[] }`.
`DrumClip` = `{ startBar, lengthBars, pool: {moleculeId, weight}[] }`. Движок для каждого
такта по каждому лейну находит клип, покрывающий `barInCell`; с вероятностью `lane.probability`
лейн звучит; молекула выбирается взвешенно-случайно из пула клипа (сид по `barInOrganism` +
имя лейна → идемпотентно); молекула тайлится по спану (`molBar = localBar % bars`, фикс `bars:2`);
атомы эмитятся с `vel = atom.vel × cell.velocity × dynMul`. Глушение грува не нужно — пустой
такт лейна = тишина. Инварианты: клипы лейна не пересекаются; `moleculeId` уникален в пределах
клетки. Миграция — сразу: конвертер превращает 20 legacy-клеток в лейны/клипы (groove → лейны
на всю длину со взвешенными пулами, куда сворачиваются variations; fill → fill-лейн с
`probability`; crash → accent-лейн). Организмы не меняются — это последовательность клеток.

## Key Decisions

- **Лейн — единица организации и вероятности** (`DrumLane.probability`) — реализует «иногда»
  сбивки/госты; сид по `(barInOrganism, laneName)` держит идемпотентность.
- **Клип несёт взвешенный пул** `{moleculeId, weight}[]`, а не один id — вариативность на
  отрезке (ответ 3); variations сворачиваются в пул грув-лейна.
- **Единый `cell.velocity`** масштабирует velocity молекул; `volumeMul` и per-clip `velocityMul`
  удалены (ответ 2).
- **Нет `mode: replace`** — глушение = отсутствие клипа на такте (ответ 1); модель упрощается.
- **`dynamics = { type, amount }`** — набор типов (steady/crescendo/decrescendo/arch/valley/
  wave/pulse) + глубина `amount` вместо фиксированных ±0.15 (ответ 7).
- **Инварианты: непересечение клипов лейна + уникальность `moleculeId` в клетке** (ответ 6) —
  проверяются валидатором и редактором.
- **Организмы неизменны** — последовательность клеток (ответ 4); таймлайн живёт внутри клетки.
- **Миграция всех 20 клеток сразу** конвертером (ответ 5); без двухрежимности в проде (legacy-
  путь можно снести после конвертации).

## Details

### Data Model (TypeScript, целевой)

```ts
export type DrumDynamicsType =
  | 'steady'       // ровно
  | 'crescendo'    // тише → громче
  | 'decrescendo'  // громче → тише
  | 'arch'         // тише → громче → тише (пик в середине)
  | 'valley'       // громче → тише → громче
  | 'wave'         // синус по всей длине
  | 'pulse';       // акцент через такт

export interface DrumDynamics {
  type: DrumDynamicsType;
  amount: number; // 0..1 — глубина изменения velocity
}

export interface WeightedMolecule {
  moleculeId: string;
  weight: number; // > 0
}

export interface DrumClip {
  startBar: number;         // 0-based, 0 ≤ startBar < cell.length
  lengthBars: number;       // ≥ 1, startBar + lengthBars ≤ cell.length
  pool: WeightedMolecule[]; // ≥ 1; взвешенный случайный выбор на КАЖДЫЙ такт спана
}

export interface DrumLane {
  name: string;         // роль/метка: 'ride'|'hihat'|'kick'|'snare'|'fill'|'accent'|...
  probability: number;  // 0..1 — шанс, что лейн звучит в данном такте
  clips: DrumClip[];    // клипы НЕ пересекаются по тактам
}

export interface DrumCell {
  id: string;
  style: DrumPatternStyle;
  length: 8 | 16 | 32;
  timeSignature: [4, 4] | [5, 4];
  velocity: number;     // 0..1 мастер-velocity (масштабирует velocity молекул)
  dynamics: DrumDynamics;
  lanes: DrumLane[];
  weight: number;       // для взвешенного выбора клетки организмом
}
```

Инварианты (валидатор `validateCell` + enforcement в редакторе):
- Клипы внутри лейна не пересекаются по диапазонам `[startBar, startBar+lengthBars)`.
- `startBar + lengthBars ≤ length` для каждого клипа.
- Каждый `moleculeId` встречается не более одного раза во всей клетке (по всем лейнам/клипам/пулам).
- `probability ∈ [0,1]`, `velocity ∈ [0,1]`, `amount ∈ [0,1]`, `weight > 0`.

### Runtime Behavior (детерминированная сборка такта)

```
dynMul = dynamicsMul(cell.dynamics, barInCell, cell.length)
hits = []
for lane in cell.lanes:
    clip = lane.clips.find(c => c.startBar ≤ barInCell < c.startBar + c.lengthBars)
    if !clip: continue
    if lane.probability < 1:
        if seeded(seed, barInOrganism, lane.name)() > lane.probability: continue   // «иногда»
    mol = weightedPick(clip.pool, seeded(seed, barInOrganism, lane.name + ':pick'))
    m   = moleculeOverrides?.[mol] ?? DRUM_MOLECULES[mol]
    localBar = barInCell - clip.startBar
    molBar   = localBar % m.bars                     // тайлинг 1/2-тактовых (фикс bars:2)
    for atom in m.atoms where floor(atom.atTick / barTicks) == molBar:
        vel = clamp01(atom.velocity * cell.velocity * dynMul)
        push { sound: atom.sound, atTick: atom.atTick - molBar*barTicks, velocity: vel, dur }
apply swing → resolve articulations → drop vel ≤ 0
return hits
```

- **Идемпотентность**: выход зависит только от `(cell, barInCell, barInOrganism, seed)`.
  Оба стохастических шага (probability и weightedPick) сидируются по `barInOrganism` + имени
  лейна — планировщик может пересобрать такт многократно, результат тот же.
- **barTicks** = `timeSignature[0] * 480`.

`dynamicsMul(dyn, bar, length)` с `progress = length>1 ? bar/(length-1) : 0`:

```
steady:      1
crescendo:   (1 - amount) + amount*progress
decrescendo: 1 - amount*progress
arch:        (1 - amount) + amount*sin(progress*π)
valley:      1 - amount*sin(progress*π)
wave:        1 - amount/2 + (amount/2)*sin(progress*2π)
pulse:       (bar % 2 == 0) ? 1 : 1 - amount
```

### Components and Responsibilities

- **`drumPatternTypes.ts`** — заменяет тип `DrumCell` на модель выше; добавляет `DrumLane`,
  `DrumClip`, `WeightedMolecule`, `DrumDynamics`, `DrumDynamicsType`. Удаляет legacy-поля
  (`grooveMoleculePool`, `variation*`, `fill*`, `crashType`, `volumeMul`, `dynamicsType`,
  `textureMoleculePool`).
- **`DrumPatternEngine.assembleBar`** — переписывается на лейн-сборку (см. Runtime); чистая/
  идемпотентная. `weightedPick` + `seeded` — вынести в утилиты.
- **`drumCells.ts`** — определения 20 клеток переписываются в новую модель (результат конвертера,
  доведённый вручную). Добавляется `validateCell()`.
- **`admin-drum-constructor` (CellEditor)** — таймлайн-редактор: лейны (со слайдером probability),
  клипы-спаны (старт/длина + редактор взвешенного пула), инспектор (`velocity`, `dynamics.type`,
  `dynamics.amount`). Валидация инвариантов на лету.
- **Организмы (`drumOrganisms.ts`)** — без изменений модели (секции → пулы клеток).

### Migration (сразу, все клетки)

Конвертер `convertLegacyCell(legacy): DrumCell`:
- `velocity` ← `volumeMul` (перенос как музыкальный уровень); `dynamics` ← `{ type: dynamicsType, amount: 0.15 }` (сохранить текущее ощущение).
- **groove**: каждую молекулу `grooveMoleculePool` кладём в свой лейн (по семье звука), клип `[0,length]`, пул `[{mol, weight: 10}]`. Молекулы `variationMoleculePool` сворачиваем в пул соответствующего лейна с меньшим весом (по тегу/семье), давая вариативность (ответ 3). Что не мэтчится по семье → отдельный лейн `variation` на всю длину с `probability` < 1.
- **fill**: лейн `fill`, клипы по 1 такту в позициях `fillEveryBars-1, 2*fillEveryBars-1, …`, пул = `fillMoleculePool`, `probability` (напр. 0.6) для «иногда».
- **crash**: лейн `accent`, 1-тактовые клипы на crash-барах; `crashType` (DrumSound) оборачивается в маленькую accent-молекулу (одноатомную) — вводим фикстур-молекулы `crash`/`crash_sizzle`.
- Прогнать конвертер, вручную довести «ручные» аранжировки (вторая половина, брейки=пустые такты), A/B-сверить звук, зафиксировать в `drumCells.ts`, снести legacy-путь.

### Options and Trade-offs

- **Одномоментная замена модели (выбрано, ответ 5)** — чистый код без двухрежимности; риск
  выше, гасится тестами + A/B-сверкой конвертера. (В 001 рекомендовалась двухрежимность —
  отменено пользователем в пользу «мигрируем сразу».)
- Альтернатива (двухрежимность) — отклонена: пользователь хочет один механизм.

### Editor UX (без двухуровневого zoom)

Грид «такты × лейны»; клип — блок на диапазоне тактов (старт/длина числами в MVP, drag/resize
позже). У лейна — слайдер `probability` и метка роли. Инспектор клетки — `velocity`,
`dynamics.type`, `dynamics.amount`. Редактор запрещает пересечение клипов и добавление молекулы,
уже присутствующей в клетке. Редактирование атомов молекулы остаётся в отдельной секции
«Молекулы» (двухуровневый zoom не делаем — ответ 9). См.
`output/files/cell-timeline-editor.excalidraw`.

### Quality Attributes

- Детерминизм/идемпотентность — сохранены (сид по `barInOrganism`+lane).
- Производительность — O(lanes) на такт; лейнов единицы.
- Тестируемость — явные лейны/клипы + инварианты легко покрываются.

## Assumptions

- Все активные клетки 4/4; barTicks = `4*480`.
- `weightedPick` возвращает одну молекулу на такт (вариативность по тактам), а не одну на весь клип.
- `cell.velocity` — мультипликатор 0..1 (клип к 1.0); повышать громче оригинала не нужно.
- crash представим одноатомной accent-молекулой (иначе всё — молекулы, единая модель).
- Лейн играет максимум одну молекулу за такт (один активный клип на лейн по инварианту непересечения).

## Risks

- High: одномоментный рефактор `assembleBar` + переписывание 20 клеток → риск регресса звука.
  Mitigation: конвертер + A/B-сверка со старым выходом по каждой клетке/такту + тесты идемпотентности.
- Medium: сворачивание variations в пулы по «семье звука» — эвристика может ошибиться.
  Mitigation: ручная доводка после конвертера; лог несопоставленных молекул.
- Medium: инвариант «уникальность moleculeId в клетке» может конфликтовать с желанием
  переиспользовать одну молекулу в двух ролях. Mitigation: клонировать молекулу под новым id
  либо ослабить инвариант до «уникальности в пределах лейна» (нужно подтверждение).
- Low: тайлинг bars:2 при length, не кратном 2 — обрезка по спану. Mitigation: тест на нечётной длине.
- Low: `pulse`/`wave` при малом length дают резкие скачки. Mitigation: кламп amount, превью.

## Open Questions

- [ ] `weightedPick` — выбор молекулы на КАЖДЫЙ такт спана, или один раз на «проход» клипа
      (повтор до конца спана)? (Итерация приняла «на каждый такт» — подтвердить.)
- [ ] Уникальность `moleculeId` — строго в пределах ВСЕЙ клетки, или достаточно в пределах лейна?
      (Влияет на переиспользование молекулы в разных ролях.)
- [ ] crash: заводим одноатомные accent-молекулы (`crash`, `crash_sizzle`) как контент, ок?
- [ ] Набор `DrumDynamicsType` — предложенных 7 достаточно, или нужен ещё (напр. `step`,
      ручной `envelope[]`)?
- [ ] Нужна ли per-clip probability дополнительно к per-lane (напр. разные шансы у разных клипов
      одного лейна), или per-lane достаточно?
- [ ] Лейны — фиксированный enum ролей или свободные метки (сколько лейнов на клетку максимум)?

## Visual Artifacts

| Artifact                        | Type       | Path                                            | Preview       | Purpose                                                                 |
| ------------------------------- | ---------- | ----------------------------------------------- | ------------- | ----------------------------------------------------------------------- |
| Модель данных v2 (лейны/пулы)   | Mermaid    | `output/files/data-model.mmd`                   | not generated | `DrumCell`→`DrumLane`→`DrumClip`→`WeightedMolecule`, dynamics, организм  |
| Сборка такта v2                 | Mermaid    | `output/files/assemble-bar-flow.mmd`            | not generated | Детерминированная лейн-сборка: probability + weightedPick + тайлинг      |
| Редактор-таймлайн v2 (эскиз)    | Excalidraw | `output/files/cell-timeline-editor.excalidraw`  | not generated | UX: лейны с probability, клипы со взвешенными пулами, инспектор velocity |

## Changes From Previous Iteration

Итерация переопределяет модель из 001 по ответам пользователя:
- **Добавлено**: `DrumLane` с `probability` (per-lane «иногда»); взвешенный пул `WeightedMolecule[]`
  в клипе (вместо одиночного `moleculeId`); `DrumDynamics { type, amount }` с расширенным набором
  типов (arch/valley/pulse) и настраиваемой глубиной; инварианты (непересечение клипов,
  уникальность moleculeId в клетке); конкретный TypeScript-интерфейс; правило сида для
  идемпотентности при probability+weightedPick.
- **Изменено**: `cell.velocity` теперь ЕДИНСТВЕННЫЙ velocity-контрол (масштабирует молекулы);
  миграция — одномоментная (в 001 рекомендовалась двухрежимность — заменено на «мигрируем сразу»).
- **Удалено (отменяет 001)**: `mode: 'layer'|'replace'` (глушение = пустой такт); per-clip
  `velocityMul`; `volumeMul`; двухуровневый zoom (таймлайн→таблица молекулы); опциональные
  legacy-поля в проде (сносим после конвертации).
- **Без изменений**: организмы = последовательность клеток; фикс `bars:2` через тайлинг.

## Next Steps

- Ответить на open questions (частота weightedPick; область уникальности moleculeId; набор
  DrumDynamicsType; per-clip probability; enum лейнов).
- Итерация 003 (по желанию): черновик `convertLegacyCell()` на 1–2 реальных клетках с A/B-сверкой
  выхода; сигнатура `validateCell()`; тест-план идемпотентности (probability/weightedPick/тайлинг/
  границы спана).
- Прототип таймлайн-редактора (MVP на числовых полях) поверх `admin-drum-constructor`.
