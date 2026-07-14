# Piano Extended Arrangement v2 — гибкая аранжировка без взрыва молекул

> **Статус:** 🟡 Проект (vision) — **замещает** `PIANO-EXTENDED-ARRANGEMENT.md`
> **Связанные модули:** `pianoInstrument.ts`, `pianoVoicing.ts`, `pianoUpperStructures.ts`, `pianoMolecules.ts`, `pianoCells.ts`, `pianoOrganisms.ts`, `pianoPatternTypes.ts`, `pattern/engine.ts`, `pattern/types.ts`; конструктор — `admin-piano-constructor/*`, `admin-constructor-shared/CellEditor.tsx`
> **Дата:** 2026-07-12

---

## 0. TL;DR

Документ v1 предложил закодировать каждую фактуру (voicing, надстройку, проходящий аккорд) как **отдельную молекулу**. Это ведёт к комбинаторному взрыву: `ритм × voicing × надстройка × качество аккорда` = тысячи молекул. Часть v1 уже реализована, но **звук из молекул не извлекается** — плеер игнорирует высоты и заново строит аккорд движком войсинга.

**Решение v2 (по итогам обсуждения):** развести аранжировку на **три независимых слоя**, которые комбинируются на воспроизведении, а не запекаются в данные:

1. **Ритм** — молекула описывает *когда*, *как громко*, *какой длительности* и *какую роль голоса* играть. Больше **никаких абсолютных интервалов** в атомах.
2. **Гармония** — voicing-движок (`buildPianoVoicing` + `suggestUpperStructure`) резолвит *какие ноты* звучат, исходя из **реального качества аккорда** под тактом и **одной пользовательской настройки** — уровня напряжения (`tension`).
3. **Гуманизация** — уже реализована; остаётся как есть.

Итог: `N` ритмов + `M` уровней войсинга/напряжения дают `N + M` сущностей вместо `N × M`. Надстройки перестают быть молекулами — это режим движка, управляемый пользователем.

---

## 1. Что уже реализовано (факт против v1)

Прежде чем проектировать, зафиксируем реальное состояние кода — оно расходится и с v1, и с интуицией.

| Возможность v1 | Заявлено в v1 | Фактически в коде | Где |
|---|---|---|---|
| Категории `upper`, `fill` | добавить | ✅ есть | `pattern/types.ts:35-42` |
| Молекулы надстроек | создать 8–12 | ✅ 7 шт. | `pianoMolecules.ts:511-624` |
| Молекулы проходящих | создать 8–12 | ✅ 10 шт. | `pianoMolecules.ts:626-756` |
| Multi-clip пул в клетках | ввести | ✅ есть | `pianoCells.ts` (extended-клетки) |
| Humanize (velocity/spread/phrasing/timing) | реализовать | ✅ полностью | `pianoInstrument.ts:41-227, 495-545` |
| `intervalToMidi` (транспозиция) | «ключевой инсайт» | ✅ написан | `pianoVoicing.ts:248-257` |
| Upper Structure Engine | спроектировать | ✅ написан модуль | `pianoUpperStructures.ts` |
| Веса пула `{moleculeId, weight}` | §4.4 | ❌ **не существует** — `pool: string[]` | `pattern/types.ts:91-98` |
| Надстройки **звучат** | подразумевалось | ❌ **нет** — см. §2 | — |
| US-движок подключён к плееру | §6 | ❌ **не вызывается нигде** | grep пусто |

> **Вывод:** инфраструктура (типы, данные, функции) на 80% присутствует, но **звуковысотный слой не соединён с планировщиком**. v2 — это не «написать с нуля», а «соединить правильно и убрать запекание высот в молекулы».

---

## 2. Диагноз: три корневые проблемы

### 2.1. Молекула запекает voicing → мнимый взрыв

Groove-молекула жёстко фиксирует интервалы одного войсинга (rootless3 = `3, 7, 9`):

```ts
// pianoMolecules.ts:32-41 — reference voicing зашит в молекулу
const VOICING_NOTES = ['3', '7', '9'];
function voicingAtoms(tick, vel, dur) {
  return VOICING_NOTES.map((n, i) => atom(n, tick, vel * (0.92 + i * 0.06), dur));
}
```

Надстройка запекает интервалы **под конкретное качество аккорда**:

```ts
// pianoMolecules.ts — три РАЗНЫЕ молекулы на один музыкальный приём:
'piano-us-bII-dom' : atoms b2, 4, b6   // только для dominant
'piano-us-II-maj'  : atoms 2, #4, 6    // только для major
'piano-us-bIII-min': atoms b3, 5, b7   // только для minor
```

Чтобы покрыть «тот же ритм × другой войсинг × другое качество аккорда», нужна новая молекула на каждую комбинацию. Это и есть страх «тысячи молекул» — обоснованный.

Хуже: движок выбирает молекулу из пула **не глядя на аккорд** (`poolIndex` — детерминированный хеш от номера такта, `pattern/engine.ts:56-59`). `MoleculeConditions` содержит только барабанные флаги (`requireRide`, `requireSnare`…), нет `requireQuality`. Значит `piano-us-II-maj` (интервалы для major) может выпасть на доминанте → теоретически неверные ноты.

### 2.2. Гармония из молекул **не звучит** (главный разрыв)

В реальном аудио-пути высоты из молекулы **отбрасываются**:

```ts
// pianoInstrument.ts:362-366 — scheduleWithPatternEngine
const chord = this.timeline.getChordAtTick(eventTicks, sig);
const voicing = buildPianoVoicing(chord, this.density, this.prevVoicing); // ← строит заново
this.prevVoicing = voicing;
// из hit берутся ТОЛЬКО atTick, velocity, durationTicks. hit.sound игнорируется.
```

Следствия:
- Интервальное содержимое upper/fill-молекул (`b2`, `#11`, …) **никогда не воспроизводится** в аранжировке — только в превью конструктора (`usePianoPreview.ts:123`).
- `suggestUpperStructure` не вызывается **нигде** (`pianoUpperStructures.ts` — мёртвый экспорт).
- Флаг `pianoUpperStructures: z.boolean().optional()` в `dto.ts:79` не имеет потребителя.

**Это неожиданно упрощает v2:** в рантайме молекула уже де-факто — чистый ритмический скелет. Нужно легализовать это в модели и подключить гармонический слой отдельно.

### 2.3. Конструктор: нечитаемый пул + рассинхрон контракта

- `CellEditor.tsx:440` склеивает лейблы всех молекул пула через `/`:
  ```tsx
  <span className="break-words">{clip.pool.map((p) => labelFor(p)).join('/')}</span>
  ```
  Длинные описательные лейблы пианино в узком блоке (`BAR_W = 150px`) сливаются в мусор («Basie 2 & 4 — sparse, punchy/Half Notes — chords on 1 and 3/…»). Данные корректны — дефект рендера.
- Молекулы редактируются как piano-roll с абсолютными интервалами (`PianoMoleculeTable`), хотя эти интервалы в аранжировке не звучат — конструктор вводит пользователя в заблуждение.
- Zod-контракт `PianoSoundSchema = /^\d{1,3}$/` (MIDI) в `shared/src/piano.ts` противоречит сид-молекулам с интервалами (`'b7'` не пройдёт валидацию «Опубликовать в код»).

---

## 3. Целевая архитектура: три слоя

```
                        ┌─────────────────────────────────────┐
                        │        PianoOrganism (L3)            │
                        │   verse → chorus → bridge (форма)    │
                        └──────────────────┬──────────────────┘
                                           │ sectionMap
                        ┌──────────────────┼──────────────────┐
                        ▼                  ▼                  ▼
                 ┌────────────┐     ┌────────────┐     ┌────────────┐
                 │ PianoCell  │     │ PianoCell  │     │ PianoCell  │  ← Слой 1: РИТМ
                 │ lanes×clips│     │            │     │            │    (когда/роль/громкость)
                 └─────┬──────┘     └────────────┘     └────────────┘
                       │ hits (role + tick + vel + dur), БЕЗ высот
                       ▼
        ┌──────────────────────────────────────────────────────────┐
        │                    ГАРМОНИЧЕСКИЙ СЛОЙ (Слой 2)              │  ← резолвит ВЫСОТЫ
        │  buildVoicing(chord.quality, density, tension, prevVoicing)│    на воспроизведении
        │    density : shell2 | rootless3 | rootless4 | quartal      │
        │    tension : clean | moderate | altered | max  ← настройка │
        │      └─ tension>clean → suggestUpperStructure(chord)       │
        │  role → какие ноты войсинга взять (full / shell / top / US)│
        └───────────────────────────┬──────────────────────────────┘
                                     ▼
        ┌──────────────────────────────────────────────────────────┐
        │                  ГУМАНИЗАЦИЯ (Слой 3, уже есть)            │
        │  timing rush/lag · phrasing · chord spread · jitter · vel  │
        └───────────────────────────┬──────────────────────────────┘
                                     ▼
                              scheduleEvent → Tone.js
```

Ключевой принцип: **молекула не знает нот, движок не знает ритма, гуманизация не знает ни того ни другого.** Слои ортогональны и комбинируются в `scheduleWithPatternEngine`.

---

## 4. Слой 1 — Ритм: молекула как voice-role скелет

### 4.1. Новая модель атома

Атом больше не хранит интервал/MIDI. Он хранит **роль голоса** — какую часть текущего войсинга извлечь:

```ts
// pattern/types.ts — расширяем/уточняем для пиано
export type VoiceRole =
  | 'chord'   // весь текущий войсинг (по умолчанию)
  | 'shell'   // только 3 + 7 (опора)
  | 'top'     // верхний голос (мелодический акцент)
  | 'bass'    // нижний голос / корень (для two-hand, walking-совместимости)
  | 'upper'   // надстройка поверх shell (если tension позволяет)
  | 'tension' // только цветные тоны (9/11/13/alt) — «краска»

export interface Atom<TSound extends string = string> {
  sound: TSound;        // для пиано TSound = VoiceRole (было: интервал/MIDI строкой)
  atTick: number;
  velocity: number;
  durationTicks: number;
}
```

```ts
// pianoPatternTypes.ts
export type PianoAtom = Atom<VoiceRole>;   // было Atom<string>
```

### 4.2. Как это выглядит в молекуле

```ts
// БЫЛО (v1): ритм + запечённый войсинг rootless3 + запечённая надстройка
{
  id: 'piano-us-bII-dom',
  atoms: [
    atom('3', B1, 0.48, PPQ), atom('b7', B1, 0.42, PPQ),
    atom('b2', B1 + 20, 0.5, PPQ * 2), atom('4', ...), atom('b6', ...),
  ],
  category: 'upper',
}

// СТАЛО (v2): чистый ритм, роль = 'chord'. Надстройка — забота движка.
{
  id: 'piano-charleston',
  label: 'Charleston — 1 + 2&',
  shortLabel: 'Charleston',           // ← новое поле (для UI, см. §7)
  bars: 1,
  atoms: [
    atom('chord', B1,       0.55, PPQ),        // удар на 1
    atom('chord', B2 + _8,  0.50, PPQ * 1.5),  // удар на 2&
  ],
  category: 'groove',
  tags: ['charleston', 'syncopated'],
  complexity: { min: 1, max: 2 },
}
```

Одна молекула `piano-charleston` теперь звучит корректно на **любом** аккорде и с **любым** уровнем напряжения — войсинг подставит движок.

### 4.3. Что это убивает

| Раньше требовалось | Теперь |
|---|---|
| charleston × 4 density × 4 tension × 5 quality = 320 молекул | **1** молекула charleston |
| 7 upper-молекул (по одной на quality) | **0** — надстройка резолвится движком |
| 10 passing-молекул с запечёнными нотами | ритмический скелет passing + генерация нот движком (§6) |

Итоговый инвентарь сжимается с ~225 записей до ~30–45 чистых ритмов × 5 стилей, при этом гармоническая палитра **расширяется**, а не сужается.

### 4.4. Совместимость с барабанами

`pattern/types.ts` — общий движок для барабанов и пиано. Барабаны используют `Atom<DrumSound>`, пиано — `Atom<VoiceRole>`; параметр `TSound` уже generic, поэтому смена смысла `sound` для пиано **не затрагивает барабаны**. `assembleBar` прокидывает `sound` как есть — интерпретацию роли добавляем на пиано-слое (`scheduleWithPatternEngine`), не в generic-движке.

---

## 5. Слой 2 — Гармония: voicing-движок + уровень напряжения

### 5.1. Уровень напряжения (единственная пользовательская ручка надстроек)

Согласно решению — **один глобальный параметр** вместо тумблеров на каждую надстройку:

```ts
export type TensionLevel = 'clean' | 'moderate' | 'altered' | 'max';
```

| Уровень | Поведение | Музыкальный смысл |
|---|---|---|
| `clean` | Только `density`-войсинг (shell/rootless/quartal). US выключен. | «Учебное», прозрачное звучание |
| `moderate` | Мягкие расширения (9, 13) поверх войсинга; US изредка на доминантах. | Стандартный джазовый комбо-звук |
| `altered` | US активно на доминантах (♭II/♭VI/dim), альтерации ♭9/♯9/♯11/♭13. | Пост-боп, напряжённые доминанты |
| `max` | US везде, где уместно по качеству; плотные надстройки. | Модальный/фри, McCoy/Herbie |

Пользователь двигает **одну** ручку — движок сам решает, где и какую надстройку применить, опираясь на **реальное** качество аккорда.

### 5.2. Подключение `suggestUpperStructure` к войсингу

Ключевое соединение, которого сейчас нет. `buildPianoVoicing` получает `tension` и при необходимости запрашивает надстройку:

```ts
// pianoVoicing.ts — расширенная сигнатура
export function buildPianoVoicing(
  chord: ChordSymbol,
  density: PianoVoicingDensity,
  prev: number[] | null,
  tension: TensionLevel = 'clean',
  seed = 0,                                  // ← детерминизм вместо Math.random()
): number[] {
  const base = buildBaseVoicing(chord, density, prev); // текущая логика §4 PIANO.md
  if (tension === 'clean') return base;

  const us = suggestUpperStructure(chord, harmonicFunction(chord), tension, seed);
  if (!us) return base;

  const upperNotes = us.intervals.map((iv) => intervalToMidi(chord.root, iv));
  return mergeVoicing(base, upperNotes, density, prev); // voice-leading по-прежнему применяется
}
```

Необходимые правки в `pianoUpperStructures.ts`:
- **Детерминизм:** заменить `Math.random()` на seeded-выбор (тот же LCG, что `poolIndex`) — иначе аранжировка не воспроизводима (регресс против seeded-движка).
- **Параметр `tension`:** фильтровать/взвешивать `US_TABLE` по уровню (на `moderate` — только мягкие; на `max` — все).
- **`harmonicFunction(chord)`** — вывести функцию (tonic/subdominant/dominant) из позиции в сетке (уже есть данные аккорда в `ChordTimeline`).

### 5.3. Роль голоса → выбор нот из войсинга

`scheduleWithPatternEngine` перестаёт слепо строить полный аккорд — он извлекает из войсинга ту часть, что задаёт роль атома:

```ts
// pianoInstrument.ts:362-366 — новое
const chord = this.timeline.getChordAtTick(eventTicks, sig);
const voicing = buildPianoVoicing(chord, this.density, this.prevVoicing, this.tension, seed);
this.prevVoicing = voicing;

const notes = selectRole(voicing, hit.sound /* VoiceRole */, chord, this.density);
// selectRole: 'chord'→все; 'shell'→[3,7]; 'top'→[max]; 'bass'→[root/min]; 'upper'/'tension'→надстроечные тоны
```

Теперь `hit.sound` **используется** (как роль), а не отбрасывается.

### 5.4. Проходящие аккорды (passing) — как ритмический слой, не как ноты

`fill`-молекулы passing тоже становятся ритмом + флагом типа подхода; конкретные ноты генерирует движок относительно **следующего** аккорда:

```ts
{
  id: 'piano-pass-chromatic-above',
  atoms: [ atom('chord', B4, 0.42, _8) ],   // ритм: удар на 4-ю долю
  category: 'fill',
  tags: ['passing', 'chromatic-above'],     // ← тип подхода читает движок
}
```

Движок в `scheduleWithPatternEngine` при наличии тега `passing` и следующего аккорда строит подход (`chromatic-above` = следующий войсинг на +1 полутон, разрешается вниз). Это заменяет примитивный `applyPassingChord` и не плодит молекулы под каждый аккорд.

---

## 6. Слой 3 — Гуманизация

Реализована полностью (`pianoInstrument.ts:41-227, 495-545`): rush/lag, phrasing-арка, chord spread, per-note jitter, velocity variation, fast-path при выключенных эффектах. **Изменений не требуется.** В v2 остаётся последним звеном пайплайна (см. диаграмму §3). Раздел сохранён для полноты картины трёх слоёв.

---

## 7. Фикс конструктора (UI)

### 7.1. Пул в CellEditor — чипы вместо склейки

Причина бага — `CellEditor.tsx:440`. Решение (по выбору — чипы + короткие имена):

```tsx
// БЫЛО:
<span className="break-words">{clip.pool.map((p) => labelFor(p)).join('/')}</span>

// СТАЛО: каждая молекула — отдельный компактный чип по shortLabel, с переносом
<div className="flex flex-wrap gap-0.5">
  {clip.pool.map((p) => (
    <span key={p} className="rounded bg-primary/20 px-1 text-[10px] leading-tight">
      {shortLabelFor(p)}
    </span>
  ))}
</div>
```

- Добавить в модель молекулы поле **`shortLabel: string`** (напр. `'Charleston'`, `'Basie 2&4'`, `'Half'`). Полный `label` остаётся для карточки редактора и тултипа.
- `strategy.moleculeLabel` дополнить `moleculeShortLabel`; тултип клипа (`title=`) оставить полным списком через `, `.

### 7.2. Piano-roll молекулы — редактируем роли, а не интервалы

`PianoMoleculeTable` перестаёт показывать 17 интервальных строк (R, ♭3, 3, … 13). Вместо этого — **дорожки ролей** (`chord`, `shell`, `top`, `bass`, `upper`, `tension`), где пользователь ставит ритмические события. Это устраняет ложь «нарисованные ноты не звучат» и делает редактор честным отражением рантайма.

Превью (`usePianoPreview.ts`) резолвит роли через новый `buildPianoVoicing(chord, density, prev, tension)` на демо-аккорде — превью совпадает с реальной аранжировкой, чего сейчас нет.

### 7.3. Синхронизация zod-контракта

`shared/src/piano.ts`: заменить `PianoSoundSchema = z.string().regex(/^\d{1,3}$/)` на enum ролей:

```ts
export const PianoSoundSchema = z.enum(['chord', 'shell', 'top', 'bass', 'upper', 'tension']);
```

Иначе «Опубликовать в код» из конструктора будет падать на валидации (сид-молекулы её сейчас не прошли бы).

---

## 8. Настройки в UI (конструктор фортепиано)

```
┌─ Piano Settings ──────────────────────────────┐
│                                                │
│  Voicing Density:  [rootless3 ▾]               │  ← какие ноты (толщина)
│  Tension:          [ clean ·─●──── max ]       │  ← НОВОЕ: одна ручка надстроек
│  Comping Profile:  [swing-sparse ▾]            │  ← какой ритм (клетка/организм)
│  Randomization:    [moderate ▾]                │
│                                                │
│  ── Humanize ──────────────────────────────    │
│  Timing Jitter:      [══════●═════] 6 ms       │
│  Velocity Variation: [medium ▾]                │
│  Chord Spread:       [══════●═════] 8 ms       │
│  Phrasing:           [expressive ▾]            │
│  Humanize Timing:    [slight-lag ▾]            │
│                                                │
└────────────────────────────────────────────────┘
```

Вместо тумблеров «☑ Upper Structures / ☑ Passing Chords» из v1 — **один слайдер `Tension`**. Passing включается автоматически на `moderate+`. Это отражает решение «надстройки выбираются одной пользовательской настройкой напряжения».

Хранение: `PianoSettings` в `StyleProfile` дополнить `tension: TensionLevel` (рядом с `voicingDensity`); `dto.ts` — заменить бесхозный `pianoUpperStructures: boolean` на `tension: enum`.

---

## 9. План миграции (фазы)

Порядок минимизирует поломки: сначала соединяем то, что уже написано (быстрый слышимый эффект), потом чистим модель.

### Фаза 1 — Подключить гармонию к звуку ⚡ (наибольший эффект)
**Файлы:** `pianoInstrument.ts`, `pianoVoicing.ts`, `pianoUpperStructures.ts`, `dto.ts`
1. Добавить `tension: TensionLevel` в `PianoSettings`/`dto`, ручку в UI-настройки.
2. Сделать `suggestUpperStructure` детерминированной (seed) и принимающей `tension`.
3. Расширить `buildPianoVoicing(..., tension, seed)` — вызывать US при `tension>clean`.
4. В `scheduleWithPatternEngine` прокинуть `tension` и `seed`.
> Эффект: надстройки **впервые зазвучат**, управляемые одной ручкой. Молекулы пока прежние.
> Оценка: 4–6 ч.

### Фаза 2 — Роли голосов вместо интервалов
**Файлы:** `pattern/types.ts` (или пиано-локальный тип), `pianoPatternTypes.ts`, `pianoInstrument.ts`
1. Ввести `VoiceRole`; `PianoAtom = Atom<VoiceRole>`.
2. Реализовать `selectRole(voicing, role, chord, density)`; использовать `hit.sound` как роль.
3. Убедиться, что барабанный путь не затронут (generic `TSound`).
> Оценка: 4–5 ч.

### Фаза 3 — Переписать сид-молекулы как чистый ритм
**Файлы:** `pianoMolecules.ts`
1. Groove-молекулы → `atom('chord', …)` (сохранить ритмику, убрать `VOICING_NOTES`).
2. Удалить 7 upper-молекул (заменены движком §5).
3. Passing-молекулы (`fill`) → ритм + тег типа подхода (§5.4).
4. Добавить `shortLabel` всем молекулам.
> Оценка: 3–4 ч.

### Фаза 4 — Passing как слой движка
**Файлы:** `pianoInstrument.ts`, `pianoRandomizer.ts`
1. Генерация подходов по тегу + следующему аккорду; заменить `applyPassingChord`.
> Оценка: 3–5 ч.

### Фаза 5 — Конструктор
**Файлы:** `CellEditor.tsx`, `PianoMoleculeTable.tsx`, `pianoStrategy.ts`, `usePianoPreview.ts`, `shared/src/piano.ts`
1. Чипы пула по `shortLabel` (фикс `CellEditor.tsx:440`).
2. Piano-roll молекулы → дорожки ролей.
3. `PianoSoundSchema` → enum ролей; превью через новый войсинг.
> Оценка: 6–8 ч.

### Фаза 6 — Чистка legacy
1. Удалить устаревшие копии `packages/plugins/instruments/upright-piano/src/piano*.ts` (модель `sound:'chord'`, нигде не импортируются) или свести к реэкспорту.
2. Обновить `docs/PIANO.md` (разделы §4, §6, §8, §9).
> Оценка: 2–3 ч.

---

## 10. Риски и ограничения

| Риск | Серьёзность | Митигация |
|---|---|---|
| Смена смысла `atom.sound` ломает барабаны | Высокая | `TSound` уже generic; интерпретация роли только на пиано-слое, generic `assembleBar` не трогаем. Тесты барабанов — регресс-гейт. |
| Недетерминизм US-движка (Math.random) | Высокая | Обязательно seed от `barIndex` (как `poolIndex`), иначе аранжировка не воспроизводима. |
| Существующие сид-клетки ссылаются на удаляемые upper/fill молекулы | Средняя | Миграционный маппинг ID; удалять молекулы только после правки клеток (Фаза 3 после/вместе с обновлением `pianoCells.ts`). |
| `tension: max` → перегруженное звучание | Средняя | Voice-leading `buildPianoVoicing` уже ограничивает span (>24 полутонов) и потолок C6; US сливается через `mergeVoicing` с тем же ограничением. |
| US конфликтует с Rhodes | Средняя | Расширить `pianoRhodesInteraction.ts` — Rhodes уступает надстроечный регистр при `tension>moderate`. |
| Конструктор публикует несовместимые данные | Средняя | Синхронизировать `PianoSoundSchema` (Фаза 5) до включения «Опубликовать в код» для новой модели. |

---

## 11. Открытые вопросы (для следующей итерации)

1. **`bass`-роль и two-hand voicing** — нужна ли левая рука (корни/walking) в фортепианном слое, или это остаётся за басом? Влияет на набор ролей.
2. **Tension per-section** — сейчас глобальная ручка. Если понадобится «verse clean → chorus altered», это уходит в `OrganismSection` (обсуждалось как альтернатива, отложено).
3. **Веса пула** — вводить ли `{ id, weight }[]` вместо `string[]`, или детерминированный `poolIndex` достаточно? v1 предполагал веса, кода нет; решение отложено до реальной потребности в вариативности.

---

*Документ создан: 2026-07-12. Замещает `docs/PIANO-EXTENDED-ARRANGEMENT.md` (v1).*
*Связанные документы: `docs/PIANO.md` (текущая реализация), `docs/RHODES.md` (комплементарный слой), `docs/DRUMS.md` (общий pattern-движок).*
