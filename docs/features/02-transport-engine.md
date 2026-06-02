# F2 — Transport + metronome engine

**Ветка:** `feature/transport-engine`

## Scope
Реализовать музыкальную модель времени, transport, метроном и playback state machine
согласно [02-audio-engine.md](../02-audio-engine.md).

- `time/` — `TimeSignature`, `MusicalPosition`, PPQ, конвертации (ticks ↔ position ↔
  seconds), поддержка 4/4, 3/4, 2/4, 5/4, 6/8 (+ расширяемая модель).
- `playback/` — `PlaybackStateMachine` (чистый редьюсер): status (idle/playing/paused),
  currentBar, currentBeat, selectedBar; команды play/pause/stop/nextBar/prevBar/selectBar;
  реакция на tick-события.
- `audio/` — `TransportEngine` (обёртка над Tone.Transport): bpm, timeSignature, position,
  play/pause/stop/seekToBar, `onTick`. `MetronomeInstrument` (интерфейс `Instrument`):
  клики по активным долям, разный звук strong/weak.
- Маска активных долей; strong/weak звуки.

## Зависимости
F0. Tone.js подключается в audio-адаптере; чистое ядро (time/playback) тестируется без Tone.

## Контракты
Интерфейсы `TransportEngine`, `Instrument`, `PlaybackStateMachine` — см.
[02-audio-engine.md §3–4](../02-audio-engine.md). Глобальные настройки (BPM/клик) приходят
из UserSettings, размер — из сетки ([03-data-model.md](../03-data-model.md)).

## Тесты (unit, Vitest)
- `time/`: конвертации позиций/тиков/секунд для всех размеров (вкл. 6/8 группировку).
- `playback/`: переходы state machine — play с выбранного такта, pause сохраняет позицию,
  stop → начало, next/prev bar границы, select bar.
- `audio/`: smoke c замоканным Tone (планирование вызывается, маска долей учитывается).

## Definition of Done
- time-model и state machine покрыты тестами; зелёные.
- Метроном звучит вручную (проверка в браузере на этапе F8), интерфейс готов к accompaniment.
