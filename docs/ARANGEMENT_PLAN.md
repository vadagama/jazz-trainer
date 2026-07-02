# План работ — ARANGEMENT (Стиль как главный принцип организации аранжировки)

**На основе:** `docs/ARANGEMENT_VISION.md`
**Дата:** 2026-07-01
**Горизонт:** 1 версия (4–6 недель)
**Статус:** 🟡 В работе — Фундамент и инструменты (T-001–T-022) ✅, UI и документация (T-023–T-029) 🔴

## 1. Задачи (Tasks)

---

### T-001. StyleProfile — типы и реестр

- **Родительская функция:** 3.1 Стиль как главенствующая сущность
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/styleProfile.ts` (новый), `packages/shared/src/constants.ts` (тип `Style` уже есть)
- **Описание:**
  - Создать интерфейсы `StyleProfile`, `InstrumentRoster`, `InstrumentStyleDefaults` (из VISION §3.1)
  - Создать `StyleRegistry` — реестр 5 стилей с полными профилями (ростеры, дефолтные темпы, свинг, настройки инструментов)
  - Наполнить данными из таблиц VISION §3.2 (росте́ры) и §3.5 (паттерны)
  - Экспортировать `getStyleProfile(style: Style): StyleProfile`, `getAllStyleProfiles(): StyleProfile[]`
  - Zod-схема для валидации профиля (если потребуется для API)
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Unit-тест: `getStyleProfile('swing')` возвращает корректный профиль со всеми полями
  - Unit-тест: все 5 стилей имеют уникальные `defaultTempo` и `swingRatio`
  - Unit-тест: ростер каждого стиля содержит хотя бы 1 `required` инструмент
- **Зависит от задач:** —
- **Статус:** ✅ Готово

---

### T-002. Расширение InstrumentManifest стилевыми дефолтами

- **Родительская функция:** 4.3 Расширение `InstrumentManifest`
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/audio/instrumentManifest.ts`
- **Описание:**
  - Добавить опциональное поле `perStyleDefaults?: Record<Style, Record<string, unknown>>` в `InstrumentManifest`
  - Обновить все 6 существующих манифестов (bass, drums, piano, rhodes, guitar, metronome) — добавить per-style defaults где релевантно
  - Экспортировать хелпер `resolveInstrumentDefaults(manifest, style): Record<string, unknown>`
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Все существующие тесты инструментов проходят
  - Тест: `resolveInstrumentDefaults(bassManifest, 'swing')` возвращает walking bass defaults
- **Зависит от задач:** T-001
- **Статус:** ✅ Готово

---

### T-003. Рефакторинг Style: от enum к объекту первого класса

- **Родительская функция:** 4.1 Рефакторинг `Style`
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `music-core` + все потребители
- **Модуль:** `packages/shared/src/constants.ts`, `packages/music-core/src/audio/*`
- **Описание:**
  - `type Style = 'swing' | 'bossa' | 'funk' | 'latin' | 'ballad'` остаётся как идентификатор
  - Все `*Instrument.setStyle(style: Style)` переходят на приём `StyleProfile` (новый метод `setStyleProfile(profile: StyleProfile)`)
  - Старый `setStyle()` оставить как deprecated-обёртку: внутри резолвит `StyleProfile` через `StyleRegistry`
  - `TransportEngine` получает метод `setStyleProfile()` — пробрасывает темп, свинг и профиль всем инструментам
  - Обновить `UserSettingsDTO`: добавить `style: Style`, deprecate `drumsPattern`
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Все существующие тесты проходят (старый API `setStyle()` работает через обёртку)
  - Тест: смена стиля в TransportEngine меняет поведение всех подключённых инструментов
- **Зависит от задач:** T-001, T-002
- **Статус:** ✅ Готово

---

### T-004. Хранение per-style пользовательских настроек (бэкенд)

- **Родительская функция:** 3.7 Интеллектуальная смена стиля
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** `api` + `shared`
- **Модуль:** `apps/api/src/db/schema.ts`, `apps/api/src/services/settings.service.ts`, `packages/shared/src/dto.ts`
- **Описание:**
  - Добавить JSON-поле `per_style_overrides` в таблицу `user_settings` (или новую таблицу `user_style_settings`)
  - Zod-схема: `Record<Style, Partial<UserInstrumentSettings>>`
  - API: `PATCH /api/settings` принимает `perStyleOverrides` — сохраняет только пользовательские изменения, не трогая дефолты
  - API: `DELETE /api/settings/style/:style` — сброс пользовательских правок для конкретного стиля
  - Сервис `resolveSettings(style, defaults, overrides): UserInstrumentSettings` — мёрджит базовые дефолты с пользовательскими
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Интеграционный тест: сохранить override для swing, переключить на bossa, вернуться на swing — override сохранён
  - Интеграционный тест: сброс override через `DELETE` возвращает стилевые дефолты
- **Зависит от задач:** T-001
- **Статус:** 🔴 Запланировано

---

### T-005. Modern Kit (новый барабанный манифест)

- **Родительская функция:** 3.3.1 Modern Kit
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `music-core` + `web` (сэмплы)
- **Модуль:** `packages/music-core/src/audio/modernKitManifest.ts` (новый), `apps/web/public/samples/aac/drums/modern/`
- **Описание:**
  - Найти/подготовить сэмплы: tight kick, crisp snare, sharp hi-hat (CC0/свободная библиотека) [assumption: основные звуки барабанов, 2–4 velocity-слоя]
  - Конвертировать в AAC/MP3, разместить в `apps/web/public/samples/aac/drums/modern-kit/`
  - Создать `modernKitManifest.ts` — `SampleManifest` по образу `drumsManifest.ts`
  - Зарегистрировать манифест в реестре инструментов
  - `DrumInstrument` уже поддерживает переключение манифестов — дописать выбор `drumKit: 'jazz-kit' | 'modern-kit'`
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Тест: Modern Kit играет все звуки из исходной библиотеки на соответствующих долях
  - Ручная проверка: переключение Jazz Kit ↔ Modern Kit без перезагрузки страницы
- **Зависит от задач:** T-003 (DrumInstrument принимает StyleProfile)
- **Статус:** ✅ Готово

---

### T-006. Electric Bass (новый басовый манифест)

- **Родительская функция:** 3.3.2 Electric Bass
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `music-core` + `web` (сэмплы)
- **Модуль:** `packages/music-core/src/audio/electricBassManifest.ts` (новый), `apps/web/public/samples/aac/bass/electric/`
- **Описание:**
  - Найти/подготовить сэмплы electric bass (fingerstyle, 2–3 velocity-слоя, E2–E5) [assumption: CC0-библиотека]
  - Конвертировать в AAC/MP3
  - Создать `electricBassManifest.ts` по образу `bassManifest.ts`
  - `BassInstrument` получает параметр `bassType: 'upright' | 'electric'` — переключение манифеста
  - Все 5 басовых паттернов (walking, root-5th, syncopated, montuno, two-feel) работают одинаково для обоих типов — меняется только тембр
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Тест: Electric Bass играет walking bass в swing
  - Тест: переключение Upright ↔ Electric без перезагрузки
- **Зависит от задач:** T-003
- **Статус:** 🔴 Запланировано

---

### T-007. Nylon Guitar — bossa-comping паттерн

- **Родительская функция:** 3.3.3 Nylon Guitar
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/audio/guitarInstrument.ts`
- **Описание:**
  - Добавить новый планировщик `scheduleBossaComping()` в `GuitarInstrument`
  - Паттерн: чередование басовой ноты (root/5-я на сильные доли) + аккорд (на offbeat)
  - Интегрировать в `schedule()`: при стиле bossa + nylon-гитара → использовать `scheduleBossaComping()`
  - Выбор гитарного типа (`nylon` | `steel` | `electric`) уже частично поддерживается — убедиться, что работает
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Тест: nylon-гитара в bossa играет характерный ритм с басовой нотой + аккордом
  - Тест: steel-гитара в swing продолжает играть Freddie Green (без регрессии)
- **Зависит от задач:** T-003
- **Статус:** ✅ Готово

---

### T-008. Electric Guitar — манифест + funk-chops паттерн

- **Родительская функция:** 3.3.4 Electric Guitar
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** `music-core` + `web` (сэмплы)
- **Модуль:** `packages/music-core/src/audio/guitarInstrument.ts`, `electricGuitarManifest.ts` (новый)
- **Описание:**
  - Найти/подготовить сэмплы электрогитары (2–3 velocity-слоя, E2–E5) [assumption: CC0-библиотека]
  - Создать `electricGuitarManifest.ts`
  - Добавить планировщик `scheduleFunkChops()` — резкие аккорды на offbeat (1&, 2&, 3&, 4&), короткая длительность
  - Интегрировать: при стиле funk + electric-гитара → `scheduleFunkChops()`
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Тест: electric-гитара в funk играет offbeat-аккорды
  - Ручная проверка: переключение nylon → steel → electric
- **Зависит от задач:** T-003, T-007
- **Статус:** ✅ Готово

---

### T-009. Trumpet (новый одноголосный инструмент)

- **Родительская функция:** 3.3.5 Trumpet
- **Приоритет:** P2
- **Сложность:** L (1–2w)
- **Слой:** `music-core` + `web` (сэмплы)
- **Модуль:** `packages/music-core/src/audio/trumpetInstrument.ts` (новый), `trumpetManifest.ts` (новый)
- **Описание:**
  - Создать `TrumpetInstrument implements Instrument` — одноголосный pitched-инструмент
  - Два тембра: `muted` (для swing) и `open` (для funk/latin) — через разные SampleManifest или velocity-слои
  - Паттерны: `scheduleMelodicPhrases()` — играет ноты из гаммы текущего аккорда (пентатоника / арпеджио), `scheduleRhythmicAccents()` — акценты на сильные доли
  - Интеграция с `ChordTimeline` для резолва аккорда
  - Humanization: timing jitter ±8ms, velocity variation ±0.05
  - [assumption] Первая версия без legato — монофонические ноты
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Тест: muted trumpet в swing играет мелодические фразы в тональности аккорда
  - Тест: open trumpet в funk играет синкопированные акценты
  - Тест: инструмент не играет когда выключен
- **Зависит от задач:** T-001, T-003
- **Статус:** 🟡 Частично (только SoloInstrumentManifest, не реализован как arrangement-инструмент)

---

### T-010. Vibraphone (новый полифонический инструмент)

- **Родительская функция:** 3.3.6 Vibraphone
- **Приоритет:** P2
- **Сложность:** L (1–2w)
- **Слой:** `music-core` + `web` (сэмплы)
- **Модуль:** `packages/music-core/src/audio/vibraphoneInstrument.ts` (новый), `vibraphoneManifest.ts` (новый)
- **Описание:**
  - Создать `VibraphoneInstrument implements Instrument` — полифонический pitched-инструмент
  - Характерное вибрато: LFO на амплитуду (Tone.js `Vibrato` или автоматизация gain)
  - Мягкая атака: envelope attack ~0.15–0.3s
  - Паттерны: аккордовые подклады (pads — целые ноты), мелодические вставки (арпеджио)
  - Voicing: переиспользовать `pianoVoicing` — rootless3/rootless4
  - [assumption] Сэмплы вибрафона (CC0), 2 velocity-слоя, C4–C7
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Тест: vibraphone в ballad играет целые ноты с вибрато
  - Тест: vibraphone в swing играет аккордовые подклады
- **Зависит от задач:** T-001, T-003
- **Статус:** ✅ Готово

---

### T-011. Flute (новый одноголосный инструмент)

- **Родительская функция:** 3.3.7 Flute
- **Приоритет:** P2
- **Сложность:** L (1–2w)
- **Слой:** `music-core` + `web` (сэмплы)
- **Модуль:** `packages/music-core/src/audio/fluteInstrument.ts` (новый), `fluteManifest.ts` (новый)
- **Описание:**
  - Создать `FluteInstrument implements Instrument` — одноголосный pitched-инструмент
  - Мягкий тембр, естественное вибрато (LFO на pitch ±10 cents)
  - Паттерны: `scheduleAiryPhrases()` — воздушные пассажи (длинные ноты с вибрато), `scheduleLatinPassages()` — быстрые латиноамериканские фразы
  - Интеграция с `ChordTimeline`
  - [assumption] Сэмплы флейты (CC0), 2 velocity-слоя, C4–C7
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Тест: flute в bossa играет воздушные пассажи
  - Тест: flute в latin играет характерные фразы
- **Зависит от задач:** T-001, T-003
- **Статус:** 🟡 Частично (только SoloInstrumentManifest, не реализован как arrangement-инструмент)

---

### T-012. Organ — Hammond-style (новый полифонический инструмент)

- **Родительская функция:** 3.3.8 Organ
- **Приоритет:** P2
- **Сложность:** L (1–2w)
- **Слой:** `music-core` + `web` (сэмплы)
- **Модуль:** `packages/music-core/src/audio/organInstrument.ts` (новый), `organManifest.ts` (новый)
- **Описание:**
  - Создать `OrganInstrument implements Instrument` — полифонический pitched-инструмент
  - Характерный «тёплый» тембр: насыщенные гармоники (drawbar-стиль)
  - Паттерны: плотные аккордовые подклады (pads), ритмические stabs (короткие аккорды на offbeat)
  - [assumption] Первая версия без Leslie-эмуляции и перкуссионного клика
  - [assumption] Сэмплы органа (CC0), 2 velocity-слоя, C2–C7
  - Voicing: rootless4 (плотное звучание)
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Тест: organ в funk играет плотные подклады
  - Тест: organ в funk играет ритмические stabs
- **Зависит от задач:** T-001, T-003
- **Статус:** ✅ Готово

---

### T-013. Percussion Kit (новый unpitched-инструмент)

- **Родительская функция:** 3.3.9 Percussion Kit
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** `music-core` + `web` (сэмплы)
- **Модуль:** `packages/music-core/src/audio/percussionInstrument.ts` (новый), `percussionManifest.ts` (новый)
- **Описание:**
  - Создать `PercussionInstrument implements Instrument` — unpitched, аналогичен `DrumInstrument`
  - Звуки: congas (high/low), timbales, cowbell, clave, shaker, guiro, triangle
  - Паттерны: cascara, clave (son/rumba), tumbao, montuno-ритм
  - Humanization: timing jitter ±5ms
  - [assumption] Сэмплы латиноамериканской перкуссии (CC0), 2–4 round-robin на звук
  - Регистрация в `InstrumentManifest`
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Тест: Percussion Kit в latin играет cascara + clave
  - Тест: Percussion Kit в bossa играет ритмическую текстуру
- **Зависит от задач:** T-001, T-003
- **Статус:** ✅ Готово

---

### T-014. Clarinet (новый одноголосный инструмент)

- **Родительская функция:** 3.3.10 Clarinet
- **Приоритет:** P3
- **Сложность:** L (1–2w)
- **Слой:** `music-core` + `web` (сэмплы)
- **Модуль:** `packages/music-core/src/audio/clarinetInstrument.ts` (новый), `clarinetManifest.ts` (новый)
- **Описание:**
  - Создать `ClarinetInstrument implements Instrument` — одноголосный pitched-инструмент
  - Мягкий, «деревянный» тембр
  - Паттерны: контрапункт (ответ на основную мелодию), мелодические фразы
  - Интеграция с `ChordTimeline`
  - [assumption] Сэмплы кларнета (CC0), 2 velocity-слоя, D3–C6
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Тест: clarinet в swing играет контрапункт
- **Зависит от задач:** T-001, T-003
- **Статус:** ✅ Готово

---

### T-015. Стиле-специфичные voicing-дефолты

- **Родительская функция:** 3.4 Стиле-специфичные voicing-профили
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/styleProfile.ts` (T-001)
- **Описание:**
  - В `StyleProfile.instrumentDefaults` для Piano и Rhodes прописать voicing по умолчанию:
    - Swing: `rootless3` / `rootless3`
    - Bossa: `shell2` / `shell2`
    - Funk: `rootless4` / `rootless4`
    - Latin: `quartal` / `rootless3`
    - Ballad: `rootless4` / `shell2`
  - При смене стиля `PianoInstrument.setStyleProfile()` и `RhodesInstrument.setStyleProfile()` применяют voicing-дефолт
  - Пользователь может переопределить — значение сохраняется в per-style overrides (T-004)
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Тест: выбор стиля Swing → piano voicing = rootless3
  - Тест: выбор стиля Latin → piano voicing = quartal
  - Тест: пользователь меняет voicing вручную → при смене стиля туда-обратно ручная настройка сохраняется (если T-004 готов)
- **Зависит от задач:** T-001, T-003
- **Статус:** ✅ Готово

---

### T-016. Подключение стиле-специфичных паттернов ко всем инструментам

- **Родительская функция:** 3.5 Стиле-специфичные паттерны игры
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/audio/*Instrument.ts`
- **Описание:**
  - Для каждого инструмента реализовать выбор паттерна по `StyleProfile.instrumentDefaults`:
    - Drums: jazz-kit → swing pattern, modern-kit → funk/latin pattern
    - Bass: upright → walking/root-5th/two-feel/montuno; electric → syncopated eighths
    - Piano: профиль компинга по стилю (swing-sparse, offbeat-push, basie-light, beginner-safe)
    - Rhodes: layer mode по стилю (subtle-offbeats, ambient-swells, stab-accents, high-comping, pads)
    - Guitar: nylon → bossa-comping; electric → funk-chops; steel → freddie-green
    - Trumpet: muted → swing; open → funk/latin
    - Flute: airy → bossa/ballad; latin → latin
    - Vibraphone: pads → swing/ballad; inserts → latin
    - Organ: pads + stabs → funk
  - Все инструменты получают паттерн через `setStyleProfile()`, а не через отдельные методы
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Интеграционный тест: смена стиля Swing → Funk меняет поведение Drums, Bass, Piano, Rhodes, Guitar одновременно
  - Все существующие тесты проходят
- **Зависит от задач:** T-003, T-005, T-006, T-007, T-008, T-009, T-010, T-011, T-012, T-013, T-014, T-015
- **Статус:** ✅ Готово

---

### T-017. Piano: montuno-паттерн для Latin

- **Родительская функция:** 4.4 Piano montuno-паттерны
- **Приоритет:** P2
- **Сложность:** M (3–5d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/audio/pianoComping.ts`
- **Описание:**
  - Добавить «кирпичик» `montuno` в `pianoComping.ts` — характерный латиноамериканский ритмический рисунок (синкопированный, акцент на offbeat)
  - Создать новый 4-тактовый профиль `latin-montuno`:
    - Такт 1: montuno
    - Такт 2: montuno (вариация)
    - Такт 3: basie-2-4
    - Такт 4: montuno
  - Прописать в `StyleProfile.instrumentDefaults` для Latin: `pattern: 'latin-montuno'`
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Тест: профиль `latin-montuno` генерирует 4 такта с montuno-ритмом
  - Тест: выбор стиля Latin → piano использует `latin-montuno` профиль
- **Зависит от задач:** T-001, T-003
- **Статус:** ✅ Готово

---

### T-018. Rhodes: высокий регистр для Latin

- **Родительская функция:** 4.5 Rhodes высокий регистр для Latin
- **Приоритет:** P2
- **Сложность:** S (1–2d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/audio/rhodesInstrument.ts`
- **Описание:**
  - В `StyleProfile.instrumentDefaults` для Latin: `rhodes.mode: 'high-comping'`
  - Убедиться, что `high-comping` режим работает (+12 полутонов, C5–C7)
  - Проверить взаимодействие с Piano montuno в среднем регистре
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Тест: выбор стиля Latin → Rhodes в режиме high-comping, ноты в C5–C7
  - Тест: Rhodes не конфликтует с Piano montuno (не пересекаются по регистру)
- **Зависит от задач:** T-003
- **Статус:** ✅ Готово

---

### T-019. Guitar: полный набор стиле-специфичных паттернов

- **Родительская функция:** 4.6 Guitar стиле-специфичные паттерны
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/audio/guitarInstrument.ts`
- **Описание:**
  - Реализовать и протестировать все 3 паттерна:
    - `bossa-comping` — nylon, бас + аккорд (из T-007)
    - `funk-chops` — electric, offbeat-аккорды (из T-008)
    - `freddie-green` — steel, четверти, нижний регистр C3–C4
  - Выбор паттерна — через `StyleProfile.instrumentDefaults`, а не ручной выбор
  - Автоматическое переключение типа гитары при смене стиля (если доступен соответствующий манифест)
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Тест: стиль Swing → steel guitar, freddie-green паттерн
  - Тест: стиль Bossa → nylon guitar, bossa-comping паттерн
  - Тест: стиль Funk → electric guitar, funk-chops паттерн
- **Зависит от задач:** T-007, T-008
- **Статус:** ✅ Готово

---

### T-020. Полное упразднение drumsPattern

- **Родительская функция:** 4.2 Миграция `drumsPattern` → полное упразднение
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `shared` + `api` + `music-core`
- **Модуль:** `packages/shared/src/dto.ts`, `apps/api/src/db/schema.ts`, `packages/music-core/src/audio/drumInstrument.ts`
- **Описание:**
  - Удалить `drumsPattern` из `UserSettingsDTO` и `DrumInstrumentSettings` (после переходного периода из предыдущего VISION)
  - Удалить маппинг `drumsPattern → style` из settings service
  - Drums читают стиль исключительно из `StyleProfile`, без fallback на отдельное поле
  - Миграция БД: удалить колонку `drums_pattern` из `user_settings` (с предварительным бэкапом данных)
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Все существующие тесты проходят (без `drumsPattern`)
  - Ни одного обращения к `drumsPattern` в кодовой базе
- **Зависит от задач:** T-003, T-004 (per-style overrides заменяют drumsPattern)
- **Статус:** ✅ Готово

---

### T-021. Логика ростеров в StyleRegistry

- **Родительская функция:** 3.2 Стиле-специфичные ростеры
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/styleProfile.ts`
- **Описание:**
  - Реализовать `InstrumentRoster` с разделением на `required` / `recommended` / `optional` / `hidden`
  - Хелперы:
    - `getRoster(style): InstrumentRoster` — полный ростер стиля
    - `getVisibleInstruments(style, userOverrides): InstrumentId[]` — инструменты, которые показываются в UI
    - `getDefaultEnsemble(style, ensembleType): InstrumentSettings` — настройки для преднастроенного ансамбля (дуэт/трио/квартет/квинтет)
  - Данные ростеров — из таблиц VISION §3.2
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Тест: `getRoster('swing')` возвращает 5 required/recommended инструментов
  - Тест: `getRoster('funk')` возвращает Modern Kit + Electric Bass как required
  - Тест: `getDefaultEnsemble('swing', 'trio')` возвращает Drums+Piano+Bass с корректными громкостями
- **Зависит от задач:** T-001
- **Статус:** ✅ Готово

---

### T-022. Модель данных ансамблей-предсетов

- **Родительская функция:** 3.6 Ансамбли (preset ensembles)
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** `music-core`
- **Модуль:** `packages/music-core/src/styleProfile.ts`
- **Описание:**
  - Определить тип `EnsemblePreset`:
    ```ts
    interface EnsemblePreset {
      id: string;          // 'duo' | 'trio' | 'quartet' | 'quintet' | 'full' | 'reset'
      name: string;        // 'Трио', 'Квартет', ...
      instrumentSettings: Record<InstrumentId, { enabled: boolean; volume?: number; pattern?: string; voicing?: string }>;
    }
    ```
  - Создать 5 ансамблей × 5 стилей = 25 пресетов (по таблице из VISION §3.6)
  - Хелпер `applyEnsemble(style, ensembleId, currentSettings): UserSettings` — возвращает новые настройки
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Тест: `applyEnsemble('swing', 'trio', {})` включает Drums, Piano, Bass и выключает остальные
  - Тест: `applyEnsemble('funk', 'quintet', {})` включает Modern Kit, Electric Bass, Piano, Electric Guitar, Rhodes, Organ
- **Зависит от задач:** T-001, T-021
- **Статус:** ✅ Готово

---

### T-023. Страница настроек: новая архитектура UI

- **Родительская функция:** 3.6 Реорганизация области настроек
- **Приоритет:** P0
- **Сложность:** L (1–2w)
- **Слой:** `plugins` / `web`
- **Модуль:** `packages/plugins/core-settings` или новый плагин `arranger-settings`
- **Описание:**
  - **Зона 1 — Стили:** Ряд кнопок-тогглов `[Swing] [Bossa Nova] [Funk] [Latin] [Ballad]`. Активный стиль подсвечен. При клике — `setStyleProfile()` + обновление UI.
  - **Зона 2 — Плитка стиля:** Темп (input ± кнопки), Свинг (слайдер 0–0.85 с пресетами), кнопки ансамблей `[Трио] [Квартет] [Квинтет] [Сбросить]`.
  - **Зона 3 — Плитки инструментов:** Grid 2–3 в ряд. Каждая плитка — отдельный React-компонент `InstrumentTile`.
  - Использовать `useSettings()` / `useUpdateSettings()` из `@jazz/plugin-sdk`
  - Интеграция с T-004 (per-style overrides) и T-021 (roster)
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Визуальный тест: страница `/settings` отображает 3 зоны, стили переключаются тогглами
  - Функциональный тест: смена стиля меняет набор видимых плиток инструментов
  - Функциональный тест: изменение темпа/свинга применяется к TransportEngine
- **Зависит от задач:** T-001, T-003, T-004, T-021, T-024
- **Статус:** 🔴 Запланировано

---

### T-024. Компонент InstrumentTile (плитка инструмента)

- **Родительская функция:** 3.6 Плитки инструментов
- **Приоритет:** P0
- **Сложность:** L (1–2w)
- **Слой:** `ui` / `plugins`
- **Модуль:** `packages/ui/src/InstrumentTile.tsx` (новый) или внутри плагина настроек
- **Описание:**
  - React-компонент `InstrumentTile` — принимает `instrumentId`, текущие настройки, `onChange`
  - **Верхняя строка:** иконка + название + бейдж (required/recommended/optional) + тоггл Вкл/Выкл + слайдер громкости
  - **Тело плитки** — все настройки инструмента:
    - _Drums:_ выбор кита (Jazz/Modern), паттерн, звуки (bassDrum/snare/hihat/ride/crash/rim — enable + volume), humanization, randomization, fill частота
    - _Bass:_ тип баса (Upright/Electric), сложность (1–7), октава (-1/0/+1), randomization
    - _Piano:_ профиль компинга, voicing, randomization
    - _Rhodes:_ layer mode, voicing
    - _Guitar:_ тип гитары (nylon/steel/electric), паттерн
    - _Trumpet/Flute/Clarinet:_ тембр (muted/open), randomization
    - _Vibraphone:_ вибрато (интенсивность), randomization
    - _Organ:_ randomization
    - _Percussion Kit:_ звуки (congas/timbales/cowbell/clave/shaker — enable + volume)
  - Плитка выключенного инструмента — серая (opacity 0.5), но все настройки доступны
  - Grid-раскладка: CSS Grid, 2–3 колонки на десктопе, 1 на мобильном
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Сторибук / визуальный тест: плитка Drums отображает все настройки
  - Unit-тест: изменение громкости в плитке вызывает `onChange` с новым значением
  - Unit-тест: выключение инструмента делает плитку серой, но громкость остаётся прежней
- **Зависит от задач:** T-021
- **Статус:** 🔴 Запланировано

---

### T-025. UI ансамблей-предсетов

- **Родительская функция:** 3.6 Ансамбли (preset ensembles)
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** `plugins` / `web`
- **Модуль:** Там же, где T-023
- **Описание:**
  - Кнопки `[Дуэт] [Трио] [Квартет] [Квинтет] [Полный] [Сбросить]` в плитке стиля
  - При клике — вызов `applyEnsemble(style, ensembleId, currentSettings)` (T-022)
  - Обновление всех плиток инструментов (T-024) новыми настройками
  - Визуальная обратная связь: активный ансамбль подсвечен
  - «Сбросить» — возврат к стилевым дефолтам (очистка per-style overrides для этого стиля)
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Функциональный тест: клик «Трио» в Swing → включены Drums, Piano, Bass; Rhodes и Trumpet выключены
  - Функциональный тест: клик «Полный ансамбль» → все инструменты стиля включены
  - Функциональный тест: «Сбросить» → все настройки возвращаются к стилевым дефолтам
- **Зависит от задач:** T-022, T-023
- **Статус:** 🔴 Запланировано

---

### T-026. Панель плеера: компактные контролы

- **Родительская функция:** 3.6 Компактный вид на панели плеера
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** `plugins`
- **Модуль:** `packages/plugins/core-player`
- **Описание:**
  - Кнопка `[⚙️ Инструменты]` — открывает модальное окно (T-027)
  - Все изменения на панели мгновенно применяются к TransportEngine
  - Размещение: слева от (play/pause/stop) и справа от выбора повтора
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Функциональный тест: смена стиля на панели плеера меняет стиль в TransportEngine
  - Функциональный тест: изменение BPM на панели меняет темп воспроизведения
  - Визуальный тест: панель не разъезжается на мобильном (адаптивная вёрстка)
- **Зависит от задач:** T-003, T-027
- **Статус:** 🔴 Запланировано

---

### T-027. Модальное окно инструментов на панели плеера

- **Родительская функция:** 3.6 Модальное окно
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** `plugins`
- **Модуль:** `packages/plugins/core-player`
- **Описание:**
  - Модальное окно, открывающееся по кнопке `⚙️ Инструменты` на панели плеера
  - Содержит те же `InstrumentTile` (T-024), что и страница настроек, но:
    - Одна колонка (компактный вид)
    - Только инструменты текущего стиля (из ростера)
    - Без стилей и ансамблей (стиль уже выбран на панели)
  - Изменения в модальном окне синхронизируются со страницей настроек (общий стейт)
  - Закрытие по клику вне окна / Escape
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Функциональный тест: открыть модальное окно → изменить громкость Drums → закрыть → открыть страницу настроек → громкость сохранилась
  - Функциональный тест: переключить стиль на панели → открыть модальное окно → видны инструменты нового стиля
- **Зависит от задач:** T-024, T-026
- **Статус:** 🔴 Запланировано

---

### T-028. Логика сохранения per-style пользовательских правок (фронтенд)

- **Родительская функция:** 3.7 Интеллектуальная смена стиля
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** `plugin-sdk` + `plugins`
- **Модуль:** `packages/plugin-sdk/src/hooks/useStyleSettings.ts` (новый)
- **Описание:**
  - Хук `useStyleSettings()` — оборачивает `useSettings()` + `useUpdateSettings()`
  - При изменении любой настройки инструмента — сохраняет её в `perStyleOverrides[style]`
  - При смене стиля — загружает `perStyleOverrides[newStyle]` и мёрджит с дефолтами стиля
  - Кнопка «Сбросить на стиль» — удаляет `perStyleOverrides[style]` через API
  - Оптимистичные обновления (instant UI, фоновая синхронизация с API)
- **Критерий готовности (DoD):**
  - `typecheck` + `lint` зелёные
  - Интеграционный тест: изменить громкость Drums в Swing → переключить на Bossa → изменить громкость Bass → вернуться на Swing → громкость Drums сохранена, Bass — дефолт Swing
  - Интеграционный тест: «Сбросить на стиль» → все настройки возвращаются к дефолтам стиля
- **Зависит от задач:** T-004
- **Статус:** 🔴 Запланировано

---

### T-029. Обновление документации

- **Родительская функция:** 4.7 Обновление документации
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** `docs`
- **Модуль:** `docs/*.md`
- **Описание:**
  - Обновить существующие документы:
    - `docs/FUNCTIONS.md` — добавить новые инструменты и стиле-специфичные возможности
    - `docs/BASS.md` — добавить секцию про Electric Bass
    - `docs/DRUMS.md` — добавить секцию про Modern Kit
    - `docs/PIANO.md` — добавить секцию про montuno-паттерн и стиле-специфичные voicing'и
    - `docs/RHODES.md` — обновить стиле-специфичные режимы
    - `docs/ARCHITECTURE_BASE.md` — обновить секцию про инструменты (с 6 до 15+), добавить StyleProfile
  - Создать новые документы:
    - `docs/TRUMPET.md`, `docs/VIBRAPHONE.md`, `docs/FLUTE.md`, `docs/ORGAN.md`, `docs/GUITAR.md`, `docs/PERCUSSION.md`, `docs/CLARINET.md`
  - Обновить `CLAUDE.md` — карта «Где что лежит» и перечень инструментов
- **Критерий готовности (DoD):**
  - Все документы в `docs/` актуальны и не содержат устаревшей информации
  - `CLAUDE.md` указывает правильные пути к новым модулям
- **Зависит от задач:** Все задачи должны быть завершены (документируется финальное состояние)
- **Статус:** 🔴 Запланировано

---

## 2. Последовательность (Ordering)

```
Этап 1: Фундамент (недели 1–2)
────────────────────────────────────────────────────────
T-001 (StyleProfile) ───────────────────────────────────┐
T-002 (InstrumentManifest) ── зависит от T-001          │
T-003 (Style refactor) ────── зависит от T-001, T-002   │
T-004 (per-style overrides) ─ зависит от T-001          │
T-021 (Roster logic) ──────── зависит от T-001          │
                                                        │ Параллельно
Этап 2: Новые инструменты (недели 2–4)                  │
────────────────────────────────────────────────────────  │
T-005 (Modern Kit) ────────── зависит от T-003          │
T-006 (Electric Bass) ─────── зависит от T-003          │
T-013 (Percussion Kit) ────── зависит от T-001, T-003   │
T-007 (Nylon Guitar) ──────── зависит от T-003          │
T-008 (Electric Guitar) ───── зависит от T-003, T-007   │
                                                        │
T-009 (Trumpet) ───────────── зависит от T-001, T-003   │ Можно
T-010 (Vibraphone) ────────── зависит от T-001, T-003   │ параллельно
T-011 (Flute) ─────────────── зависит от T-001, T-003   │ друг другу
T-012 (Organ) ─────────────── зависит от T-001, T-003   │
T-014 (Clarinet) ──────────── зависит от T-001, T-003   │
                                                        │
Этап 3: Стиле-специфичные поведения (недели 3–4)        │
────────────────────────────────────────────────────────  │
T-015 (Voicing defaults) ──── зависит от T-001, T-003   │
T-017 (Piano montuno) ─────── зависит от T-001, T-003   │
T-018 (Rhodes high register) ─ зависит от T-003         │
T-019 (Guitar patterns) ───── зависит от T-007, T-008   │
T-016 (Wire all patterns) ─── зависит от всех этапов 2+3│
                                                        │
Этап 4: Миграция и данные (неделя 4)                    │
────────────────────────────────────────────────────────  │
T-020 (Remove drumsPattern) ── зависит от T-003, T-004  │
T-022 (Ensemble presets) ───── зависит от T-001, T-021  │
                                                        │
Этап 5: UX / Фронтенд (недели 3–5)                      │
────────────────────────────────────────────────────────  │
T-024 (InstrumentTile) ─────── зависит от T-021         │
T-023 (Settings page) ──────── зависит от T-001, T-003, │
                                T-004, T-021, T-024      │
T-025 (Ensemble UI) ────────── зависит от T-022, T-023  │
T-027 (Modal window) ───────── зависит от T-024, T-026  │
T-026 (Player panel) ───────── зависит от T-003, T-027  │
T-028 (Per-style overrides FE)─ зависит от T-004        │
                                                        │
Этап 6: Документация (неделя 5–6)                       │
────────────────────────────────────────────────────────  │
T-029 (Docs) ───────────────── зависит от всех задач     │
```

## 3. Статус выполнения

| Статус | Количество | Задачи |
|---|---|---|
| ✅ Готово | 18 | T-001, T-002, T-003, T-005, T-007, T-008, T-010, T-012, T-013, T-014, T-015, T-016, T-017, T-018, T-019, T-020, T-021, T-022 |
| 🟡 Частично | 2 | T-009 (Труба — только solo-манифест), T-011 (Флейта — только solo-манифест) |
| 🔴 Запланировано | 9 | T-004 (бэкенд per-style), T-006 (Electric Bass), T-023–T-028 (UI), T-029 (документация) |

### Оценка оставшейся трудоёмкости

| Сложность | Количество | Задачи |
|---|---|---|
| **S** (1–2d) | 0 | — |
| **M** (3–5d) | 7 | T-004, T-006, T-023*, T-025, T-026, T-027, T-028 |
| **L** (1–2w) | 4 | T-009*, T-011*, T-024, T-029 |

> \* Скорректировано: T-023 (страница настроек) понижен до M т.к. фундамент готов; T-009/T-011 имеют только solo-манифесты — нужна реализация arrangement-инструментов.

**Оставшаяся трудоёмкость:** ~35–50 рабочих дней (7–10 недель одним разработчиком, 4–5 недель двумя).

> _Оценка не учитывает время на поиск/подготовку сэмплов для Electric Bass и arrangement-Trumpet/Flute. При отсутствии готовых свободных сэмплов сроки могут увеличиться._

## 4. Критические пути

1. **T-001 → T-003 → T-016** — фундаментальная цепочка: StyleProfile → рефакторинг всех инструментов → подключение всех паттернов. Без неё невозможна никакая стиле-специфичная логика. **Критический путь #1.**

2. **T-001 → T-021 → T-024 → T-023** — цепочка UX: ростеры → плитки инструментов → страница настроек. Без неё пользователь не увидит новую организацию. **Критический путь #2.**

3. **T-005 + T-006 + T-013** — три инструмента P0/P1, которые определяют звучание funk и latin. Должны быть готовы к Этапу 3 (wire all patterns). **Потенциальный бутылочный горлышек** — поиск сэмплов.

4. **T-004 → T-028** — per-style overrides (бэк + фронт). Без этой цепочки пользователь теряет настройки при переключении стилей. **Важно для UX, но не блокирует базовую функциональность.**

---

_План создан на основе `docs/ARANGEMENT_VISION.md`. Статус обновлён 2026-07-01: фундамент и все инструменты готовы (18 из 29 задач ✅), UI и документация запланированы._
