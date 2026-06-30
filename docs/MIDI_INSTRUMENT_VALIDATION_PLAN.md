# MIDI INSTRUMENT — План валидации и устранения проблем

> Архитектурная валидация фичи «живой MIDI-инструмент поверх аккомпанемента»
> (ветка `feature/midi-instrument-over-accompaniment`).
> Режим: **Mode 2 — Architecture Review** + **Mode 8 — Targeted Analysis**.
> Дата: 2026-06-28. Аналитик: software-architect.

---

## 0. Итоговый вердикт

**Gate B (Implementation Alignment): `Needs revision`.**

Фича функционально работает (typecheck ✅, 116 целевых тестов аудио-пути ✅), архитектурно разделена на слои (music-core / adapters / sdk / plugins) и в целом следует Ports & Adapters. Однако есть **два P0-дефекта**, напрямую бьющие по заявленным требованиям пользователя:

1. **Латенси live-звука ≈ +100 мс** из-за `lookAhead` Tone.js (нота извлекается не «сейчас», а в будущем).
2. **«Залипание» клавиш** при включённом Play — следствие нестабильных зависимостей `useMidiVisualizer`, который пересоздаёт подписку на каждый ререндер и уничтожает таймеры гашения нот.

Плюс набор архитектурных замечаний (P1) вокруг интеграции через `window.__*`-синглтоны и `setInterval`-поллинг.

### Сильные стороны
- Чистое ядро: `SoloInstrument` — DI-интерфейс, music-core не импортирует Tone.js (ADR-005 соблюдён).
- Корректная изоляция инструментов: synth / sampled / reuse через манифесты и `SoloInstrumentHost`.
- `reuse`-категория переиспользует общий Salamander-сэмплер — экономит память и убирает повторную загрузку.
- Хорошее тестовое покрытие контрактов (`*.contract.ts`, 116 тестов в аудио-пути).

### Что требует доработки (резюме)
| # | Severity | Категория | Кратко | Эффект |
|---|----------|-----------|--------|--------|
| 1 | **P0** | perf | lookAhead не настроен → +100 мс латенси live-нот | S |
| 2 | **P0** | code/perf | `useMidiVisualizer`: нестабильные deps → залипшие клавиши | M |
| 3 | **P1** | dx (feature) | Клавиатура под тулбаром, 3 октавы; нужно над тулбаром + 4 октавы + виджет | M |
| 4 | **P1** | arch | Интеграция через `window.__*`-синглтоны | L |
| 5 | **P1** | arch | `setInterval(200ms)` поллинг адаптеров в `MidiSoloProvider` | M |
| 6 | **P1** | arch | Два владельца адаптера (useTransport + audioSetup) → звук рвётся при teardown | M |
| 7 | **P2** | perf | Двойная конвертация MIDI↔note-name на горячем пути | S |
| 8 | **P2** | perf | RAF-loop ducking: `rampTo` каждый кадр | S |
| 9 | **P2** | error | Сэмплированные тембры: триггер до загрузки сэмплов → тихие первые ноты | M |
| 10 | **P2** | error | Молчаливое проглатывание ошибок (`catch {}`) | S |
| 11 | **P3** | docs | Комментарий «shown above toolbar» ≠ факту; doc-drift в MIDI_INSTRUMENT_ARCHITECTURE | S |

---

## 1. P0-1 — Латенси извлечения звука (главный приоритет)

### Диагноз
Live-нота извлекается без явного времени:

- `MidiSoloProvider.tsx:140` → `host.handleNoteOn(midiNote, event.velocity)` — **без аргумента `time`**.
- `SoloInstrumentHost.handleNoteOn` (`soloInstrumentHost.ts:66`) пробрасывает `time=undefined`.
- `SynthSoloInstrument.noteOn` (`synthSoloInstrument.ts:66`) → `this.synth.triggerAttack(noteName, time /* undefined */, vel)`.
  То же в `samplerSoloInstrument.ts:48` и `reuseSoloInstrument.ts:36`.

Когда `time === undefined`, Tone.js подставляет `this.now()` = `context.currentTime + context.lookAhead`. **Дефолтный `lookAhead` Tone.js = 0.1 с (100 мс).** Нигде в коде он не переопределён (`grep lookAhead|latencyHint|immediate` → совпадений по live-пути нет). Итог: **каждая live-нота звучит с задержкой ~100 мс** — слышимый лаг, несовместимый с требованием «минимально возможное латенси».

> ⚠️ Нельзя просто выставить `Tone.getContext().lookAhead = 0` глобально: от `lookAhead` зависит планировщик `Tone.Transport`, который ведёт аккомпанемент. Глобальный 0 → глитчи/пропуски в аккомпанементе. Нужно править **только** live-путь.

### План (рекомендуемый — Option B, хирургический)
Передавать живой ноте «немедленное» время `Tone.immediate()` (= `context.currentTime`, **без** `lookAhead`), не трогая Transport.

1. **Adapter:** добавить в `ToneAudioAdapter` метод `immediate(): number { return Tone.immediate(); }` (рядом с `now()`, `ToneAudioAdapter.ts:160`). `Tone.now()` оставить для ducking-таймстемпов.
2. **Фабрики (предпочтительно — фикс всех трёх инструментов разом):** в `createSoloInstrumentFactories` (`SoloInstrumentFactories.ts`) оборачивать `PolySynth`/`Sampler` тонким адаптером, чей `triggerAttack`/`triggerRelease` при `time === undefined` подставляет `Tone.immediate()`. Тогда music-core остаётся чистым, а латенси исчезает для synth, sampled и reuse одновременно.
   - Альтернатива на уровне провайдера: `host.handleNoteOn(note, vel, adapter.immediate())` в `MidiSoloProvider.tsx:140` и `handleNoteOff(note, adapter.immediate())` в `:153`. Менее предпочтительно — не покрывает другие места вызова.
3. **AudioContext latencyHint:** при создании контекста явно задать `latencyHint: 'interactive'` (дефолт Tone именно такой, но зафиксировать в `audioSetup.ts`/`ToneAudioAdapter`, чтобы исключить случайный `'playback'`). По возможности — снизить `lookAhead` контекста до ~0.01–0.03 c, если профилирование подтвердит, что Transport не глитчит (проверять отдельно).
4. **Замер:** добавить dev-метрику «MIDI-event → audio-callback» (через `performance.now()` на входе и `context.currentTime` на триггере) и зафиксировать целевой бюджет в `MIDI_INSTRUMENT_ARCHITECTURE.md §15.1` (например, < 20 мс программной задержки).

**Эффект:** S (1 метод + тонкий wrapper). **Влияние:** убирает ~100 мс — ключевое требование.

---

## 2. P0-2 — «Залипание» клавиш виртуальной клавиатуры при Play

### Диагноз (точная причина)
Симптом пользователя: при включении Play клавиши «западают», без аккомпанемента — нет. Это детерминированно объясняется жизненным циклом `useMidiVisualizer`:

1. Вызов на стороне страницы передаёт **новый объект опций** каждый ререндер: `PlayerPage.tsx:84` → `useMidiVisualizer(inputPort, { mode: keyboardMode })`.
2. Внутри (`useMidiVisualizer.ts:76`): `scaleNotes = []`, `chordNotes = []` — **новые литералы массива на каждый рендер**.
3. `getHighlightColor` (`:89-96`) — `useCallback` с deps `[mode, scaleNotes, chordNotes]` → пересоздаётся каждый рендер.
4. Главный эффект подписки (`:99-198`) имеет deps `[inputPort, getHighlightColor, scaleNotes, chordNotes]` → **перезапускается на КАЖДЫЙ ререндер**.
5. При Play `PlayerPage` ререндерится на каждый бит/такт/count-in (стор `usePlaybackStore`, `PlayerPage.tsx:59`) — десятки раз в секунду.
6. Cleanup эффекта (`:194-196`) делает `decayTimersRef.current.forEach(clearTimeout); decayTimersRef.current.clear();`. А `noteOff` (`:158-187`) ставит таймер гашения на 30 мс. Если в эти 30 мс случился ререндер — **таймер уничтожается, клавиша остаётся в `activeKeys` навсегда → «залипла»**. Дополнительно: MIDI-события, пришедшие в микро-зазор между unsubscribe и resubscribe, теряются (потерянный note-off ⇒ залипание).

Без аккомпанемента `PlayerPage` не ререндерится часто → таймеры доживают → клавиши гаснут. **Полностью соответствует описанному симптому.**

### План
Сделать подписку стабильной и не разрушать таймеры на ребиндинге:

1. **Подписка зависит только от `inputPort`.** Главный `useEffect` — deps `[inputPort]`. Параметры `mode`/`scaleNotes`/`chordNotes` читать внутри хендлеров через `useRef`, обновляемый отдельным дешёвым эффектом.
2. **Не чистить decay-таймеры в cleanup подписки.** Очистку таймеров оставить только на размонтировании (отдельный `useEffect(() => () => clearAll, [])`).
3. **Стабилизировать дефолты:** вынести `const EMPTY_NOTES: number[] = []` на уровень модуля; на стороне вызова мемоизировать `options` или передавать примитивы.
4. **Тест-регрессия:** добавить тест, эмулирующий «noteOn → noteOff → форсированный ререндер в пределах decay-окна», проверяющий, что клавиша гаснет (отсутствует в `activeKeys`).
5. То же применить к `useMidiConnection` (`useMidiConnection.ts:25-60`) — там deps только `[inputPort]`, но callers тоже передают inline-объекты; убедиться, что нет лишних ребиндингов.

**Эффект:** M. **Влияние:** устраняет залипание и снижает churn ререндеров (бонус к перформансу).

### Вторичный фактор (проверить с пользователем)
В режиме `chord-highlight` тоны аккорда красятся фоном `CHORD_BG_WHITE/BLACK` (`VirtualKeyboard.tsx:136,198`). При смене аккордов во время Play это визуально похоже на «нажатые» клавиши. Дефолтный режим — `free`, поэтому первичная причина — P0-2. Если жалоба воспроизводится и в `free` — однозначно P0-2; если только в `chord` — дополнительно развести стилистику «фон аккорда» vs «нажатая клавиша».

---

## 3. P1-3 — Клавиатура как отдельный скрываемый виджет над панелью аранжировки, 4 октавы

### Текущее состояние
- Блок клавиатуры рендерится **после** `<PlayerToolbar>` в flex-колонке (`PlayerPage.tsx:326-353`), т.е. визуально **под** панелью управления (хотя комментарий `:326` говорит «shown above toolbar» — doc-drift, см. P3-11).
- `octaveRange={[3, 5]}` (`PlayerPage.tsx:347`) = октавы 3–5 (C3–B5) = **3 октавы**, 21 белая клавиша.

### Целевое (запрос пользователя)
Клавиатура — отдельный **скрываемый виджет над** панелью аранжировки, **4 октавы**, «примерно как сейчас».

### План
1. **Позиция:** перенести блок `{keyboardVisible && (...)}` так, чтобы он рендерился **перед** `<PlayerToolbar>` в колонке (над тулбаром). Кнопку-тоггл 🎹 (`PlayerPage.tsx:307-323`) оставить в тулбаре.
2. **4 октавы:** заменить `octaveRange={[3, 5]}` → `octaveRange={[2, 5]}` (C2–B5 = 4 октавы) или `[3, 6]` — выбрать рабочий регистр (рекомендация: `[2, 5]`, удобнее для игры обеими руками). `VirtualKeyboard` и `getKeyboardKeys` уже поддерживают произвольный диапазон и горизонтальный скролл.
3. **Виджет (рекомендуется):** извлечь `KeyboardWidget` в `@jazz/ui` (контейнер + табы режима + кнопка сворачивания), переиспользовать в `core-player` и в плагине `visual-midi-keyboard` (`MidiKeyboardPage.tsx` дублирует ту же разметку). Снижает дублирование, держит `PlayerPage` тонким.
4. **Эргономика 4 октав:** при ширине 100% клавиши становятся узкими. Задать `min-width` контейнеру SVG (или фикс. ширину белой клавиши) + сохранить `overflowX:auto` (`VirtualKeyboard.tsx:99-104`), чтобы клавиши оставались играбельными, а лишнее скроллилось.

**Эффект:** M.

---

## 4. P1 — Архитектурные замечания интеграции

### P1-4 — Интеграция через `window.__*`-синглтоны
`__midiInputPort`, `__toneAudioAdapter`, `__soloInstrumentFactories`, `__soloInstrumentHost`, `__midiInitMidi`, `__midiInitialized` (см. `MidiSoloProvider.tsx:23-38`, `PlayerPage.tsx:33-48`, `midiSetup.ts:27-30`, `audioSetup.ts:20-60`, `useTransport.ts:145,461,477`).

**Проблема:** в обход документированной модели Ports & Adapters + `PluginContext` (ADR-005, изоляция плагинов). Следствия: скрытая связанность, отсутствие типобезопасности (повсюду `window as unknown as Record<string, unknown>`), гонки инициализации, тяжёлое тестирование.

**План (поэтапно):**
- Шаг 1 (быстрый, S): централизовать в один типизированный модуль `audioRuntime.ts` с геттерами/сеттерами (`getInputPort()`, `getToneAdapter()`, `getSoloHost()`), убрать разрозненные `window`-касты. Один источник правды, типобезопасно.
- Шаг 2 (L, обсудить): пробрасывать `inputPort`/`soloHost` через `PluginContext` (SDK уже принимает `inputPort` в `useMidiVisualizer`). Владелец рантайма — провайдер (`MidiSoloProvider` или новый `AudioRuntimeProvider`), раздающий зависимости через React-контекст вместо `window`.

### P1-5 — `setInterval(200 ms)` поллинг адаптеров
`MidiSoloProvider.tsx:91-123` каждые 200 мс проверяет появление/исчезновение адаптеров. Это симптом P1-4 (нет нормального события жизненного цикла).
**План:** заменить на событие/коллбэк при создании адаптера (observer), либо отдать создание адаптера провайдеру. Убрать поллинг.

### P1-6 — Двойное владение адаптером → разрыв звука
Адаптер создаётся в двух местах: `useTransport.ts:141` (привязан к жизни плеера) и `audioSetup.ts:46` (транспорт-независимый). При размонтировании `useTransport` удаляет `__toneAudioAdapter`/`__soloInstrumentFactories` (`:477-481`), затем поллинг в провайдере **диспозит `SoloInstrumentHost`** — live-звук может пропасть при уходе со страницы плеера, хотя `audioSetup` задумывался как независимый.
**План:** один долгоживущий audio-runtime (не привязанный к транспорту плеера); транспорт лишь использует его. Согласовать lifecycle, убрать удаление глобалей в teardown транспорта.

---

## 5. P2 / P3 — Прочее

### P2-7 — Двойная конвертация MIDI ↔ note-name на горячем пути
Поток одной live-ноты: устройство (MIDI int) → `WebMidiAdapter.handleMidiMessage` конвертирует в строку `"Db4"` (`WebMidiAdapter.ts:402` через `midiToNote`) → `MidiSoloProvider` конвертирует строку обратно в int (`:136` `noteToMidi`) → `SoloInstrument.noteOn` снова делает int→`"Db4"` для Tone (`synthSoloInstrument.ts:64`). **Две лишние строковые конвертации на каждое событие** + риск энгармонических расхождений (разные таблицы нот: `WebMidiAdapter` использует `Db`, `keyboardLayout`/`useMidiVisualizer` — `C#`).
**План:** держать live-путь числовым (MIDI int) end-to-end; конвертацию в note-name делать один раз на границе сэмплера. Унифицировать ноты-хелперы (`noteToMidi`/`midiToNote`/`noteNameToMidi`) в одном модуле music-core. Снижает и латенси, и риск багов.

### P2-8 — RAF-loop ducking
`ToneAudioAdapter.startDuckingLoop` (`:223-235`) вызывает `rampTo(target, 0.02)` каждый кадр (~60 fps), пока ducking включён — постоянное планирование автоматизации параметра.
**План:** перейти на событийную огибающую (рассчитывать ramp в `noteOnDucking/noteOffDucking`), а не per-frame polling.

### P2-9 — Тихие первые ноты у сэмплированных тембров
`createSampler` (`SoloInstrumentFactories.ts:62`) не дожидается `loaded`; `SamplerSoloInstrument.noteOn` может триггерить до загрузки сэмплов → тишина. Для `reuse` (общий Salamander) обычно уже загружен; для standalone-сэмплеров — нет.
**План:** предзагрузка тембра при выборе (`selectTone`) с индикатором загрузки; пока не `loaded` — fallback на synth либо UI-состояние «loading».

### P2-10 — Молчаливые `catch {}`
`reuseSoloInstrument.ts:37,48`, `MidiSoloProvider.tsx:75,108,184`, `audioSetup`. Устойчивость — ок, но скрывает реальные сбои.
**План:** dev-логирование за флагом (`if (import.meta.env.DEV) console.warn(...)`).

### P3-11 — Doc-drift
- Комментарий `PlayerPage.tsx:326` «shown above toolbar» не соответствует факту (рендерится ниже) — поправится в P1-3.
- `docs/MIDI_INSTRUMENT_ARCHITECTURE.md` описывает `MidiRecorder` (§6), `JamEval` (§7), Scene Presets (§10), MIDI Output (§3.7), но в коде ветки они не подключены (провайдер/хост их не используют).
**План:** проставить статусы 🟢/🟡/🔴 по компонентам в архитектурном документе, чтобы исключить doc-drift (передать tech-writer).

---

## 6. Рекомендуемый порядок работ (Roadmap)

| Шаг | Задача | Severity | Эффект | Зависит от |
|-----|--------|----------|--------|-----------|
| 1 | P0-1 Латенси: `immediate()` на live-пути + latencyHint | P0 | S | — |
| 2 | P0-2 Залипание: стабилизировать `useMidiVisualizer` + сохранить decay-таймеры | P0 | M | — |
| 3 | P1-3 Клавиатура над тулбаром, 4 октавы, виджет | P1 | M | — |
| 4 | P1-4 Шаг 1: типизированный `audioRuntime.ts`, убрать `window`-касты | P1 | S | — |
| 5 | P1-5 / P1-6: убрать поллинг, согласовать владение адаптером | P1 | M | 4 |
| 6 | P2-7 Числовой live-путь + унификация note-хелперов | P2 | S | 1 |
| 7 | P2-9 Предзагрузка сэмплов; P2-8 ducking-огибающая; P2-10 dev-логи | P2 | M | — |
| 8 | P3-11 Статусы компонентов в MIDI_INSTRUMENT_ARCHITECTURE (tech-writer) | P3 | S | — |

**Quick Wins (можно сделать сразу):** Шаг 1 (латенси), Шаг 4 (audioRuntime), P2-10 (логи).

---

## 7. Проверка после исправлений (Definition of Done)

- [ ] Измеренная программная задержка MIDI→audio < 20 мс (P0-1).
- [ ] Регресс-тест: клавиша гаснет после noteOff даже при форсированных ререндерах в decay-окне (P0-2).
- [ ] Клавиатура отображается **над** панелью аранжировки, 4 октавы, сворачивается (P1-3).
- [ ] `npm run typecheck && npm run lint && npm run test` — зелёные.
- [ ] Нет новых `window as unknown as Record<...>` (P1-4, шаг 1).
- [ ] `npm run e2e` (если есть сценарий MIDI) — зелёный.

---

## 8. Допущения

- `[assumption]` Дефолтный `lookAhead` Tone.js = 0.1 с (стандарт библиотеки; в коде не переопределён — подтверждено grep).
- `[assumption]` Жалоба на «залипание» воспроизводится в режиме `free` (дефолт). Если только в `chord-highlight` — добавить разведение стилей (см. §2, вторичный фактор).
- `[assumption]` `MidiRecorder`/`JamEval`/`ScenePresets`/`MIDI Output` намеренно вне scope этой ветки (в коде не подключены) — требуется подтверждение для статусов в архитектурном документе.
