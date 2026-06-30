# План работ — MIDI Instrument (Живой MIDI-инструмент)

**На основе:** [MIDI_INSTRUMENT_VISION.md](./MIDI_INSTRUMENT_VISION.md)
**Архитектура:** [MIDI_INSTRUMENT_ARCHITECTURE.md](./MIDI_INSTRUMENT_ARCHITECTURE.md)
**Дата:** 2026-06-17
**Статус:** 🟡 Черновик

---

## 1. Задачи (Tasks)

### Фаза A: Инфраструктура — MIDI-подключение и дефолтный синтез (Недели 1–2)

> **Цель фазы:** подключить MIDI-клавиатуру и услышать дефолтный синтезатор.
> **После фазы A:** пользователь подключает MIDI-устройство → индикатор зелёный → слышен звук `Synth (Default)`.

#### T-001. Расширить `InputPort` — новые методы выбора устройства и фильтрации каналов

- **Родительская функция:** §3.1 MIDI-подключение, §4.1 Доработка `webmidi-adapter`
- **Приоритет:** P0
- **Сложность:** M
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/ports.ts`
- **Описание:** Добавить в интерфейс `InputPort`:
  - `MidiDeviceInfo` интерфейс (`id`, `name`, `manufacturer?`)
  - `listInputs(): Promise<MidiDeviceInfo[]>` (замена `devices()`, старый метод пометить `@deprecated`)
  - `selectInput(deviceId: string | null): void`
  - `readonly activeDeviceId: string | null`
  - `setChannelFilter(channel: number | 'all'): void`
  - `readonly channelFilter: number | 'all'`
  - `readonly connectionStatus: 'disconnected' | 'available' | 'connected'`
  - `onConnectionChange(handler): () => void`
  - Существующие `onNoteOn`/`onNoteOff` — без изменений (обратная совместимость).
- **DoD:** typecheck + lint, интерфейс согласован с `ARCHITECTURE.md` §4.1.
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

#### T-002. Доработать `WebMidiAdapter` — реализовать новые методы `InputPort`

- **Родительская функция:** §3.1, §4.1
- **Приоритет:** P0
- **Сложность:** M
- **Слой:** adapters
- **Модуль:** `packages/adapters/webmidi-adapter/src/WebMidiAdapter.ts`
- **Описание:**
  - Реализовать `listInputs()` — обход `this.inputs` с маппингом в `MidiDeviceInfo`.
  - Реализовать `selectInput(deviceId)` — фильтрация событий по ID устройства в `handleMidiMessage`.
  - Реализовать `setChannelFilter(channel)` — маска канала в `handleMidiMessage` (проверка `status & 0x0f`).
  - Реализовать `connectionStatus` — вычисляется из наличия входов и активного устройства.
  - Реализовать `onConnectionChange` — вызов колбэков при `onstatechange`.
  - Hot-plug: при отключении активного устройства → авто-переключение на следующее доступное.
  - Поля: `private activeInputId`, `private channelMask`, `private connectionHandlers`.
- **DoD:** typecheck + lint + unit-тесты c моком `MIDIAccess`.
- **Зависит от задач:** T-001
- **Статус:** 🔴 Запланировано

#### T-003. Unit-тесты для расширенного `InputPort` и `WebMidiAdapter`

- **Родительская функция:** §3.1, §4.1
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** music-core + adapters
- **Модуль:** `packages/music-core/src/audio/ports.test.ts`, `packages/adapters/webmidi-adapter/src/WebMidiAdapter.test.ts`
- **Описание:** Тесты: `listInputs` возвращает корректные метаданные, `selectInput` фильтрует события, `setChannelFilter` пропускает/блокирует каналы, `connectionStatus` отражает реальное состояние, `onConnectionChange` вызывается при hot-plug.
- **DoD:** test — зелёные.
- **Зависит от задач:** T-002
- **Статус:** 🔴 Запланировано

#### T-004. Создать интерфейс `SoloInstrument` и DI-интерфейсы (`PolySynthLike`, `SamplerLike`)

- **Родительская функция:** §3.2 Звуковой движок
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/soloInstrument.ts` (🔴 новый)
- **Описание:**
  - Интерфейс `SoloInstrument`: `id`, `name`, `category` (`'synth'|'sampled'|'reuse'`), `noteOn`, `noteOff`, `connect`, `disconnect`, `dispose`.
  - Интерфейс `PolySynthLike`: `triggerAttackRelease`, `triggerAttack`, `triggerRelease`, `connect`, `disconnect`, `dispose`, `set`, `volume`.
  - Интерфейс `SamplerLike`: по аналогии с `PolySynthLike`, адаптированный под сэмплер.
- **DoD:** typecheck + lint. Интерфейсы соответствуют `ARCHITECTURE.md` §4.2.
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

#### T-005. Создать `SynthSoloInstrument` — DI-обёртка над `Tone.PolySynth`

- **Родительская функция:** §3.2
- **Приоритет:** P0
- **Сложность:** M
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/synthSoloInstrument.ts` (🔴 новый)
- **Описание:**
  - Класс `SynthSoloInstrument implements SoloInstrument` (`id='synth-default'`, `name='Synth (Default)'`, `category='synth'`).
  - Конструктор принимает `PolySynthLike` + `SynthSoloInstrumentOptions` (maxVoices=16, envelope с attack/decay/sustain/release).
  - `noteOn(midiNote, velocity)` → `synth.triggerAttack(freq, time, velocity/127)`.
  - `noteOff(midiNote)` → `synth.triggerRelease(freq)`.
  - `connect(dest)` / `disconnect()` / `dispose()` — делегирование.
  - **Без прямого импорта Tone.js** — только через DI-интерфейс.
- **DoD:** typecheck + lint + unit-тесты с моком `PolySynthLike`.
- **Зависит от задач:** T-004
- **Статус:** 🔴 Запланировано

#### T-006. Контрактный тест для `SoloInstrument`

- **Родительская функция:** §3.2
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/soloInstrument.contract.ts` (🔴 новый)
- **Описание:** Функция `testSoloInstrumentContract(createInstrument)` со сценариями:
  - `noteOn`/`noteOff` не выбрасывают ошибок
  - `connect`/`disconnect` не выбрасывают ошибок
  - `dispose` освобождает ресурсы (повторный `noteOn` — ошибка или no-op)
  - `noteOn` с velocity 0 эквивалентен `noteOff`
  - Полифония: несколько `noteOn` → `noteOff` для каждой
- **DoD:** test — зелёные. Контракт используется в тестах `SynthSoloInstrument` и `SamplerSoloInstrument`.
- **Зависит от задач:** T-004
- **Статус:** 🔴 Запланировано

#### T-007. Unit-тесты для `SynthSoloInstrument`

- **Родительская функция:** §3.2
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/synthSoloInstrument.test.ts` (🔴 новый)
- **Описание:** Тесты через контракт + специфичные: проверка вызовов `triggerAttack`/`triggerRelease` с правильными параметрами, `envelope` применяется, полифония работает, `dispose` очищает.
- **DoD:** test — зелёные.
- **Зависит от задач:** T-005, T-006
- **Статус:** 🔴 Запланировано

#### T-008. Доработать `ToneAudioAdapter` — добавить `SoloBus` и `setSoloVolume`

- **Родительская функция:** §3.2, §4.2
- **Приоритет:** P0
- **Сложность:** M
- **Слой:** adapters
- **Модуль:** `packages/adapters/tone-audio-adapter/src/ToneAudioAdapter.ts` (🟡 доработка)
- **Описание:**
  - Добавить поля: `private soloBus: Tone.Gain`, `private accompBus: Tone.Gain`, `private duckingGain: Tone.Gain`.
  - Маршрутизация: `soloBus → Tone.Destination`, `accompBus → duckingGain → Tone.Destination`.
  - Метод `getSoloBus(): Tone.Gain` — для подключения соло-инструментов.
  - Метод `setSoloVolume(value: number)` — `rampTo` на `soloBus.gain`.
  - Существующие инструменты аккомпанемента подключаются к `accompBus` (вместо прямого `toDestination()`).
- **DoD:** typecheck + lint + интеграционные тесты с моком Tone.js. Существующие тесты не сломаны.
- **Зависит от задач:** T-004 (для понимания контракта SoloInstrument)
- **Статус:** 🔴 Запланировано

#### T-009. Интеграционные тесты `SoloBus` и `setSoloVolume`

- **Родительская функция:** §3.2, §4.2
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** adapters
- **Модуль:** `packages/adapters/tone-audio-adapter/src/ToneAudioAdapter.test.ts` (доработка)
- **Описание:** Тесты: `getSoloBus` возвращает Gain-узел, `setSoloVolume` меняет gain, инструменты аккомпанемента идут через `accompBus`, `SoloBus` не влияет на громкость аккомпанемента.
- **DoD:** test — зелёные.
- **Зависит от задач:** T-008
- **Статус:** 🔴 Запланировано

#### T-010. Создать `useMidiConnection` хук в `core-player`

- **Родительская функция:** §3.1, §4.3
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** plugins
- **Модуль:** `packages/plugins/core-player/src/hooks/useMidiConnection.ts` (🔴 новый)
- **Описание:** Хук, возвращающий:
  - `connectionStatus: 'disconnected' | 'available' | 'connected'`
  - `activeDevice: MidiDeviceInfo | null`
  - `availableDevices: MidiDeviceInfo[]`
  - `selectDevice(deviceId: string | null): void`
  - `indicatorFlash: boolean` — `true` на 100ms после note-on
  - Подписка на `InputPort.onNoteOn` для вспышки, `onConnectionChange` для статуса.
- **DoD:** typecheck + lint + компонентный тест.
- **Зависит от задач:** T-002
- **Статус:** 🔴 Запланировано

#### T-011. `MidiIndicator` компонент в `core-player`

- **Родительская функция:** §3.3.1, §4.3
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** plugins
- **Модуль:** `packages/plugins/core-player/src/components/MidiIndicator.tsx` (🔴 новый)
- **Описание:**
  - Компонент принимает `status` и `flash`.
  - 🔴 `disconnected`, 🟡 `available`, 🟢 `connected`.
  - CSS-анимация вспышки: зелёный → ярко-зелёный → зелёный за 100ms (через CSS `@keyframes`).
  - Размещается в левой части панели плеера, рядом с транспортом.
- **DoD:** typecheck + lint + компонентный тест (все три статуса + анимация).
- **Зависит от задач:** T-010
- **Статус:** 🔴 Запланировано

---

### Фаза B: Виртуальная клавиатура и визуализация (Недели 2.5–4)

> **Цель фазы:** нажатия видны на виртуальной клавиатуре.
> **После фазы B:** пользователь играет → клавиши на экране подсвечиваются, индикатор мигает.

#### T-012. Создать пакет `plugins/visual-midi-keyboard` (скелет)

- **Родительская функция:** §3.3
- **Приоритет:** P1
- **Сложность:** XS
- **Слой:** plugins
- **Модуль:** `packages/plugins/visual-midi-keyboard/` (🔴 новый)
- **Описание:** Создать структуру: `src/index.ts` (definePlugin), `package.json`, `tsconfig.json`. Манифест: `id='visual.midi-keyboard'`, `category='play'`, `name='MIDI Visualizer'`. Вклад: команда `midi-keyboard.toggle`.
- **DoD:** typecheck + lint, плагин собирается.
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

#### T-013. Зарегистрировать плагин и добавить алиасы

- **Родительская функция:** §3.3
- **Приоритет:** P1
- **Сложность:** XS
- **Слой:** plugins + web
- **Модуль:** `plugin-registry`, `vite.config.ts`, `tsconfig.base.json`, `vitest.config.ts`
- **Описание:** Добавить `visual-midi-keyboard` в массив `PLUGINS` реестра. Добавить vite-алиас, tsconfig-path, vitest-алиас (по образцу соседних плагинов).
- **DoD:** typecheck + lint, импорт `@jazz/plugin-visual-midi-keyboard` работает.
- **Зависит от задач:** T-012
- **Статус:** 🔴 Запланировано

#### T-014. `keyboardLayout.ts` — раскладка клавиш и геометрия

- **Родительская функция:** §3.3.2
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** plugins
- **Модуль:** `packages/plugins/visual-midi-keyboard/src/keyboardLayout.ts` (🔴 новый)
- **Описание:**
  - Функция `getKeyboardKeys(octaveRange: [number, number]): KeyLayout[]` — массив клавиш с координатами.
  - Тип `KeyLayout`: `{ midiNote, note, isBlack, x, y, width, height }`.
  - Поддержка компактного режима (уменьшенные размеры для мобильных).
  - Белые клавиши: полная высота, чёрные: 60% высоты, правильное позиционирование.
- **DoD:** typecheck + lint + unit-тест (проверка геометрии для 2 и 3 октав).
- **Зависит от задач:** T-012
- **Статус:** 🔴 Запланировано

#### T-015. `VirtualKeyboard` компонент

- **Родительская функция:** §3.3.2
- **Приоритет:** P1
- **Сложность:** M
- **Слой:** plugins
- **Модуль:** `packages/plugins/visual-midi-keyboard/src/VirtualKeyboard.tsx` (🔴 новый)
- **Описание:**
  - SVG- или div-компонент, рендерящий 2–3 октавы (C3–C5 по умолчанию).
  - Пропсы: `octaveRange`, `mode`, `showLabels`, `compact`, `activeKeys: Map<number, KeyState>`.
  - Подсветка активных клавиш: `brightness` пропорциональна velocity, `highlightColor` определяет цвет.
  - Плавное гашение: CSS transition ~150ms.
  - Горизонтальный скролл для >2 октав (на мобильных).
  - Опциональные подписи нот на белых клавишах.
- **DoD:** typecheck + lint + компонентный тест (рендер, подсветка одной/нескольких клавиш, гашение).
- **Зависит от задач:** T-014
- **Статус:** 🔴 Запланировано

#### T-016. `useMidiVisualizer` хук

- **Родительская функция:** §3.3.2
- **Приоритет:** P1
- **Сложность:** M
- **Слой:** plugins
- **Модуль:** `packages/plugins/visual-midi-keyboard/src/useMidiVisualizer.ts` (🔴 новый)
- **Описание:**
  - Подписка на `InputPort.onNoteOn`/`onNoteOff` через `PluginContext`.
  - Возвращает: `activeKeys: Map<number, KeyState>`, `recentNotes`, `connectionStatus`, `indicatorFlash`.
  - `KeyState.brightness` = `velocity / 127`.
  - `KeyState.highlightColor` зависит от `mode` и (опционально) категории из `JamEval`.
  - При note-off: плавное гашение через `brightness → 0`.
  - `recentNotes` — последние 10 нот с таймстемпами.
- **DoD:** typecheck + lint + unit-тест (подписка, обновление activeKeys, очистка).
- **Зависит от задач:** T-002, T-012
- **Статус:** 🔴 Запланировано

#### T-017. Режимы отображения клавиатуры (`free`, `scale-highlight`, `chord-highlight`)

- **Родительская функция:** §3.3.2
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** plugins
- **Модуль:** `packages/plugins/visual-midi-keyboard/src/VirtualKeyboard.tsx` (доработка)
- **Описание:**
  - `free`: все клавиши активны (подсвечиваются при нажатии).
  - `scale-highlight`: неактивные ноты лада показаны тускло-серым. `isScaleTone` в `KeyState`.
  - `chord-highlight`: ноты текущего аккорда сетки подсвечены мягким фоном. `isChordTone` в `KeyState`.
  - Переключение режима через пропс `mode`.
- **DoD:** typecheck + lint + компонентный тест (все три режима).
- **Зависит от задач:** T-015, T-016
- **Статус:** 🔴 Запланировано

#### T-018. `MidiIndicator` в плагине `visual.midi-keyboard`

- **Родительская функция:** §3.3.1
- **Приоритет:** P1
- **Сложность:** XS
- **Слой:** plugins
- **Модуль:** `packages/plugins/visual-midi-keyboard/src/MidiIndicator.tsx` (🔴 новый)
- **Описание:** Реэкспорт/копия индикатора из `core-player` для использования внутри плагина (автономный компонент).
- **DoD:** typecheck + lint + отображается в плагине.
- **Зависит от задач:** T-011 (переиспользует логику)
- **Статус:** 🔴 Запланировано

#### T-019. `MidiLog` компонент (последние N нот)

- **Родительская функция:** §3.3.4
- **Приоритет:** P3
- **Сложность:** S
- **Слой:** plugins
- **Модуль:** `packages/plugins/visual-midi-keyboard/src/MidiLog.tsx` (🔴 новый)
- **Описание:** Сворачиваемая панель: список последних 10 нот в формате `C4 (vel:87) → D4 (vel:64) → ...`. Авто-скролл к новым.
- **DoD:** typecheck + lint + компонентный тест.
- **Зависит от задач:** T-016
- **Статус:** 🔴 Запланировано

#### T-020. Интеграция `visual.midi-keyboard` в `core-player`

- **Родительская функция:** §3.3, §4.3
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** plugins
- **Модуль:** `packages/plugins/core-player/src/PlayerPage.tsx` (доработка)
- **Описание:** Разместить `VirtualKeyboard` над панелью плеера (или в выдвижной панели). Передать `activeKeys` и `mode` из хука `useMidiVisualizer`. Компактный режим для мобильных.
- **DoD:** typecheck + lint + компонентный тест (клавиатура видна, реагирует на `activeKeys`).
- **Зависит от задач:** T-015, T-016
- **Статус:** 🔴 Запланировано

#### T-021. Тесты `VirtualKeyboard` и `useMidiVisualizer`

- **Родительская функция:** §3.3
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** plugins
- **Модуль:** `packages/plugins/visual-midi-keyboard/src/` (тесты)
- **Описание:** Тесты: рендер 2 октав, подсветка активной клавиши, velocity→яркость, смена режимов, `MidiLog` отображает последние ноты, `MidiIndicator` показывает статусы.
- **DoD:** test — зелёные.
- **Зависит от задач:** T-015, T-016, T-017, T-019
- **Статус:** 🔴 Запланировано

---

### Фаза C: Соло-инструменты и игра с аккомпанементом (Недели 4–6)

> **Цель фазы:** играть соло с выбранным тембром поверх сетки.
> **После фазы C:** пользователь выбирает тембр (Piano, Clarinet, ...), запускает сетку, играет соло поверх аккомпанемента, регулирует громкость, включает ducking.

#### T-022. `SamplerSoloInstrument` — DI-обёртка над сэмплером

- **Родительская функция:** §3.2 (Уровень 2)
- **Приоритет:** P1
- **Сложность:** M
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/samplerSoloInstrument.ts` (🔴 новый)
- **Описание:**
  - Класс `SamplerSoloInstrument implements SoloInstrument` (`category='sampled'`).
  - Конструктор принимает `id`, `name`, `SamplerLike`, `SamplerSoloInstrumentOptions` (baseUrl, volumeDb).
  - `noteOn(midiNote, velocity)` → `sampler.triggerAttack(freq, time, velocity/127)`.
  - `noteOff(midiNote)` → `sampler.triggerRelease(freq)`.
  - Без прямого импорта Tone.js.
- **DoD:** typecheck + lint + контрактный тест + unit-тесты с моком `SamplerLike`.
- **Зависит от задач:** T-004, T-006
- **Статус:** 🔴 Запланировано

#### T-023. `ReuseSoloInstrument` — переиспользование сэмплов аккомпанемента

- **Родительская функция:** §3.2 (Piano, Rhodes — переиспользование)
- **Приоритет:** P1
- **Сложность:** M
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/reuseSoloInstrument.ts` (🔴 новый)
- **Описание:**
  - Класс `ReuseSoloInstrument implements SoloInstrument` (`category='reuse'`).
  - Оборачивает существующий `Tone.Sampler` от `PianoInstrument` / `RhodesInstrument`.
  - `noteOn`/`noteOff` делегирует общему сэмплеру, но подключается к `SoloBus`, а не через Transport.
  - При `dispose()` не уничтожает сэмплер (он общий с аккомпанементом).
- **DoD:** typecheck + lint + unit-тесты (проверка, что сэмплер не дублируется, сorrect routing).
- **Зависит от задач:** T-004, T-022
- **Статус:** 🔴 Запланировано

#### T-024. `SoloInstrumentManifest` + `SoloInstrumentFactories` интерфейсы

- **Родительская функция:** §3.2
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/soloInstrumentManifest.ts` (🔴 новый)
- **Описание:**
  - Интерфейс `SoloInstrumentManifest`: `id`, `name`, `category`, `createInstrument(factories)`, `samples?`, `priority?`.
  - Интерфейс `SoloInstrumentFactories`: `createPolySynth()`, `createSampler()`, `getReuseSampler()`.
  - Интерфейс `SoloInstrumentSamples`: `baseUrl`, `notes`, `noteDurations?`.
- **DoD:** typecheck + lint, согласовано с `ARCHITECTURE.md` §4.5.
- **Зависит от задач:** T-004, T-005, T-022
- **Статус:** 🔴 Запланировано

#### T-025. `soloInstrumentRegistry` — реестр всех манифестов

- **Родительская функция:** §3.2
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/soloInstrumentRegistry.ts` (🔴 новый)
- **Описание:** Статический массив `SOLO_INSTRUMENT_MANIFESTS` (аналог `INSTRUMENT_MANIFESTS`). Содержит ссылки на все манифесты: `synthDefaultManifest`, `pianoSalamanderSoloManifest`, `rhodesJRhodes3cSoloManifest`, `clarinetManifest`, `vibraphoneManifest`, `guitarNylonSoloManifest`, `synthLeadManifest`, `trumpetMutedManifest`, `fluteManifest`.
- **DoD:** typecheck + lint, все манифесты зарегистрированы.
- **Зависит от задач:** T-024, T-026, T-027, T-028, T-029, T-030, T-031
- **Статус:** 🔴 Запланировано

#### T-026. Манифесты синтезированных тембров (`synthDefault`, `synthLead`)

- **Родительская функция:** §3.2
- **Приоритет:** P0 (synthDefault) / P1 (synthLead)
- **Сложность:** S
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/manifests/synthDefaultManifest.ts`, `synthLeadManifest.ts` (🔴 новые)
- **Описание:**
  - `synthDefaultManifest`: `id='synth-default'`, `category='synth'`, `createInstrument` создаёт `SynthSoloInstrument` с мягким e-piano-пресетом.
  - `synthLeadManifest`: `id='synth-lead'`, `category='synth'`, `createInstrument` создаёт `SynthSoloInstrument` через `FMSynth`-подобный пресет.
- **DoD:** typecheck + lint. Создание инструмента через манифест не выбрасывает ошибок.
- **Зависит от задач:** T-005, T-024
- **Статус:** 🔴 Запланировано

#### T-027. Манифесты переиспользуемых тембров (`pianoSalamanderSolo`, `rhodesJRhodes3cSolo`)

- **Родительская функция:** §3.2
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/manifests/pianoSalamanderSoloManifest.ts`, `rhodesJRhodes3cSoloManifest.ts` (🔴 новые)
- **Описание:**
  - `pianoSalamanderSoloManifest`: `id='piano-salamander'`, `category='reuse'`, `createInstrument` получает сэмплер через `factories.getReuseSampler('piano')`.
  - `rhodesJRhodes3cSoloManifest`: `id='rhodes-jrhodes3c'`, `category='reuse'`, `createInstrument` получает сэмплер через `factories.getReuseSampler('rhodes')`.
- **DoD:** typecheck + lint. Создание через `getReuseSampler` работает.
- **Зависит от задач:** T-023, T-024
- **Статус:** 🔴 Запланировано

#### T-028. Сэмплы и манифесты P1-инструментов (Clarinet, Vibraphone, Guitar)

- **Родительская функция:** §3.2
- **Приоритет:** P1
- **Сложность:** M (3 манифеста + поиск/подготовка сэмплов)
- **Слой:** music-core + assets
- **Модуль:** `packages/music-core/src/audio/manifests/clarinetManifest.ts`, `vibraphoneManifest.ts`, `guitarNylonSoloManifest.ts` (🔴 новые)
- **Описание:**
  - **Clarinet:** сэмплы из VSCO Community (CC0), ~5 MB. Диапазон: ~C3–C6. `category='sampled'`.
  - **Vibraphone:** сэмплы из Salamander/FreePats, ~4 MB. `category='sampled'`.
  - **Guitar (nylon):** сэмплы нейлоновой гитары, ~3 MB. `category='sampled'`.
  - Каждый манифест определяет `samples` с `baseUrl` и раскладкой нота→файл, `noteDurations` для `triggerRelease`.
  - Сэмплы размещаются в `public/samples/solo/<instrument>/`.
- **DoD:** typecheck + lint. Сэмплы загружаются, инструмент играет все ноты своего диапазона без щелчков.
- **Зависит от задач:** T-022, T-024
- **Статус:** 🔴 Запланировано

#### T-029. Сэмплы и манифесты P2-инструментов (Trumpet Muted, Flute)

- **Родительская функция:** §3.2
- **Приоритет:** P2
- **Сложность:** M (2 манифеста + сэмплы)
- **Слой:** music-core + assets
- **Модуль:** `packages/music-core/src/audio/manifests/trumpetMutedManifest.ts`, `fluteManifest.ts` (🔴 новые)
- **Описание:**
  - **Trumpet Muted:** сэмплы из VSCO Community, ~3 MB.
  - **Flute:** сэмплы из VSCO Community, ~3 MB.
  - Аналогично T-028: манифесты с `samples`, раскладка нот, `noteDurations`.
- **DoD:** typecheck + lint, сэмплы загружаются, инструмент играет.
- **Зависит от задач:** T-022, T-024
- **Статус:** 🔴 Запланировано

#### T-030. `DuckingCompressor` — чистая логика (music-core)

- **Родительская функция:** §3.4
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/duckingCompressor.ts` (🔴 новый)
- **Описание:**
  - Класс/функция, принимающая поток MIDI-событий (note-on/off) и вычисляющая целевой gain для аккомпанемента.
  - Параметры: `attackTime` (20ms), `releaseTime` (300ms), `depthDb` (6 dB default), `knee`.
  - Состояние: «активность» — есть ли звучащие ноты.
  - **Чистая логика, без Tone.js** — тестируется без браузера.
  - Экспортирует `getDuckingGain(): number` — целевой gain 0–1.
- **DoD:** typecheck + lint + unit-тесты (attack, release, глубина ducking, нет активности → возврат к 1).
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

#### T-031. Ducking-звук в `ToneAudioAdapter` (gain-автоматизация)

- **Родительская функция:** §3.4, §4.2
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** adapters
- **Модуль:** `packages/adapters/tone-audio-adapter/src/ToneAudioAdapter.ts` (доработка)
- **Описание:**
  - Метод `setDucking(enabled: boolean, depthDb?: number)`.
  - При включении: подписка на `InputPort.onNoteOn`/`onNoteOff` → `DuckingCompressor` → автоматизация `duckingGain.gain`.
  - Использование `Tone.Gain.gain.rampTo()` с параметрами из `DuckingCompressor`.
- **DoD:** typecheck + lint + интеграционный тест (ducking снижает громкость аккомпанемента при игре, восстанавливает в паузе).
- **Зависит от задач:** T-008, T-030
- **Статус:** 🔴 Запланировано

#### T-032. `SoloInstrumentHost` — управление жизненным циклом соло-инструментов

- **Родительская функция:** §3.2, §3.4
- **Приоритет:** P1
- **Сложность:** M
- **Слой:** plugins
- **Модуль:** `packages/plugins/core-player/src/hosts/SoloInstrumentHost.ts` (🔴 новый)
- **Описание:**
  - Класс-владелец жизненного цикла `SoloInstrument`.
  - `selectTone(id)` → отключить/dispose текущий → создать новый через манифест → `connect(SoloBus)`.
  - `handleNoteOn`/`handleNoteOff` — делегирование текущему инструменту.
  - Lazy-load сэмплов: кеш `Map<string, SoloInstrument>`.
  - `dispose()` — очистка всех ресурсов.
  - Использует `SoloInstrumentFactories` от адаптера.
- **DoD:** typecheck + lint + unit-тесты (смена тембра, кеширование, dispose).
- **Зависит от задач:** T-005, T-022, T-024, T-025
- **Статус:** 🔴 Запланировано

#### T-033. UI-компоненты соло-управления в `core-player`

- **Родительская функция:** §3.2, §3.4, §4.3
- **Приоритет:** P1
- **Сложность:** M (4 компонента)
- **Слой:** plugins
- **Модуль:** `packages/plugins/core-player/src/components/` (🔴 новые)
- **Описание:**
  - `SoloInstrumentSelector`: выпадающий список тембров из `availableTones`. Индикатор загрузки сэмплов (spinner).
  - `SoloVolumeSlider`: слайдер громкости соло 0–1, управляет `setSoloVolume`.
  - `DuckingToggle`: чекбокс `Auto-duck`, управляет `setDucking`.
  - `MidiDeviceSelector`: выпадающий список MIDI-устройств (из `useMidiConnection`), выбор канала.
- **DoD:** typecheck + lint + компонентные тесты.
- **Зависит от задач:** T-010, T-032
- **Статус:** 🔴 Запланировано

#### T-034. Режим «Free Play» — интеграция MIDI → SoloInstrument → SoloBus

- **Родительская функция:** §3.4
- **Приоритет:** P0
- **Сложность:** M
- **Слой:** plugins
- **Модуль:** `packages/plugins/core-player/src/PlayerPage.tsx` (доработка)
- **Описание:**
  - При подключении MIDI: `InputPort.onNoteOn` → `SoloInstrumentHost.handleNoteOn` → звук через `SoloBus`.
  - MIDI-ноты **не проходят** через `Transport.schedule` — маршрут живой.
  - Аккомпанемент работает как обычно через Transport.
  - Проверка, что существующие упражнения (ear-training, rhythm-drills) не сломаны — MIDI должен по-прежнему доходить до `midiEval`.
  - Все MIDI-элементы скрываются/деактивируются при `connectionStatus !== 'connected'`.
- **DoD:** typecheck + lint + интеграционный тест (MIDI-нота → звук через SoloBus, аккомпанемент не затронут). Существующие тесты ear-training зелёные.
- **Зависит от задач:** T-002, T-008, T-032
- **Статус:** 🔴 Запланировано

---

### Фаза D: Запись и оценка (Недели 6–7.5)

> **Цель фазы:** записать и оценить свою игру.
> **После фазы D:** пользователь записывает соло, прослушивает, видит аналитику по гармонии.

#### T-035. `MidiRecorder` — чистая логика записи и экспорта .mid

- **Родительская функция:** §3.5
- **Приоритет:** P2
- **Сложность:** M
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/midiRecorder.ts` (🔴 новый)
- **Описание:**
  - Класс `MidiRecorder` с полями: `events: RecordedMidiEvent[]`, `state: RecorderState`, `startTime`, `activeNotes`.
  - Методы: `start()`, `stop()`, `recordNoteOn(midiNote, velocity)`, `recordNoteOff(midiNote)`, `getEvents()`, `clear()`.
  - `exportMidiFile(): ArrayBuffer` — сериализация в Standard MIDI File format (Type 0, один трек).
  - Состояния: `'idle' | 'recording' | 'playing'`.
  - Чистая логика, без платформенных зависимостей.
- **DoD:** typecheck + lint + unit-тесты (запись note-on/off, временные метки, экспорт валидного .mid, очистка).
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

#### T-036. Интеграция `MidiRecorder` в MIDI-поток

- **Родительская функция:** §3.5
- **Приоритет:** P2
- **Сложность:** S
- **Слой:** plugins
- **Модуль:** `packages/plugins/core-player/src/PlayerPage.tsx` (доработка)
- **Описание:** При активной записи: `InputPort.onNoteOn` → помимо звука → `MidiRecorder.recordNoteOn`. Кнопки `Record`/`Stop` на панели плеера. Индикатор состояния записи (красный кружок).
- **DoD:** typecheck + lint + тест (запись стартует/останавливается, события накапливаются).
- **Зависит от задач:** T-034, T-035
- **Статус:** 🔴 Запланировано

#### T-037. Воспроизведение записи через `SoloInstrument`

- **Родительская функция:** §3.5
- **Приоритет:** P2
- **Сложность:** M
- **Слой:** plugins
- **Модуль:** `packages/plugins/core-player/src/PlayerPage.tsx` (доработка)
- **Описание:**
  - Кнопка `Play Recording`: воспроизведение `RecordedMidiEvent[]` с оригинальными таймингами.
  - Использование `Tone.Transport.schedule` или `setTimeout`-цикла для вызова `SoloInstrument.noteOn`/`noteOff` в нужное время.
  - Визуализация: серые/тусклые клавиши на виртуальной клавиатуре при воспроизведении (отличие от живой игры).
  - Экспорт: кнопка `Download MIDI` → скачивание `.mid` файла.
- **DoD:** typecheck + lint + интеграционный тест (воспроизведение, визуализация серым, экспорт).
- **Зависит от задач:** T-035, T-036, T-015
- **Статус:** 🔴 Запланировано

#### T-038. `JamEval` — классификация нот относительно аккорда

- **Родительская функция:** §3.6
- **Приоритет:** P2
- **Сложность:** M
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/jamEval.ts` (🔴 новый)
- **Описание:**
  - Класс `JamEval` с методом `analyze(midiNote, chord, key?): JamNoteAnalysis`.
  - Классификация: `'chordTone'` (1,3,5,7), `'tension'` (9,11,13), `'chromatic'` (подходы между chord tones), `'outside'`.
  - Использование существующих `parseChord` из `music-core/chords`.
  - Накопление `JamNoteAnalysis[]` для последующей статистики.
  - `enabled: boolean` — вкл/выкл анализа.
- **DoD:** typecheck + lint + unit-тесты (правильная классификация для Cmaj7, Dm7, G7 и т.д., хроматические подходы, outside-ноты).
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

#### T-039. `JamEval` — накопление статистики

- **Родительская функция:** §3.6
- **Приоритет:** P2
- **Сложность:** S
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/jamEval.ts` (доработка)
- **Описание:**
  - Метод `getStatistics(): JamEvalStatistics` — агрегация: `totalNotes`, `distribution` по категориям, `distributionPct`, `averageVelocity`, `noteRange`, `perChord`.
  - `reset()` — сброс накопленного.
  - Интеграция с `ChordTimeline.getChordAtTime(transportSeconds)` для per-chord статистики.
- **DoD:** typecheck + lint + unit-тесты (статистика корректна для последовательности нот).
- **Зависит от задач:** T-038
- **Статус:** 🔴 Запланировано

#### T-040. Интеграция `JamEval` в MIDI-поток и UI

- **Родительская функция:** §3.6
- **Приоритет:** P2
- **Сложность:** M
- **Слой:** plugins
- **Модуль:** `packages/plugins/core-player/src/PlayerPage.tsx` (доработка), `components/JamEvalToggle.tsx` (🔴 новый)
- **Описание:**
  - Чекбокс `Jam Eval` на панели плеера.
  - При включении: `InputPort.onNoteOn` → `JamEval.analyze()` → категория → `highlightColor` в `useMidiVisualizer`.
  - Панель статистики (сворачиваемая): % chord tones / tensions / outside, per-chord breakdown, средняя velocity.
  - Авто-сброс статистики при новом запуске транспорта (play).
- **DoD:** typecheck + lint + компонентные тесты (статистика отображается, подсветка по категориям работает).
- **Зависит от задач:** T-038, T-039, T-016, T-034
- **Статус:** 🔴 Запланировано

#### T-041. Chord Grid Highlight — подсветка аккордов сетки

- **Родительская функция:** §3.3.3
- **Приоритет:** P2
- **Сложность:** S
- **Слой:** plugins
- **Модуль:** `packages/plugins/core-player/src/PlayerPage.tsx` (доработка), `packages/plugins/core-editor/` (доработка)
- **Описание:**
  - Подсветка текущего такта сетки (мягкая рамка) по позиции транспорта.
  - При активном `JamEval`: зелёная обводка аккорда если `category='chordTone'`, жёлтая если `'tension'`, красная если `'outside'`.
- **DoD:** typecheck + lint + компонентный тест.
- **Зависит от задач:** T-038, T-034
- **Статус:** 🔴 Запланировано

---

### Фаза E: Пресеты сцены и MIDI-выход (Недели 7.5–8.5)

> **Цель фазы:** пресеты и MIDI-выход.
> **После фазы E:** пользователь сохраняет/загружает пресеты сцены; MIDI-аккомпанемент может идти на внешние синтезаторы.

#### T-042. `ScenePresetDTO` и `InstrumentPresetDTO` в `shared`

- **Родительская функция:** §3.8
- **Приоритет:** P3
- **Сложность:** S
- **Слой:** shared
- **Модуль:** `packages/shared/src/dto.ts` (доработка)
- **Описание:**
  - Zod-схема `ScenePresetDTO`: `id`, `name`, `isBuiltIn`, `style`, `tempo`, `instruments` (bass/drums/piano/rhodes), `solo` (toneId, volume), `visual` (keyboardMode, keyboardOctaves), `duckingEnabled`, `jamEvalEnabled`.
  - Zod-схема `InstrumentPresetDTO`: `enabled`, `volume`.
  - Экспорт типов.
- **DoD:** typecheck + lint, валидация DTO работает.
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

#### T-043. `BUILT_IN_SCENE_PRESETS` в `shared/constants.ts`

- **Родительская функция:** §3.8
- **Приоритет:** P3
- **Сложность:** S
- **Слой:** shared
- **Модуль:** `packages/shared/src/constants.ts` (доработка)
- **Описание:** 5 стандартных пресетов (Full Band + Piano, Bass & Drums + Guitar, Ballad + Clarinet, Solo Piano Practice, Synth Jam) — массив `ScenePresetDTO`.
- **DoD:** typecheck + lint, валидация каждого пресета через Zod.
- **Зависит от задач:** T-042
- **Статус:** 🔴 Запланировано

#### T-044. `ScenePresetSelector` компонент и логика применения пресета

- **Родительская функция:** §3.8
- **Приоритет:** P3
- **Сложность:** M
- **Слой:** plugins
- **Модуль:** `packages/plugins/core-player/src/components/ScenePresetSelector.tsx` (🔴 новый)
- **Описание:**
  - Выпадающий список: стандартные пресеты + пользовательские (из `userSettings.scenePresets`).
  - Кнопка `Save Current as Preset` — сохраняет текущее состояние в `userSettings`.
  - `applyPreset(preset)` — применяет все настройки: стиль, темп, инструменты (enabled/volume), соло-тембр, режим клавиатуры, ducking, jamEval.
  - Поток: `ScenePresetDTO` → TransportEngine, InstrumentManifest'ы, SoloInstrumentHost, SoloBus, visual.midi-keyboard.
- **DoD:** typecheck + lint + компонентные тесты (сохранение, загрузка, применение).
- **Зависит от задач:** T-033, T-034, T-042, T-043
- **Статус:** 🔴 Запланировано

#### T-045. Доработка `WebMidiAdapter` — MIDI-выход: выбор порта и поканальная маршрутизация

- **Родительская функция:** §3.7
- **Приоритет:** P2
- **Сложность:** M
- **Слой:** adapters
- **Модуль:** `packages/adapters/webmidi-adapter/src/WebMidiAdapter.ts` (доработка)
- **Описание:**
  - Метод `setOutputPort(deviceId: string)` — выбор конкретного MIDI-выхода.
  - Метод `setInstrumentOutputPort(instrumentId: string, deviceId: string)` — маппинг инструмент→выход.
  - `scheduleNote` при отправке проверяет маппинг и отправляет на нужный порт.
  - `localControl` для соло-инструмента: отправка MIDI-сообщения `CC 122, 0` на входное устройство.
  - Опционально: MIDI Clock (F8) на выбранный выход.
- **DoD:** typecheck + lint + unit-тесты (маршрутизация, localControl).
- **Зависит от задач:** T-002
- **Статус:** 🔴 Запланировано

#### T-046. UI для настройки MIDI-выхода

- **Родительская функция:** §3.7
- **Приоритет:** P2
- **Сложность:** S
- **Слой:** plugins
- **Модуль:** `packages/plugins/core-player/src/components/MidiOutputSettings.tsx` (🔴 новый) или в настройках
- **Описание:**
  - Список доступных MIDI-выходов.
  - Для каждого инструмента аккомпанемента: выбор выходного порта и канала.
  - Чекбокс `MIDI Clock` для синхронизации.
  - `Local Off` для соло-клавиатуры.
- **DoD:** typecheck + lint + компонентный тест.
- **Зависит от задач:** T-045
- **Статус:** 🔴 Запланировано

---

### Документация

#### T-047. Создать `docs/MIDI.md` — документация MIDI-подсистемы

- **Родительская функция:** §4.4
- **Приоритет:** P1
- **Сложность:** M
- **Слой:** docs
- **Модуль:** `docs/MIDI.md` (🔴 новый)
- **Описание:** Документ, описывающий MIDI-подсистему Jazz Trainer: подключение устройств, выбор тембра, соло-инструменты (синтез vs сэмплы), ducking, запись, JamEval, пресеты сцены, MIDI-выход. Для пользователей и разработчиков.
- **DoD:** ревью tech-writer'а.
- **Зависит от задач:** T-034 (после работающего Free Play)
- **Статус:** 🔴 Запланировано

#### T-048. Обновить `docs/ARCHITECTURE_BASE.md` — секция «Звук и MIDI»

- **Родительская функция:** §4.4
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** docs
- **Модуль:** `docs/ARCHITECTURE_BASE.md` (доработка)
- **Описание:** Добавить в §4: `SoloInstrument`, `SynthSoloInstrument`, `SamplerSoloInstrument`, `ReuseSoloInstrument`, `SoloInstrumentManifest`, `MidiRecorder`, `JamEval`, плагин `visual.midi-keyboard`. Обновить статус фазы Ф5.
- **DoD:** typecheck (документ корректен), ревью.
- **Зависит от задач:** T-034
- **Статус:** 🔴 Запланировано

#### T-049. Обновить `docs/FUNCTIONS.md` — новые возможности

- **Родительская функция:** §4.4
- **Приоритет:** P2
- **Сложность:** S
- **Слой:** docs
- **Модуль:** `docs/FUNCTIONS.md` (доработка)
- **Описание:** Добавить в §6 «Аудио и MIDI»: живой MIDI-инструмент, соло-тембры, виртуальная клавиатура, запись, JamEval, пресеты сцены, MIDI-выход. Обновить статусы.
- **DoD:** ревью.
- **Зависит от задач:** T-047
- **Статус:** 🔴 Запланировано

---

### Фаза F: UX-полировка MIDI-подключения (Неделя 8.5–9)

> **Цель фазы:** сделать подключение MIDI очевидным для пользователя — явная кнопка активации, авто-показ клавиатуры, понятный индикатор.
> **После фазы F:** пользователь заходит на плеер → видит кнопку «Enable MIDI» → кликает → устройства определяются → клавиатура открывается автоматически.

#### T-050. Кнопка «Connect MIDI» + авто-показ клавиатуры + улучшенный индикатор

- **Родительская функция:** §3.1 MIDI-подключение (MIDI_INSTRUMENT_VISION), §4.3 Улучшение UX
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** plugins
- **Модуль:** `packages/plugins/core-player/src/PlayerPage.tsx` (доработка), `packages/plugins/core-player/src/components/MidiIndicator.tsx` (доработка)
- **Описание:**
  Три UX-проблемы текущей реализации (все компоненты уже есть, но пользователь их не видит):
  1. **Нет явной кнопки активации MIDI.** `initMidi()` вызывается при первом pointerdown/keydown в `main.tsx`, но пользователь об этом не знает. Если устройство подключено до жеста — ничего не происходит. Решение:
     - Добавить кнопку **«🎹 Enable MIDI»** на панель `PlayerToolbar` (рядом с `MidiIndicator`), видимую когда `connectionStatus === 'disconnected'`.
     - При клике: вызвать `initMidi()`, показать текст «Connecting…» на время инициализации, затем обновить список устройств.
     - После успешной инициализации кнопка заменяется на `MidiDeviceSelector` (уже существует, рендерится при `availableDevices.length > 0`).
  2. **Виртуальная клавиатура скрыта по умолчанию.** Пользователь не знает, что кнопка 🎹 открывает клавиатуру. Решение:
     - При переходе `connectionStatus` → `'connected'` автоматически установить `keyboardVisible = true`.
     - Добавить `title`/тултип к кнопке 🎹: «Show virtual keyboard (auto-opens when MIDI connects)».
  3. **Индикатор не различает «MIDI не пробовали» и «MIDI нет».** Текущие три состояния: 🔴 disconnected, 🟡 available, 🟢 connected — не показывают, была ли попытка инициализации. Решение:
     - Добавить локальное состояние `midiInitAttempted` в `PlayerPage`.
     - Пока `!midiInitAttempted` — показывать кнопку «Enable MIDI» и серый (⏳) индикатор с текстом «MIDI not enabled».
     - После попытки — стандартные три состояния.
     - **Без изменения интерфейса `InputPort`** — новое состояние только на уровне UI.

- **DoD:** typecheck + lint + ручное тестирование (Chrome с MIDI-устройством):
  - Без MIDI: видна кнопка «Enable MIDI», серый индикатор.
  - Клик на кнопку → MIDI-устройство появляется в селекторе, индикатор 🟢, клавиатура открывается.
  - Hot-plug (подключить/отключить во время сессии) — индикатор и селектор обновляются.
- **Зависит от задач:** T-010, T-011, T-020 (все 🟢 — уже реализованы)
- **Статус:** 🔴 Запланировано

---

## 2. Последовательность (Ordering)

```
Фаза A: Инфраструктура (Недели 1–2)           ← КРИТИЧЕСКИЙ ПУТЬ
  T-001 ──────────────────────────────────────  InputPort расширение
  T-002 ─── зависит от T-001 ─────────────────  WebMidiAdapter доработка
  T-003 ─── зависит от T-002 ─────────────────  Тесты InputPort/WebMidiAdapter
  T-004 ──────────────────────────────────────  SoloInstrument интерфейс (║ с T-001)
  T-005 ─── зависит от T-004 ─────────────────  SynthSoloInstrument (║ с T-002)
  T-006 ─── зависит от T-004 ─────────────────  Контрактный тест (║ с T-005)
  T-007 ─── зависит от T-005, T-006 ──────────  Unit-тесты SynthSoloInstrument
  T-008 ─── зависит от T-004 ─────────────────  ToneAudioAdapter → SoloBus (║ с T-005)
  T-009 ─── зависит от T-008 ─────────────────  Тесты SoloBus
  T-010 ─── зависит от T-002 ─────────────────  useMidiConnection хук (║ с T-008)
  T-011 ─── зависит от T-010 ─────────────────  MidiIndicator компонент

  ✓ Чекпоинт A: MIDI подключён → слышен Synth (Default)

Фаза B: Виртуальная клавиатура (Недели 2.5–4)
  T-012 ──────────────────────────────────────  Скелет плагина visual.midi-keyboard
  T-013 ─── зависит от T-012 ─────────────────  Регистрация + алиасы
  T-014 ─── зависит от T-012 ─────────────────  keyboardLayout (║ с T-013)
  T-015 ─── зависит от T-014 ─────────────────  VirtualKeyboard компонент
  T-016 ─── зависит от T-002, T-012 ──────────  useMidiVisualizer хук (║ с T-015)
  T-017 ─── зависит от T-015, T-016 ──────────  Режимы отображения
  T-018 ─── зависит от T-011 ─────────────────  MidiIndicator в плагине (║)
  T-019 ─── зависит от T-016 ─────────────────  MidiLog (P3, можно позже)
  T-020 ─── зависит от T-015, T-016 ──────────  Интеграция в core-player
  T-021 ─── зависит от T-015–T-019 ───────────  Тесты визуализации

  ✓ Чекпоинт B: клавиши на экране подсвечиваются при игре

Фаза C: Соло-инструменты и игра с аккомпанементом (Недели 4–6)  ← КРИТИЧЕСКИЙ ПУТЬ
  T-022 ─── зависит от T-004, T-006 ──────────  SamplerSoloInstrument
  T-023 ─── зависит от T-004, T-022 ──────────  ReuseSoloInstrument
  T-024 ─── зависит от T-004, T-005, T-022 ───  SoloInstrumentManifest интерфейс
  T-026 ─── зависит от T-005, T-024 ──────────  Манифесты synth (║ с T-022)
  T-027 ─── зависит от T-023, T-024 ──────────  Манифесты reuse (║ с T-026)
  T-028 ─── зависит от T-022, T-024 ──────────  Сэмплы P1 (Clarinet, Vibra, Guitar)
  T-029 ─── зависит от T-022, T-024 ──────────  Сэмплы P2 (Trumpet, Flute) — можно позже
  T-025 ─── зависит от T-024, T-026–T-029 ────  Реестр (после манифестов)
  T-030 ──────────────────────────────────────  DuckingCompressor логика (║)
  T-031 ─── зависит от T-008, T-030 ──────────  Ducking-звук в адаптере
  T-032 ─── зависит от T-005, T-022, T-024, T-025  SoloInstrumentHost
  T-033 ─── зависит от T-010, T-032 ──────────  UI соло-управления (║ с T-031)
  T-034 ─── зависит от T-002, T-008, T-032 ───  Free Play интеграция ← ГЛАВНЫЙ ИНТЕГРАТОР

  ✓ Чекпоинт C: соло с выбранным тембром поверх сетки, ducking работает

Фаза D: Запись и оценка (Недели 6–7.5)
  T-035 ──────────────────────────────────────  MidiRecorder
  T-036 ─── зависит от T-034, T-035 ──────────  Интеграция рекордера
  T-037 ─── зависит от T-035, T-036, T-015 ───  Воспроизведение записи
  T-038 ──────────────────────────────────────  JamEval классификация
  T-039 ─── зависит от T-038 ─────────────────  JamEval статистика
  T-040 ─── зависит от T-038, T-039, T-016, T-034  JamEval UI + интеграция
  T-041 ─── зависит от T-038, T-034 ──────────  Chord Grid Highlight (║ с T-040)

  ✓ Чекпоинт D: запись, воспроизведение, аналитика

Фаза E: Пресеты и MIDI-выход (Недели 7.5–8.5)
  T-042 ──────────────────────────────────────  ScenePresetDTO
  T-043 ─── зависит от T-042 ─────────────────  BUILT_IN_SCENE_PRESETS
  T-044 ─── зависит от T-033, T-034, T-042, T-043  ScenePresetSelector + applyPreset
  T-045 ─── зависит от T-002 ─────────────────  WebMidiAdapter MIDI-выход
  T-046 ─── зависит от T-045 ─────────────────  UI MIDI-выхода

  ✓ Чекпоинт E: пресеты работают, MIDI-выход маршрутизируется

Документация (параллельно с фазами C–E)
  T-047 ─── зависит от T-034 ─────────────────  docs/MIDI.md
  T-048 ─── зависит от T-034 ─────────────────  Обновление ARCHITECTURE_BASE.md
  T-049 ─── зависит от T-047 ─────────────────  Обновление FUNCTIONS.md

Фаза F: UX-полировка MIDI-подключения (Неделя 8.5–9)
  T-050 ─── зависит от T-010, T-011, T-020 ────  Кнопка «Connect MIDI» + авто-клавиатура + индикатор

  ✓ Чекпоинт F: пользователь видит кнопку Enable MIDI, кликает → всё работает с первого раза
```

---

## 3. Оценка суммарной трудоёмкости

| Сложность | Количество   | Часов (оценка) |
| --------- | ------------ | -------------- |
| XS (<1d)  | 4            | ~16            |
| S (1–2d)  | 24           | ~168           |
| M (3–5d)  | 22           | ~352           |
| **Итого** | **50 задач** | **~536 часов** |

При 40-часовой рабочей неделе: **~13 недель** (одним разработчиком).  
С учётом параллельного выполнения независимых задач: **~8–10 недель** (реалистично).

> **Близко к оценке VISION (6–8 недель).** Разница в ~2 недели объясняется добавлением тестовых задач и документации как отдельных позиций.

---

## 4. Критические пути

### Критический путь 1: «MIDI-ввод → звук» (Фазы A → C)

```
T-001 → T-002 → T-010 → T-032 → T-034
                              ↗
T-004 → T-005 → T-024 → T-025 ↗
                  ↗
        T-022 → T-023 → T-027 ↗
```

**Длина:** ~7 зависимостей. Определяет, когда пользователь впервые услышит живую игру поверх аккомпанемента.

### Критический путь 2: «Визуализация» (Фаза B)

```
T-012 → T-014 → T-015 → T-020
                  ↘
        T-016 → T-017 ↗
```

**Длина:** ~4 зависимости. Может идти параллельно с путём 1 после T-002.

### Независимые цепочки (могут идти параллельно)

- **Документация** (T-047–T-049) — после T-034, не блокирует релиз.
- **P2/P3 фичи** (T-029, T-035–T-041, T-042–T-046) — после T-034, не блокируют MVP.
- **Ducking** (T-030–T-031) — параллельно с C, после T-008.

### Что определяет MVP (Minimum Viable Product)

MVP = **Фаза A + Фаза B (только T-012–T-016, T-020) + Фаза C (без P2-сэмплов)**.

После MVP пользователь может:

- Подключить MIDI-клавиатуру **с первого клика** (кнопка «Enable MIDI» на панели)
- Слышать дефолтный синтезатор
- Видеть нажатия на виртуальной клавиатуре **(авто-открытие при подключении)**
- Играть поверх аккомпанемента с выбором тембра и ducking

Это **~7 недель** (Фаза A: 2 нед + Фаза B: 1.5 нед + Фаза C: 2.5 нед + Фаза F: 0.5 нед).

---

_План на основе [MIDI_INSTRUMENT_VISION.md](./MIDI_INSTRUMENT_VISION.md) и [MIDI_INSTRUMENT_ARCHITECTURE.md](./MIDI_INSTRUMENT_ARCHITECTURE.md). Статус 🟡 Черновик — ожидает ревью и подтверждения._
