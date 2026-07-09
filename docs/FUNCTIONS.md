# Возможности Jazz Trainer

> **Назначение:** Каталог всех возможностей сервиса — что умеет Jazz Trainer.
> **Аудитория:** Пользователи, product-менеджеры, новые разработчики.
> **Детали архитектуры:** См. `docs/ARCHITECTURE_BASE.md`.
>
> Статусы: 🟢 = реализовано, 🟡 = частично, 🔴 = запланировано.

---

## Обзор

Jazz Trainer — браузерный тренажёр джазовой гармонии. Позволяет создавать, редактировать и воспроизводить гармонические сетки с аккомпанементом (барабаны, бас, гармония), изучать теорию музыки, тренировать слух и ритм через MIDI-упражнения.

**Публичный доступ:** Каталог и плеер доступны без входа. Аутентификация (Google OAuth) добавляет персональные возможности: свой каталог, настройки, лайки.

---

## 1. Ядро приложения

### 1.1. Редактор гармонических сеток 🟢

**Плагин:** `core-editor` | **Маршрут:** `/grids/:id`

- Создание и редактирование гармонических сеток через DSL (предметно-ориентированный язык)
- Ввод аккордов в текстовом формате: `| Cmaj7 | Dm7 G7 | Cmaj7 |`
- Поддержка размеров: 4/4, 3/4, 2/4, 5/4, 6/8
- Сохранение сеток в личный каталог (требуется авторизация)
- Публикация сеток в общий каталог

### 1.2. Плеер 🟢

**Плагин:** `core-player` | **Маршрут:** `/grids/:id/play`

- Воспроизведение гармонических сеток с аккомпанементом
- Транспорт: play, pause, stop, loop
- Регулировка темпа (BPM)
- Визуализация текущей позиции в сетке
- Настройка громкости инструментов

### 1.3. Каталог сеток 🟢

**Плагин:** `catalog` | **Маршрут:** `/` (главная)

- Просмотр публичных гармонических сеток
- Поиск по названию, стилю, автору
- Карточки сеток с предпросмотром
- Лайки и копирование в свой каталог (с авторизацией)
- Личный каталог (My grids) для авторизованных пользователей

### 1.4. Настройки аранжировки 🟢

**Плагин:** `core-settings` | **Маршрут:** `/settings`

- Выбор стиля (swing, bossa, funk, latin, ballad) с предпросмотром ансамбля
- Конфигурация ансамбля: пресеты (duet/trio/quartet/quintet/full) или ручной выбор инструментов
- Per-instrument настройки: включение/выключение, выбор драм-кита, per-style оверрайды
- Выбор сольного инструмента для live MIDI-ввода

---

## 2. Теория музыки

Все лекции доступны через каталог `theory-catalog` (`/theory`) с поиском, сортировкой и лайками.

### 2.1. Основы 🟡

**Плагины:** `theory-scales`, `theory-chords`, `theory-intervals` | **Маршруты:** `/scales`, `/chords`, `/intervals`

- Интерактивный справочник ладов и гамм с визуализацией
- Словарь джазовых аккордов (maj7, m7, 7, m7b5, dim7, aug и др.)
- Справочник интервалов с визуализацией на клавиатуре

### 2.2. Импровизация 🟡

**Плагины:** `theory-chord-tones`, `theory-approach-notes`, `theory-arpeggios` | **Маршруты:** `/theory/chord-tones`, `/theory/approach-notes`, `/theory/arpeggios`

- Аккордовые звуки — фундамент джазовой импровизации
- Хроматические подходные ноты
- Арпеджио: построение и применение

### 2.3. Ритм и грув 🟡

**Плагины:** `theory-rhythm`, `theory-groove` | **Маршруты:** `/theory/rhythm`, `/theory/groove`

- Основы джазового ритма, свинг и синкопы
- Понятие грува, взаимодействие ритм-секции

### 2.4. Блюз 🟡

**Плагины:** `theory-blues`, `theory-blues-advanced` | **Маршруты:** `/theory/blues`, `/theory/blues-advanced`

- Блюзовая форма, блюзовый лад и блюзовые ноты
- Продвинутый блюз: гармонические усложнения

### 2.5. Гармонические концепции 🟡

**Плагины:** `theory-ii-v-i`, `theory-turnarounds`, `theory-rhythm-changes`, `theory-coltrane-changes`

- ii–V–I — главная джазовая каденция (`/theory/ii-v-i`)
- Обороты (turnarounds): I–VI–II–V и iii–VI–II–V (`/theory/turnarounds`)
- Rhythm Changes — структура на основе I Got Rhythm (`/theory/rhythm-changes`)
- Coltrane Changes — гармонический цикл больших терций (`/theory/coltrane-changes`)

### 2.6. Продвинутая гармония 🟡

**Плагины:** `theory-tritone-sub`, `theory-secondary-dominants`, `theory-modal-interchange`, `theory-diminished-harmony`

- Тритоновая замена: G7 → D♭7 (`/theory/tritone-sub`)
- Побочные доминанты: V7/ii, V7/V, V7/vi (`/theory/secondary-dominants`)
- Ладовый обмен: заимствование аккордов из параллельных ладов (`/theory/modal-interchange`)
- Уменьшённая гармония: diminished-аккорды (`/theory/diminished-harmony`)

### 2.7. Гаммы и голосоведение 🟡

**Плагины:** `theory-scales-jazz`, `theory-voicings`, `theory-voice-leading`

- Джазовые гаммы: diminished, whole-tone, altered (`/theory/scales-jazz`)
- Аккордовые голосоведения: shell, rootless, drop-2 (`/theory/voicings`)
- Voice Leading: плавное голосоведение в ii–V–I (`/theory/voice-leading`)

---

## 3. Тренировка

### 3.1. Тренировка слуха 🟢

**Плагин:** `ear-training` | **Маршрут:** `/ear-training`

- Упражнения на распознавание интервалов на слух
- MIDI-ввод: играешь ответ на MIDI-клавиатуре
- Мгновенная оценка точности через `midiEval`
- Настройка сложности: выбор интервалов, диапазон, направление (восходящие/нисходящие)
- Статистика и прогресс

### 3.2. Ритмические упражнения 🟢

**Плагин:** `rhythm-drills` | **Маршрут:** `/rhythm-drills`

- Тренировка ритма через MIDI-ввод (tap на клавиатуре / пэде)
- Заданный ритмический паттерн — нужно повторить
- Оценка точности попадания в долю
- Размеры: 4/4, 3/4, 6/8 и др.
- Визуализация ритма и результата

### 3.3. Карточки упражнений 🟢

**Плагин:** `practice-cards` | **Маршрут:** `/practice-cards`

- Интерактивные упражнения с визуальными карточками («телесуфлёр»)
- Тренировка аккордовых прогрессий: карточки сменяются по тактам, нужно играть аккорды
- Тренировка гамм: карточки показывают гамму для текущего аккорда
- 3-шаговый мастер настройки: тип упражнения → источник/конфигурация → предпросмотр
- Источники контента: DSL (ручной ввод), генератор прогрессий, встроенные шаблоны
- Настройка: количество тактов, темп, тональность, стиль, repetitions
- Аккомпанемент: бас, барабаны, фортепиано, Rhodes (переиспользует `TransportEngine`)
- Визуальные карточки с анимацией slide-left (1/2/3 одновременно)
- Затакт (count-in) с точками-светофором
- Сводка после упражнения: количество карточек, время, настройки
- Генераторы упражнений: `chordExercise` (аккорды), `scaleExercise` (гаммы)
- Подробнее: `docs/EXERSISE-VISION.md`, `docs/EXERSISE-ARCHITECTURE.md`

---

## 4. Проверка знаний

### 4.1. Квиз по аккордам 🟡

**Плагин:** `chord-quiz` | **Маршрут:** `/chord-quiz`

- Проверка знания аккордов: показан символ → нужно выбрать правильный состав
- Или наоборот: показаны ноты → выбрать символ аккорда
- Типы аккордов из учебной программы
- Результат и статистика

### 4.2. Распознавание прогрессий 🟡

**Плагин:** `progression-recognition` | **Маршрут:** `/progression-recognition`

- Прослушивание гармонической последовательности
- Нужно определить прогрессию (ii–V–I, I–IV–V и т.д.)
- Разбор результата: правильный ответ, объяснение
- Уровни сложности

---

## 5. Администрирование

Все административные функции доступны только пользователям с ролью `admin` или `super_admin`.

### 5.1. Управление пользователями 🟢

**Плагин:** `admin-users` | **Маршрут:** `/admin/users`

- Просмотр списка пользователей
- Назначение ролей (`user`, `admin`, `super_admin`)
- Блокировка / разблокировка аккаунтов

### 5.2. Управление контентом 🟢

**Плагин:** `admin-content` | **Маршрут:** `/admin/content`

- Модерация публичных гармонических сеток
- Просмотр, удаление, скрытие сеток
- Управление фиче-контентом

### 5.3. Feature flags 🟢

**Плагин:** `admin-flags` | **Маршрут:** `/admin/flags`

- Включение / выключение фич без деплоя
- Флаги: глобальные и per-user
- Немедленное применение

### 5.4. Управление ассетами 🟢

**Плагин:** `admin-assets` | **Маршрут:** `/admin/assets`

- Загрузка и управление аудио-сэмплами, MIDI-файлами
- Просмотр загруженных ассетов
- Удаление неиспользуемых

### 5.5. Диагностика 🟢

**Плагин:** `admin-diagnostics` | **Маршрут:** `/admin/diagnostics`

- Просмотр audit log (журнал всех действий)
- Статистика использования
- Health-check системы

---

## 6. Аудио и MIDI

### 6.1. Аудио-движок 🟢

- Звуковой движок на базе Tone.js (Web Audio API)
- Изолирован от ядра через `AudioPort` (адаптер `tone-audio-adapter`)
- Заменяем на другой движок без изменения ядра и плагинов

### 6.2. MIDI-ввод и вывод 🟢

- MIDI-ввод через Web MIDI API (адаптер `webmidi-adapter`)
- Поддержка внешних MIDI-устройств (клавиатуры, пэды)
- MIDI-вывод для отправки нот на внешние синтезаторы
- Оценка точности игры через `midiEval` (`music-core`)

### 6.3. Инструменты аккомпанемента 🟢

**Бас (BassInstrument):**

- Генерация басовой линии по гармонической сетке
- Стиле-зависимые паттерны: swing (walking), bossa (root-5th), funk (syncopated), latin (montuno), ballad (two-feel)
- 7 уровней сложности от простого root до полноценного walking bass
- **Sub-bar chord resolution:** корректная смена аккордов внутри такта (multi-chord бары)
- Встроенный рандомайзер с вариантами approach (chromatic above/below, diatonic), sparse-режимом и октавными прыжками
- Использование сэмплов контрабаса
- Подробнее: `docs/BASS.md`

**Барабаны (DrumInstrument) 🟢:**

- Два набора сэмплов: Jazz Drum Kit (Swirly Drums 1104, 4 velocity-слоя) и Funk Drum Kit (Virtuosity Drums, 2–5 layers)
- Organism-driven паттерны v2: organism → cell → molecule → atom для всех 5 стилей (swing/bossa/funk/latin/ballad)
- Per-style defaults: per-kit overrides (swing ride-driven, bossa clave+rim, funk 16-е + акценты, …)
- Per-sound настройки: раздельное включение/громкость для каждого звука
- Humanization (timing jitter ±3–8 мс) и рандомайзер (off/subtle/moderate/high)
- Fills каждые N тактов (4/8/16) с настраиваемой сложностью
- Modern Kit: per-style defaults (bossa: snare off, rim on; ballad: громкость 0.6)
- Подробнее: `docs/DRUMS.md`

**Grand Piano (PianoInstrument) 🟢:**

- Основной гармонический инструмент — ведущая партия компинга
- 5 составных 4-тактовых профилей: swing-sparse, swing-medium, basie-light, offbeat-push, beginner-safe
- Адаптивный профиль для multi-chord баров: автоматически переключается на `two-and-four` (2 аккорда) или `quarter-comp` (3–4 аккорда)
- 4 типа voicing'ов: shell2, rootless3, rootless4, quartal
- Voice leading с минимальным движением голосов между аккордами (включая внутритактовые переходы)
- Встроенный рандомайзер (off/subtle/moderate/high)
- Стиле-зависимый выбор профиля по умолчанию
- Два источника сэмплов: Salamander Grand Piano, Upright KW
- Подробнее: `docs/PIANO.md`

**Rhodes (RhodesInstrument) 🟢 — комплементарный слой:**

- Текстурный слой поверх Grand Piano — добавляет окраску и плотность
- Комплементарные режимы: pads (wholeNotes), subtle-offbeats (offbeat-2-4), high-comping, ambient-swells (halfNotes), stab-accents (basie-2-4)
- Sub-bar chord resolution: каждый event резолвит аккорд на момент звучания
- Верхний регистр (C4–C6), избегает конфликтов с Grand Piano (проверка `avoidConflicts`)
- Rootless voicings (shell2, rootless3, rootless4)
- Voice leading между аккордами (включая внутритактовые переходы)
- Подробнее: `docs/RHODES.md`

**Гитара (GuitarInstrument) 🟢:**

- Два варианта сэмплов: nylon (Spanish Classical) и steel (steel-string)
- Два режима: comp (четверти, downstroke/upstroke) и fingerstyle (арпеджио половинными)
- Стиле-специфичные паттерны: bossa-comping (bossa), funk-chops (funk), freddie-green (swing)
- Два типа voicing'ов: open (5–6 нот) и jazz (shell: root, 3, 7)
- Диапазон E2–E5, голосоведение в пределах гитарного диапазона
- Подробнее: `docs/GUITAR.md`

**Электрогитара (ElectricGuitarManifest) 🟢:**

- Использует тот же `GuitarInstrument`, электрические сэмплы
- 2 velocity-слоя (normal — полный пик, soft — finger/palm mute)
- Диапазон E2–C#6, per-style defaults для всех 5 стилей
- Подробнее: `docs/GUITAR.md`

**Вибрафон (VibraphoneInstrument) 🟢:**

- Полифонический инструмент, два паттерна: pads (целые ноты с vibrato) и inserts (арпеджио)
- Использует voicing-движок Grand Piano (rootless3/rootless4)
- Стиле-зависимый выбор паттерна: latin → inserts, остальные → pads
- Humanization ±6 мс, velocity variation ±0.05
- Подробнее: `docs/VIBRAPHONE.md`

**Орган (OrganInstrument) 🟢:**

- Hammond-style полифонический инструмент, три паттерна: pads (целые ноты), stabs (короткие аккорды на offbeat'ах), pads-stabs (комбинированный)
- Использует voicing-движок Grand Piano, плотность rootless4 по умолчанию
- Стиле-зависимый выбор: funk → pads-stabs, остальные → pads
- Humanization ±6 мс, velocity variation ±0.05
- Подробнее: `docs/ORGAN.md`

**Перкуссия (PercussionInstrument) 🟢:**

- Unpitched инструмент для латиноамериканской перкуссии
- 16 звуков: core (conga high/low, timbales, cowbell, clave, shaker, guiro, triangle) + extended (bongo low, tumba, cabasa, tambourine, vibraslap, belltree, whistle, sleighBells)
- Три паттерна: cascara-clave (latin/swing), bossa-texture, funk-accents
- Humanization ±2–6 мс, per-sound настройки включения/громкости
- Подробнее: `docs/PERCUSSION.md`

**Кларнет (ClarinetInstrument) 🟢:**

- Монофонический деревянный духовой инструмент
- Два паттерна: counterpoint (контрапункт — 3 ноты на такт, cycling через voicing) и melodicPhrases (мелодические фразы из chord tones и passing tones)
- Использует voicing-движок Grand Piano для пула нот
- Стиле-зависимый выбор: swing/funk/ballad → counterpoint, bossa/latin → melodicPhrases
- Humanization ±6 мс, velocity variation ±0.05
- Подробнее: `docs/CLARINET.md`

### 6.5. Сольные инструменты (SoloInstrument) 🟢

- Подсистема для live MIDI-ввода — реагирует на события noteOn/noteOff в реальном времени
- Интерфейс `SoloInstrument` (в отличие от `Instrument`, который планирует ноты в будущее через `TransportEngine`)
- Три категории: `synth` (синтезаторные тембры), `sampled` (сэмплированные), `reuse` (переиспользование сэмплера аккомпанирующего инструмента)
- 7 доступных тембров: synthDefault, pianoUprightSolo, pianoSalamanderSolo, rhodesJRhodes3cSolo, clarinetSolo, vibraphoneSolo, guitarNylonSolo
- `SoloInstrumentManifest` — самодостаточное описание (аналог `InstrumentManifest` для сольных)
- `SoloInstrumentHost` — управление жизненным циклом (создание, переключение, dispose)
- Подробнее: `docs/MIDI_INSTRUMENT_ARCHITECTURE.md`, `docs/MIDI_ARCHITECTURE.md`

### 6.6. MIDI-визуализатор 🟢

**Плагин:** `visual-midi-keyboard` | **Маршрут:** `/midi-keyboard`

- Виртуальная MIDI-клавиатура с визуальной индикацией нажатых нот
- MIDI-индикатор ввода: отображение noteOn/noteOff в реальном времени
- Интеграция с сольными инструментами для live-игры

### 6.4. Транспорт, метроном и глобальный стиль 🟢

- `TransportEngine` (`music-core`): единое управление временем
- Точный метроном с визуальной и звуковой индикацией
- Loop: зацикливание выбранного диапазона тактов
- Предсчёт (count-in)
- **Глобальный стиль:** единый `Style` (swing, bossa, funk, latin, ballad) управляет поведением всех инструментов (Bass, Piano, Rhodes, Drums) согласованно
- **StyleProfile:** централизованные стиле-специфичные настройки — ростеры инструментов, per-instrument дефолты, ансамбли-предсеты (duet/trio/quartet/quintet/full). Подробнее: `docs/STYLES.md`
- **Sub-bar chord timeline:** `ChordTimeline` поддерживает multi-chord бары (несколько аккордов в одном такте), инструменты резолвят аккорд на момент звучания ноты. Подробнее: `docs/CHORDS.md`

---

## 7. DSL для гармонии

**Формат ввода гармонических сеток:**

```
// Простая прогрессия
| Cmaj7 | Dm7 G7 | Cmaj7 |

// С размером и стилем
@4/4 swing
| Cmaj7 | Am7 Dm7 G7 | Cmaj7 G7 | Cmaj7 |

// Повторы и вольты
|: Cmaj7 | Dm7 G7 :| Cmaj7 |
```

**Поддерживаемые конструкции:**

- Такты с одним или несколькими аккордами
- Размеры: 4/4, 3/4, 2/4, 5/4, 6/8
- Повторы (`|:` ... `:|`) и вольты
- Стили: swing, latin, ballad
- Аккорды: maj7, m7, 7, m7b5, dim7, aug7, sus4 и др.
- Обращения (слэш-аккорды): `Cmaj7/E`, `Dm7/A`

---

## 8. API

### 8.1. Аутентификация

- Google OAuth 2.0
- Dev-login fallback (`AUTH_DEV_MODE=true`) — вход без реальных OAuth credentials
- Управление сессиями (cookies)

### 8.2. Гармонические сетки (CRUD)

- `GET /api/grids` — список публичных сеток (поиск, пагинация)
- `GET /api/grids/:id` — детали сетки
- `POST /api/grids` — создать сетку (авторизованные)
- `PATCH /api/grids/:id` — обновить сетку (владелец)
- `DELETE /api/grids/:id` — удалить сетку (владелец / admin)
- `POST /api/grids/:id/like` — лайкнуть
- `POST /api/grids/:id/copy` — скопировать в свой каталог

### 8.3. Настройки пользователя

- `GET /api/settings` — получить настройки
- `PATCH /api/settings` — обновить настройки (темп, громкость, предпочтения)

### 8.4. Аудит и диагностика

- `GET /api/admin/audit` — просмотр audit log (admin)
- `GET /api/health` — health-check: `{ "status": "ok" }`

---

## 9. Генераторы

Генераторы создают учебный материал автоматически:

- **Генератор прогрессий:** Создаёт гармонические последовательности по заданным правилам (ii–V–I, turnaround, rhythm changes и др.)
- **Генератор упражнений (chordExercise):** Генерирует аккордовые карточки по конфигурации (Config → PracticeBar[]) — используется в `practice-cards`
- **Генератор упражнений (scaleExercise):** Генерирует гаммы для каждого аккорда в прогрессии — используется в `practice-cards`
- **Генератор ритмических паттернов:** Создаёт паттерны для `rhythm-drills`
- **DSL-парсер:** Преобразует текстовый DSL в `PracticeBar[]` — используется в `practice-cards` для ручного ввода прогрессий

> 🟢 Генераторы `chordExercise` и `scaleExercise` интегрированы через плагин `practice-cards`. Интеграция через `PluginContext.generators` не завершена.

---

_Документ обновлён 2026-07-02. Отражает фактические возможности сервиса на текущий момент. Плагинов: 37._
