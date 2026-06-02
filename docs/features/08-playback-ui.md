# F8 — Playback UI integration

**Ветка:** `feature/playback-ui`

## Scope
Связать transport/metronome (`music-core`) с UI согласно [05-frontend.md §4,§4a](../05-frontend.md).

- `engine/useTransport`: создание TransportEngine + MetronomeInstrument, применение
  BPM/клик из `useEffectiveSettings` (гость→localStorage, иначе сервер), timeSignature/key
  из `playbackOverride` или текущей сетки; подписка PlaybackStateMachine →
  `usePlaybackStore`; старт AudioContext по жесту.
- **PlayerPage** (`/play/:id`, публичный): плеер по публичным сеткам с навигацией
  «пред./след. сетка»; локальный override размера/тональности/BPM (не сохраняется).
- **TransportBar**: Play / Pause / Stop (→ начало) / Prev bar / Next bar; BPM-контрол,
  TimeSig/Key-селекты, настройки активных долей и strong/weak клика. В редакторе своей
  сетки пишет в сетку; в публичном плеере — в `playbackOverride`.
- Подсветка **текущего** такта во время playback и **выбранного** такта (разные стили).
- `BeatIndicator`: текущий такт и доля.
- Play стартует с выбранного такта или с начала; Pause сохраняет позицию; Stop → начало.

## Зависимости
F2 (transport/metronome), F7 (редактор + сетка), F6 (settings).

## Контракты
[02-audio-engine.md](../02-audio-engine.md), [05-frontend.md](../05-frontend.md).

## Тесты
- Vitest: `usePlaybackStore` проекция событий; TransportBar вызывает команды (transport
  замокан).
- **e2e (Playwright)**:
  - **Гость**: открыть `/` (публичный каталог, без логина) → открыть сетку в плеере →
    запустить метроном → переключение тактов (next/prev/select) → подсветка обновляется →
    stop → начало. Сменить BPM/размер локально (override).
  - **Авторизованный**: dev-login → лайкнуть публичную сетку → «скопировать себе» →
    редактировать копию → импорт DSL → сохранить → запустить метроном.

## Definition of Done
- Метроном играет по сетке с точным таймингом; управление и подсветка работают.
- e2e-сценарий зелёный; все тесты проходят.
