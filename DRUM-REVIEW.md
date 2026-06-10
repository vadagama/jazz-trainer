# DRUM-REVIEW.md — Аудит модуля барабанов

## Цель

Провести аудит логики `DrumInstrument`, интеграции `useTransport`, документации
`DRUMS.md` и регистра сэмплов. Выявить баги, расхождения, мёртвый код и предложить
исправления.

---

## 1. Найдено: расхождение DRUMS.md с реализацией

### 1.1 Алгоритм backbeat

**DRUMS.md §6** (строка 362–371) описывает алгоритм:

```ts
function hihatBeats(sig: TimeSignature): Set<number> {
  const second = defaultSecondStrongBeats(sig);
  if (second.length > 0) {
    return new Set([...second, sig.beatsPerBar - 1]);  // ← НЕВЕРНО
  }
  return new Set(Array.from({ length: sig.beatsPerBar - 1 }, (_, i) => i + 1));
}
```

**Реальная реализация** (`drumInstrument.ts:29–38`):

```ts
function hihatBeats(sig: TimeSignature): Set<number> {
  if (sig.beatUnit === 8) return new Set(defaultSecondStrongBeats(sig));
  const accented = new Set([...defaultStrongBeats(sig), ...defaultSecondStrongBeats(sig)]);
  const result = new Set<number>();
  for (let i = 0; i < sig.beatsPerBar; i++) {
    if (!accented.has(i)) result.add(i);
  }
  return result;
}
```

Это **принципиально разные алгоритмы**. DRUMS.md говорит «secondStrong + последняя
доля», а код говорит «все не-акцентированные доли».

### 1.2 Таблица backbeat в DRUMS.md НЕ совпадает с реальностью

| Размер | DRUMS.md утверждает | Реальный код выдаёт | Верно? |
|--------|-------------------|-------------------|--------|
| 4/4    | доли 3, 4 (idx 2, 3) | доли 2, 4 (idx 1, 3) | ❌ DRUMS врёт |
| 5/4    | доли 4, 5 (idx 3, 4) | доли 2, 3, 5 (idx 1, 2, 4) | ❌ DRUMS врёт |
| 3/4    | доли 2, 3 (idx 1, 2) | доли 2, 3 (idx 1, 2) | ✅ |
| 2/4    | только 2 (idx 1) | только 2 (idx 1) | ✅ |
| 6/8    | восьмая 4 (idx 3) | восьмая 4 (idx 3) | ✅ |

**Вывод**: DRUMS.md описывает НЕ тот алгоритм, который реально работает. При этом
реальный код корректнее: в 4/4 hihat на 2 и 4 — это классический джазовый backbeat.
В 5/4 hihat на 2, 3, 5 — музыкально осмысленно (избегает конфликта с secondStrong
на доле 4).

**Нужно**: обновить DRUMS.md §6, удалив неверный псевдокод и заменив его реальной
реализацией. Обновить таблицу в §2.

### 1.3 Архитектура в DRUMS.md §4 описывает несуществующий код

DRUMS.md §4 показывает:

```ts
export interface DrumInstrumentSettings { ... }      // ← НЕТ в коде
export class DrumInstrument implements Instrument {
  private rideSampler: Tone.Sampler;                 // ← в коде Tone.Player, и они в useTransport
  private settings: DrumInstrumentSettings;          // ← НЕТ в коде
  constructor(settings: DrumInstrumentSettings) { }  // ← конструктор без параметров
  updateSettings(settings): void { }                 // ← setRidePattern/setHumanize вместо этого
}
```

Реальный `DrumInstrument` не хранит настройки и не владеет Tone-нодами. DRUMS.md
описывает **желаемую** архитектуру, а не **реальную**. Это сбивает с толку.

**Нужно**: либо удалить §4 из DRUMS.md (она устарела), либо обновить до реального кода.

---

## 2. Найдено: velocity игнорируется — мёртвые вычисления

### 2.1 DrumInstrument вычисляет velocity, но оно нигде не используется

В `drumInstrument.ts`:

```ts
// Строка 89: stir
const velocity = this.humanize ? 0.6 + (Math.random() - 0.5) * 0.1 : 0.6;
ctx.scheduleDrum(t, 'stir', velocity, tpBeat);

// Строка 98: hihatFoot
const velocity = this.humanize ? 0.72 + (Math.random() - 0.5) * 0.1 : 0.72;
ctx.scheduleDrum(t, 'hihatFoot', velocity, tpBeat);

// Строка 107/124: ride
const velocity = ...;
ctx.scheduleDrum(t, 'ride', velocity, 20);
```

Все три передают `velocity` в sink. Но в `useTransport.ts:365`:

```ts
const drumSink: DrumSink = (atTicks, sound, _velocity, _durationTicks) => {
  // _velocity и _durationTicks НЕ ИСПОЛЬЗУЮТСЯ
  const player = pool[rr];
  if (!player) return;
  tone.scheduleOnce((time: number) => {
    if (player.loaded) player.start(time);  // всегда полная громкость
  }, `${atTicks}i`);
};
```

**Причина**: `Tone.Player.start(time)` не принимает velocity. В отличие от
`Tone.Sampler.triggerAttackRelease(note, duration, time, velocity)`, Player
играет файл как есть.

**Следствия**:
1. Все per-hit velocity-вычисления в `DrumInstrument` — мёртвый код
2. Все сэмплы играют на полной громкости
3. Нет per-hit динамики — каждый удар ride звучит одинаково
4. Нет humanization по громкости (хотя код его вычисляет)

### 2.2 `durationTicks` тоже игнорируется

- stir: `durationTicks = tpBeat` (480 тиков) — игнорируется
- hihatFoot: `durationTicks = tpBeat` — игнорируется
- ride: `durationTicks = 20` — бессмысленно, потому что игнорируется

`Tone.Player.start(time)` играет файл до конца (или до `Player.stop()`). Без
явного `player.stop(time + duration)` сэмпл играет полную длительность.

**Нужно**: один из двух путей:
- **Путь A** (быстрый): заменить `Tone.Player` на `Tone.Sampler`, который
  поддерживает `triggerAttackRelease(note, duration, time, velocity)`
- **Путь Б** (минимальный): оставить `Tone.Player`, добавить `player.stop(time + durationSecs)`,
  использовать `_velocity` через `player.volume.rampTo(velocity, 0.01)` перед
  каждым ударом

---

## 3. Найдено: дублирование enable/disable проверок

Логика включения/выключения звука проверяется **дважды**:

1. **В `drumSink`** (useTransport.ts:366–370):
```ts
if (!(s.drumsEnabled ?? true)) return;
if (sound === 'ride'      && !(s.drumsRideEnabled  ?? true)) return;
if (sound === 'stir'      && !(s.drumsStirEnabled  ?? true)) return;
if (sound === 'hihatFoot' && !(s.drumsHihatEnabled ?? true)) return;
```

2. **В `DrumInstrument`** — НЕТ проверки. Инструмент всегда планирует все 3 звука.
   Проверка происходит только в sink.

Это означает, что даже при отключённом stir `DrumInstrument` всё равно вычисляет
его позиции, jitter и velocity — просто sink молча отбрасывает события. Это
напрасная работа в горячем 25ms-цикле.

**Нужно**: перенести проверку `enabled` в `DrumInstrument.schedule()` — инструмент
должен сам решать, что планировать. Sink должен только рендерить.

---

## 4. Найдено: `lastScheduledTick` — мёртвое поле

`drumInstrument.ts:50`:
```ts
private lastScheduledTick = -1;
```

Поле **записывается** (строки 91, 100, 109, 126), но **никогда не читается**.

В `RhodesInstrument` это же поле используется для детекта backward seek (сброс
voice leading при переходе назад). В `DrumInstrument` аналога нет — инструмент
не имеет состояния между вызовами `schedule()`.

**Нужно**: удалить поле и все его присваивания.

---

## 5. Найдено: `reset()` наполовину мёртвый метод

```ts
reset(): void {
  this.lastScheduledTick = -1;  // ← мёртвое поле
}
```

Метод существует, но:
- Нигде не вызывается (в отличие от `rhodesInstrument.reset()`)
- Сбрасывает только мёртвое поле

**Нужно**: удалить метод.

---

## 6. Найдено: RR-логика размазана между слоями

**Bass**: `RoundRobinCounter` в `music-core` → `rrCounterRef` в `useTransport`.
BassInstrument **не знает** про RR — он планирует `scheduleNote(note, articulation)`,
а sink сам выбирает вариант. Это правильное разделение: инструмент про музыку,
sink про звук.

**Drums**: `drumsRrRef` — обычный `Record<DrumSound, number>` прямо в
`useTransport`. DrumInstrument **тоже не знает** про RR. Но реализации разные:
бас использует класс `RoundRobinCounter`, drums — голый счётчик.

**Нужно**: унифицировать. Либо оба используют `RoundRobinCounter`, либо оба —
простой счётчик. `RoundRobinCounter` даёт per-note изоляцию, что для drums
избыточно (там всего 3 звука). Но для консистентности лучше использовать его же.

---

## 7. Найдено: swingRide молча деградирует без обратной связи

`drumInstrument.ts:71–73`:
```ts
const useSwingRide = this.ridePattern === 'swingRide'
  && sig.beatsPerBar === 4
  && sig.beatUnit === 4;
```

Если пользователь выбрал `swingRide`, но размер не 4/4, ride **молча**
переключается на quarters. В `SettingsForm` пользователь видит "Swing ride" и
думает, что свинг работает, хотя его нет.

**Нужно**: один из вариантов:
- В `SettingsForm` показывать `(только 4/4)` рядом с опцией
- Воспроизводить swingRide в любом размере, адаптируя паттерн под количество долей
- Disable опцию когда выбран не-4/4 размер

---

## 8. Предлагаемые изменения

### 8.1 Обновить DRUMS.md (низкий риск)

- §2: исправить таблицу backbeat для 4/4 и 5/4
- §6: заменить псевдокод на реальную реализацию
- §4: удалить или заменить на описание реальной архитектуры
- §1: убрать упоминание `Tone.Sampler`, заменить на `Tone.Player`

### 8.2 Убрать мёртвый код (низкий риск)

- Удалить `lastScheduledTick` и все его присваивания
- Удалить `reset()` метод
- Удалить вычисления `velocity` в DrumInstrument (или см. §8.3)

### 8.3 Включить per-hit динамику (средний риск)

Заменить 12 `Tone.Player` на 3 `Tone.Sampler` (по одному на звук):

```ts
// БЫЛО: 4 Player на звук, start(time) без velocity
const makeDrumPlayers = (sound: DrumSound): Tone.Player[] =>
  DRUM_SAMPLE_FILES[sound].map(file =>
    new Tone.Player(`${DRUMS_BASE_URL}${file}`).connect(channel));

// СТАЛО: 1 Sampler на звук, triggerAttackRelease с velocity и duration
const rideSampler = new Tone.Sampler({
  urls: { C4: 'ride_vl6_rr1.ogg', D4: 'ride_vl6_rr2.ogg', ... },
  baseUrl: DRUMS_BASE_URL,
}).connect(rideChannel);
```

**Важно**: `Tone.Sampler` использует `note` для выбора сэмпла. 4 RR-варианта
мапятся на разные ноты (C4, D4, E4, F4). RR-логика выбирает ноту, а velocity
передаётся в `triggerAttackRelease(note, duration, time, velocity)`.

Это даст:
- Реальную per-hit динамику (humanization по громкости ЗАРАБОТАЕТ)
- Контроль длительности (ride можно сделать короче/длиннее)
- Унификацию с басом (оба используют `Tone.Sampler`)

### 8.4 Перенести enable/disable в DrumInstrument (низкий риск)

Добавить настройки в инструмент:

```ts
export class DrumInstrument implements Instrument {
  private enabled = true;
  private rideEnabled = true;
  private stirEnabled = true;
  private hihatEnabled = true;

  setEnabled(v: boolean): void { this.enabled = v; }
  setSoundEnabled(sound: DrumSound, v: boolean): void { ... }

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    if (!this.enabled || !ctx.scheduleDrum) return;
    // ...
    if (this.stirEnabled && isStirBeat(beatIdx, sig)) { ... }
    if (this.hihatEnabled && backbeats.has(beatIdx)) { ... }
    if (this.rideEnabled && !useSwingRide) { ... }
  }
}
```

Из `drumSink` убрать проверки — sink только рендерит.

### 8.5 Унифицировать RR с басом (низкий риск)

Перенести `RoundRobinCounter` в `useTransport` для drums:
```ts
const drumsRrRef = useRef(new RoundRobinCounter());
// В sink:
const rr = drumsRrRef.current.next(sound, 'hit') - 1;
```

Или оставить как есть — 3 счётчика против 1 класса — разница минимальна.

### 8.6 swingRide: явный фидбек в UI (низкий риск)

В `SettingsForm` добавить:
```tsx
{timeSignature !== '4/4' && (
  <FormDescription>
    Swing ride работает только в 4/4. Сейчас: quarters.
  </FormDescription>
)}
```

---

## 9. Сводная таблица находок

| # | Проблема | Серьёзность | Где | Статус в тестах |
|---|---------|-----------|-----|----------------|
| 1 | DRUMS.md §6 — неверный псевдокод | Средняя | docs | Тесты проходят (тестируют реальный код) |
| 2 | DRUMS.md §2 — неверная таблица 4/4, 5/4 | Средняя | docs | Тесты проходят |
| 3 | DRUMS.md §4 — несуществующий код | Низкая | docs | — |
| 4 | `_velocity` игнорируется | Высокая | useTransport.ts:365 | Нет тестов на громкость |
| 5 | `_durationTicks` игнорируется | Средняя | useTransport.ts:365 | Нет тестов на длительность |
| 6 | `lastScheduledTick` — мёртвое поле | Низкая | drumInstrument.ts:50 | — |
| 7 | `reset()` — мёртвый метод | Низкая | drumInstrument.ts:60 | — |
| 8 | enable/disable дублирование | Низкая | drumSink vs DrumInstrument | — |
| 9 | RR-логика: класс vs голый счётчик | Низкая | useTransport.ts | — |
| 10 | swingRide молча деградирует | Средняя | drumInstrument.ts:71 | Есть тест на деградацию |

---

## 10. Приоритеты внедрения

**Фаза A — немедленно (баг-фиксы)**:
- §8.2: удалить мёртвый код (2 строки + 4 присваивания + метод `reset()`)
- §8.1: исправить DRUMS.md (документация)

**Фаза B — улучшение звука (feature)**:
- §8.3: `Tone.Player` → `Tone.Sampler` с per-hit velocity и duration

**Фаза C — архитектура (рефакторинг)**:
- §8.4: перенести enable/disable в DrumInstrument
- §8.5: унифицировать RR

**Фаза D — UX (polish)**:
- §8.6: фидбек в UI о деградации swingRide
