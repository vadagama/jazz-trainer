# SWING.md — Единый грув для всех инструментов

## Цель

Ввести сквозной параметр `swingRatio`, который управляет триольным оттенком оффбитных
восьмых одновременно для Rhodes (comping), Drums (ride) и будущих инструментов.
Сделать грув настраиваемым пользователем: от straight (0.50) до heavy shuffle (0.75).

---

## 1. Текущее состояние: три инструмента — три разных свинга

| Инструмент | Что сейчас | Где захардкожено | Проблема |
|-----------|-----------|-----------------|---------|
| **Rhodes** | `subdivision: 0.5` | `CompEvent.subdivision` в `SWING_PATTERNS` | Прямая восьмая — не свингует |
| **Drums ride** | `subdivision: 0.67` | `SWING_RIDE_OFFSETS` в `drumInstrument.ts` | Триольный оттенок, но захардкожен |
| **Bass** | отсутствует | `bassInstrument.ts` — все ноты на beat grid | Не участвует (walking bass играет straight — это музыкально правильно) |

**Факт**: Rhodes играет ровные восьмые (subdivision 0.5), а drums ride — триольные
(0.67). В реальном джазе ride и comping качают с одинаковым feel. Сейчас это
рассогласование разрушает грув.

---

## 2. Дизайн: swingRatio как сквозной параметр

### 2.1 Принцип

```
┌──────────────────────────────────────────────────────────────┐
│  UserSettings.swingRatio  0.50 … 0.75                        │
│  (выбирается пользователем в SettingsForm)                    │
└───────────────┬──────────────────────────────────────────────┘
                │
┌───────────────┴──────────────────────────────────────────────┐
│  TransportEngineOptions.swingRatio                            │
│  → попадает в ScheduleContext.swingRatio                     │
└───────────────┬──────────────────────────────────────────────┘
                │
        ┌───────┼───────┐
        ▼       ▼       ▼
    Rhodes   Drums   (Bass — не использует)
```

Единственный источник правды о груве — `swingRatio` в `ScheduleContext`.
Каждый инструмент применяет его **в момент планирования**, а не хранит
в своих константах. Никакой инструмент не хардкодит swing ratio.

### 2.2 Семантика subdivision после изменения

**Сейчас**: `subdivision` = дробь доли (0.5 = половина доли, 0.67 = 2/3 доли).
Это жёсткая привязка к конкретному таймингу — паттерн «знает», как он звучит.

**После изменения**: `subdivision > 0` = бинарный флаг «это оффбит». Реальный
тиковый offset вычисляется при планировании как `swingRatio * tpBeat`.

```ts
// БЫЛО (rhodesInstrument.ts:78):
eventTicks = barStartTicks + (event.beat - 1) * tpBeat
           + Math.round((event.subdivision ?? 0) * tpBeat);

// СТАЛО:
const isOffbeat = (event.subdivision ?? 0) > 0;
const subdivTicks = isOffbeat ? Math.round(ctx.swingRatio * tpBeat) : 0;
eventTicks = barStartTicks + (event.beat - 1) * tpBeat + subdivTicks;
```

Значение `subdivision` в определении паттерна остаётся `0 | 0.5` (или `0 | 0.67`
для `SWING_RIDE_OFFSETS`), но теперь это **не множитель**, а **индикатор оффбита**.
При `swingRatio = 0.50` (straight) поведение идентично текущему для Rhodes и
меняется для drums (с 0.67 на 0.50 — drums становятся straight).

### 2.3 Значения по умолчанию

| Параметр | Значение | Обоснование |
|---------|---------|------------|
| `swingRatio` default | `0.50` | Straight feel — обратная совместимость с Rhodes (subdivision 0.5) |
| Диапазон | `0.50 … 0.75` | 0.50 = straight, 0.66 = classic swing (2:1), 0.75 = heavy shuffle |
| Presets | Straight (0.50), Light (0.57), Classic (0.66), Shuffle (0.75) | Пользователь выбирает из пресетов + точная настройка слайдером |

Почему default = 0.50, а не 0.66:
- Rhodes-паттерны сейчас определены с subdivision 0.5 (ровная восьмая). Если
  мгновенно переключить на 0.66, их звучание изменится, что сломает ожидания.
- Пользователь явно выбирает степень свинга — это осознанное действие.
- Drums `swingRide` с default=0.50 станет `quarters` (ровные четверти), что
  эквивалентно отключению свинга. Пользователь включает свинг слайдером.

---

## 3. Изменения по слоям

### 3.1 `packages/music-core/src/audio/instrument.ts`

```diff
 export interface ScheduleContext {
   bpm: number;
   timeSignature: TimeSignature;
+  /** Swing ratio for offbeat eighth notes: 0.50 = straight, 0.66 = classic swing. */
+  swingRatio: number;
   scheduleClick(atTicks: number, beatType: BeatType): void;
   scheduleNote?(...): void;
   scheduleChord?(...): void;
   scheduleDrum?(...): void;
 }
```

### 3.2 `packages/music-core/src/audio/transportEngine.ts`

```diff
 export interface TransportEngineOptions {
   bpm?: number;
   timeSignature?: TimeSignature | string;
+  swingRatio?: number;  // default 0.50
   sink: ClickSink;
   noteSink?: NoteSink;
   chordSink?: ChordSink;
   drumSink?: DrumSink;
 }
```

В конструкторе:
```ts
this.swingRatio = opts.swingRatio ?? 0.50;
```

В `scheduleWindow()`:
```diff
 const ctx = {
   bpm: this.bpm,
   timeSignature: this.timeSignature,
+  swingRatio: this.swingRatio,
   scheduleClick: ...
   scheduleNote: ...
   scheduleChord: ...
   scheduleDrum: ...
 };
```

Добавить метод:
```ts
setSwingRatio(ratio: number): void {
  this.swingRatio = Math.max(0.50, Math.min(0.75, ratio));
}
```

### 3.3 `packages/music-core/src/audio/rhodesInstrument.ts`

Строка 78 — единственное место, где `subdivision` преобразуется в тики:

```ts
// БЫЛО:
const eventTicks = barStartTicks + (event.beat - 1) * tpBeat
                 + Math.round((event.subdivision ?? 0) * tpBeat);

// СТАЛО:
const isOffbeat = (event.subdivision ?? 0) > 0;
const subdivTicks = isOffbeat ? Math.round(ctx.swingRatio * tpBeat) : 0;
const eventTicks = barStartTicks + (event.beat - 1) * tpBeat + subdivTicks;
```

Никакие другие изменения в `rhodesVoicing.ts` не нужны — `subdivision` в паттернах
остаётся `0 | 0.5`, но интерпретируется как «оффбит или нет», а не как множитель.

### 3.4 `packages/music-core/src/audio/drumInstrument.ts`

Два места:

**A. Четверти ride (строка 103–110)** — оффбитов нет, свинг не применяется.
Изменений не требуется.

**B. Swing ride (строка 120)** — хардкоженый 0.67:

```ts
// БЫЛО:
const atTicks = barStart + hit.beatIdx * tpBeat
              + Math.round(hit.subdivision * tpBeat);

// СТАЛО:
const isOffbeat = hit.subdivision > 0;
const subdivTicks = isOffbeat ? Math.round(ctx.swingRatio * tpBeat) : 0;
const atTicks = barStart + hit.beatIdx * tpBeat + subdivTicks;
```

`SWING_RIDE_OFFSETS` не меняется — `subdivision: 0.67` остаётся в данных как
индикатор оффбита. Реальный тайминг берётся из `ctx.swingRatio`.

**C. Stir/hihat (строка 90, 99)** — всегда `subdivision = 0` (на долю).
Свинг не применяется. Изменений не требуется.

### 3.5 `packages/music-core/src/audio/bassInstrument.ts`

**Без изменений.** Walking bass в джазе играет ровные четверти — это
не баг, а музыкальная традиция. Контраст между straight bass и swinging
ride/comping создаёт грув (layered feel).

Для будущего: уровень сложности 7 (two-feel) и уровень 2 (root every beat)
могли бы опционально сдвигать слабые доли (beats 2, 4) на `(swingRatio - 0.5) * tpBeat`
для «ленивого» half-time feel. Это остаётся за скобками текущего дизайна.

### 3.6 `packages/shared/src/dto.ts`

```diff
 const UserSettingsDTOSchema = z.object({
   ...
   drumsRidePattern: z.enum(['quarters', 'swingRide']).optional(),
+  swingRatio: z.number().min(0.50).max(0.75).optional(),
 });
```

### 3.7 `apps/api/src/db/schema.ts`

```diff
 export const userSettings = sqliteTable('user_settings', {
   ...
   drumsRidePattern: text('drums_ride_pattern').notNull().default('swingRide'),
+  swingRatio: real('swing_ratio').notNull().default(0.50),
 });
```

### 3.8 `apps/api/drizzle/` — миграция

```sql
ALTER TABLE user_settings ADD COLUMN swing_ratio REAL NOT NULL DEFAULT 0.50;
```

### 3.9 `apps/api/src/services/auth.service.ts`

```diff
 function toSettingsDTO(row: typeof userSettings.$inferSelect): UserSettingsDTO {
   return {
     ...
     drumsRidePattern: row.drumsRidePattern,
+    swingRatio: row.swingRatio,
   };
 }
```

### 3.10 `apps/web/src/stores/useLocalSettingsStore.ts`

```diff
 const DEFAULTS: UserSettingsDTO = {
   ...
   drumsRidePattern: 'swingRide',
+  swingRatio: 0.50,
 };
```

### 3.11 `apps/web/src/engine/useTransport.ts`

```diff
 // В конструкторе TransportEngine:
 const engine = new TransportEngine({
   bpm: settings.bpm,
   timeSignature,
+  swingRatio: settings.swingRatio ?? 0.50,
   sink,
   noteSink,
   chordSink,
   drumSink,
 });

+// Реактивный эффект:
+useEffect(() => {
+  if (!engineRef.current) return;
+  engineRef.current.setSwingRatio(settings.swingRatio ?? 0.50);
+}, [settings.swingRatio]);
```

### 3.12 `apps/web/src/components/settings/SettingsForm.tsx`

Добавить секцию «Groove / Swing» после секции Drums:

```tsx
{/* Swing ratio */}
<FormField
  control={form.control}
  name="swingRatio"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Swing feel</FormLabel>
      <FormControl>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-14 text-right">
            {field.value === 0.50 ? 'Straight' :
             field.value === 0.57 ? 'Light' :
             field.value === 0.66 ? 'Classic' :
             field.value === 0.75 ? 'Shuffle' : ''}
          </span>
          <Slider
            min={0.50}
            max={0.75}
            step={0.01}
            value={[field.value ?? 0.50]}
            onValueChange={([v]) => field.onChange(v)}
          />
        </div>
      </FormControl>
      <FormDescription>
        Offbeat feel: straight (0.50) → classic swing (0.66) → heavy shuffle (0.75)
      </FormDescription>
    </FormItem>
  )}
/>
```

---

## 4. Тест-план

### 4.1 TransportEngine

| Тест | Ожидание |
|------|---------|
| `swingRatio` default = 0.50 | В ScheduleContext передаётся 0.50 |
| `setSwingRatio(0.66)` | В ScheduleContext передаётся 0.66 |
| `setSwingRatio(0.90)` | Clamp до 0.75 |
| `setSwingRatio(0.30)` | Clamp до 0.50 |

### 4.2 RhodesInstrument

| Тест | Ожидание |
|------|---------|
| `swingRatio = 0.50`, режим `charleston` | beat 2& на `beat * tpBeat + 0.5 * tpBeat` (как сейчас) |
| `swingRatio = 0.66`, режим `charleston` | beat 2& на `beat * tpBeat + 0.66 * tpBeat` |
| `swingRatio = 0.75`, режим `offbeat-2-4` | beat 2& на `beat * tpBeat + 0.75 * tpBeat`, beat 4& аналогично |
| `swingRatio = 0.50`, режим `wholeNotes` | без изменений (нет оффбитов) |

### 4.3 DrumInstrument

| Тест | Ожидание |
|------|---------|
| `swingRatio = 0.50`, `swingRide`, 4/4 | 6 ride-хитов на такт, оффбиты на `beat + 0.50 * tpBeat` |
| `swingRatio = 0.66`, `swingRide`, 4/4 | 6 ride-хитов, оффбиты на `beat + 0.66 * tpBeat` |
| `swingRatio = 0.75`, `swingRide`, 4/4 | 6 ride-хитов, оффбиты на `beat + 0.75 * tpBeat` |
| `swingRatio = 0.66`, `quarters`, 4/4 | 4 ride-хита, без оффбитов |
| `swingRatio = 0.66`, 3/4 | `swingRide` деградирует до `quarters` |
| stir/hihat при любом `swingRatio` | без изменений (всегда на долю) |

### 4.4 BassInstrument

| Тест | Ожидание |
|------|---------|
| Любой `swingRatio` | Тайминг не меняется |
| Все 7 complexity levels | Ноты на beat grid, без оффбитных сдвигов |

### 4.5 Интеграция

| Тест | Ожидание |
|------|---------|
| `swingRatio = 0.66` → Rhodes charleston + Drums swingRide | Оба инструмента имеют одинаковый оффбитный оттенок (0.66) |
| `swingRatio = 0.50` → Rhodes charleston + Drums swingRide | Оба инструмента в straight feel |
| Изменение `swingRatio` во время воспроизведения | Применяется на следующем scheduling window |

---

## 5. Что НЕ входит в этот дизайн

1. **Bass swing** — walking bass в джазе играет straight. Свингующий бас —
   особенность shuffle/blues, а не мейнстрим-джаза. Может быть добавлен
   позже как опция `bassSwingEnabled`.

2. **Автоматический swing ratio от темпа** — в реальном джазе свинг зависит
   от темпа (быстрее темп → straighter feel). Это остаётся за скобками;
   пользователь выбирает вручную.

3. **Swing для sixteenth-note (New Orleans feel)** — subdivision 0.25/0.75.
   Текущие паттерны не используют шестнадцатые. При появлении — модель
   расширяема: добавить `swingSixteenthRatio`.

4. **Metronome swing** — метроном всегда играет ровные доли, это его функция.

---

## 6. План внедрения (фазы)

### Фаза A — ядро (music-core)
1. Добавить `swingRatio` в `ScheduleContext` и `TransportEngineOptions`
2. Обновить `RhodesInstrument.schedule()` — заменить хардкод `subdivision * tpBeat` на `swingRatio`
3. Обновить `DrumInstrument.schedule()` — то же для swing ride pass
4. Написать unit-тесты

**Риск**: низкий. Обратная совместимость при `swingRatio = 0.50`.

### Фаза B — данные и API
5. Расширить `UserSettingsDTOSchema`
6. Добавить колонку в БД + миграция
7. Обновить `toSettingsDTO` и `PATCH /api/settings`
8. Обновить `useLocalSettingsStore` (defaults)

**Риск**: низкий. Новая optional колонка с default.

### Фаза C — фронтенд
9. Пробросить `swingRatio` в `useTransport`
10. Добавить `useEffect` для реактивного обновления
11. Добавить слайдер в `SettingsForm`

**Риск**: низкий. Только UI.

### Фаза D — верификация
12. Playwright: проверить, что слайдер меняет звук
13. Ручное прослушивание: straight vs classic swing vs shuffle

---

## 7. Сводка: что изменится для пользователя

| Элемент UI | Было | Стало |
|-----------|------|------|
| Настройка свинга | Нет (ride pattern quarters/swingRide — единственный «swing» контроль) | Слайдер 0.50–0.75 с пресетами (Straight / Light / Classic / Shuffle) |
| `drumsRidePattern` | `quarters` / `swingRide` | Остаётся без изменений |
| Звучание Rhodes | Всегда straight eighth (0.50) | Следует за `swingRatio` |
| Звучание Drums ride | `swingRide` = хардкод 0.67 | Следует за `swingRatio` |
| Звучание Bass | Без изменений | Без изменений |
