# План работ — Рефакторинг гармонии: Piano, Rhodes и глобальные стили

**На основе:** VISION-2026-06-13 (docs/VISION.md)
**Дата:** 2026-06-13
**Статус:** 🟢 Завершено (33/33 задач)

## 1. Задачи (Tasks)

### Этап 1: Глобальный стиль + контракты (MVP, P0)

#### T-001. Определить тип `Style` и обновить `shared/dto.ts`

- **Родительская функция:** 3.1 (Глобальный стиль)
- **Приоритет:** P0
- **Сложность:** XS
- **Слой:** shared
- **Плагин / Модуль:** `packages/shared/src/dto.ts`
- **Описание:**
  - Добавить `Style` тип: `'swing' | 'bossa' | 'funk' | 'latin' | 'ballad'`
  - Добавить `style` поле в `UserSettingsDTOSchema` (опциональное)
  - Пометить `drumsPattern` как `@deprecated`
  - Экспортировать `Style` тип
- **Критерий готовности (DoD):** typecheck + lint
- **Зависит от задач:** —
- **Статус:** 🟢 Готово

#### T-002. Обновить DB schema — колонка `style`

- **Родительская функция:** 3.1 (Глобальный стиль)
- **Приоритет:** P0
- **Сложность:** XS
- **Слой:** api
- **Плагин / Модуль:** `apps/api/src/db/schema.ts`
- **Описание:**
  - Добавить `style: text('style').notNull().default('swing')` в `userSettings`
  - Создать drizzle-миграцию
- **Критерий готовности (DoD):** typecheck + миграция применяется без ошибок
- **Зависит от задач:** T-001
- **Статус:** 🟢 Готово

#### T-003. Обновить API — PATCH `/api/settings` и `auth.service`

- **Родительская функция:** 3.1 (Глобальный стиль)
- **Приоритет:** P0
- **Сложность:** XS
- **Слой:** api
- **Плагин / Модуль:** `apps/api/src/routes/settings.routes.ts`, `apps/api/src/services/auth.service.ts`
- **Описание:**
  - В `settings.routes.ts`: поддержка `style` в PATCH
  - В `auth.service.ts` (`toSettingsDTO`): маппинг `s.style` → DTO, fallback с `s.drumsPattern` при миграции
- **Критерий готовности (DoD):** typecheck + lint
- **Зависит от задач:** T-001, T-002
- **Статус:** 🟢 Готово

#### T-004. Переподключить `DrumInstrument` на глобальный стиль

- **Родительская функция:** 3.1 (Глобальный стиль), 4.1 (Миграция `drumsPattern` → `style`)
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** music-core, web
- **Плагин / Модуль:** `packages/music-core/src/audio/drumInstrument.ts`, `apps/web/src/engine/useTransport.ts`
- **Описание:**
  - `DrumInstrument`: добавить метод `setStyle(style: Style)` — маппинг `Style` → `DrumsPattern`
  - Убрать чтение `settings.pattern` из `schedule()`; заменить на `this.currentStyle`
  - `useTransport.ts`: читать `style` из `settings` (вместо `settings.drumsPattern`), пробрасывать в `drumInstrument.setStyle()`
  - Сохранить `setPattern()` как deprecated (прокси на `setStyle`)
- **Критерий готовности (DoD):** typecheck + lint + test (существующие тесты DrumInstrument проходят)
- **Зависит от задач:** T-001
- **Статус:** 🟢 Готово

---

### Этап 2: Piano Instrument (MVP, P0)

#### T-005. Отобрать и сконвертировать сэмплы Salamander Grand Piano

- **Родительская функция:** 3.2 (Piano Instrument)
- **Приоритет:** P0
- **Сложность:** M
- **Слой:** web (public assets)
- **Плагин / Модуль:** `apps/web/public/samples/piano/salamander/`
- **Описание:**
  - Скачать Salamander Grand Piano 44.1kHz 16bit из freepats.zenvoid.org
  - Выбрать ноты: C3–C6 (37 нот)
  - Выбрать 2–4 velocity layers (soft: ~pp–mp, medium: ~mf–f, hard: ~ff, [bark: ~fff])
  - Конвертировать в OGG (libopus 128kbps) через ffmpeg
  - Именование: `{note}_{layer}.ogg` (например, `C4_soft.ogg`, `C4_medium.ogg`)
  - Целевой размер: ~15–25 MB
- **Критерий готовности (DoD):** Все файлы на месте, проигрываются через Tone.js `Sampler`
- **Зависит от задач:** —
- **Статус:** 🟢 Готово

#### T-006. Отобрать и сконвертировать сэмплы Upright KW

- **Родительская функция:** 3.2 (Piano Instrument)
- **Приоритет:** P0
- **Сложность:** M
- **Слой:** web (public assets)
- **Плагин / Модуль:** `apps/web/public/samples/piano/upright-kw/`
- **Описание:**
  - Аналогично T-005, но для Upright KW (Best quality) из freepats.zenvoid.org
  - Тот же диапазон (C3–C6), 2–4 velocity layers
  - OGG 128kbps
- **Критерий готовности (DoD):** Все файлы на месте, проигрываются
- **Зависит от задач:** —
- **Статус:** 🟢 Готово

#### T-007. Создать `pianoSampleRegistry.ts`

- **Родительская функция:** 3.2 (Piano Instrument)
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** music-core
- **Плагин / Модуль:** `packages/music-core/src/audio/pianoSampleRegistry.ts`
- **Описание:**
  - `PianoVelocityLayer = 'soft' | 'medium' | 'hard' | 'bark'`
  - `PIANO_VELOCITY_THRESHOLDS` (пороги как в Rhodes: 0.35 / 0.65 / 0.88)
  - `pickPianoLayer(velocity)` — выбор слоя по velocity
  - `PIANO_SALAMANDER_LAYERS: Record<PianoVelocityLayer, NoteMap>` (C3–C6)
  - `PIANO_UPRIGHT_KW_LAYERS: Record<PianoVelocityLayer, NoteMap>`
  - `PIANO_SALAMANDER_BASE_URL = '/samples/piano/salamander/'`
  - `PIANO_UPRIGHT_KW_BASE_URL = '/samples/piano/upright-kw/'`
- **Критерий готовности (DoD):** typecheck
- **Зависит от задач:** T-005, T-006
- **Статус:** 🟢 Готово

#### T-008. Определить простые компинг-паттерны («кирпичики»)

- **Родительская функция:** 3.2 (Piano Instrument)
- **Приоритет:** P0
- **Сложность:** M
- **Слой:** music-core
- **Плагин / Модуль:** `packages/music-core/src/audio/pianoComping.ts` (новый)
- **Описание:**
  - Вынести простые паттерны из `rhodesVoicing.ts` в `pianoComping.ts` (без удаления из Rhodes)
  - Тип `CompPatternId` — идентификатор простого паттерна:
    `'charleston' | 'reverse-charleston' | 'basie-2-4' | 'offbeat-2-4' | 'anticipation-4and' | 'one-twoand-four' | 'oneand-three' | 'twoand-only' | 'four-and-sparse' | 'two-threeand' | 'halfNotes' | 'quarterNotes' | 'wholeNotes' | 'rest'`
  - `COMP_PATTERNS: Record<CompPatternId, CompEvent[]>` — словарь паттернов
  - `getCompPattern(id: CompPatternId): CompEvent[]`
  - Реэкспортировать из `rhodesVoicing.ts` (пока не удаляем — нужно для обратной совместимости Rhodes)
- **Критерий готовности (DoD):** typecheck + lint + test (покрыть все 14 паттернов)
- **Зависит от задач:** —
- **Статус:** 🟢 Готово

#### T-009. Определить 5 составных профилей компинга

- **Родительская функция:** 3.2 (Piano Instrument)
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** music-core
- **Плагин / Модуль:** `packages/music-core/src/audio/pianoComping.ts`
- **Описание:**
  - Тип `CompingProfile` (см. VISION §3.2): `id`, `name`, `complexity`, `bars: [CompPatternId × 4]`
  - 5 профилей: `swing-sparse`, `swing-medium`, `basie-light`, `offbeat-push`, `beginner-safe`
  - `COMPING_PROFILES: Record<string, CompingProfile>`
  - `getCompingProfile(id: string): CompingProfile`
- **Критерий готовности (DoD):** typecheck + test (каждый профиль содержит валидные `CompPatternId`)
- **Зависит от задач:** T-008
- **Статус:** 🟢 Готово

#### T-010. Создать `pianoVoicing.ts` (voicing-логика для фортепиано)

- **Родительская функция:** 3.2 (Piano Instrument)
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** music-core
- **Плагин / Модуль:** `packages/music-core/src/audio/pianoVoicing.ts` (новый)
- **Описание:**
  - Адаптировать `rhodesVoicing.ts` для фортепиано — другой регистр (C3–C6 вместо C3–C6 — совпадает), quaral voicings
  - `PianoVoicingDensity = 'shell2' | 'rootless3' | 'rootless4' | 'quartal'`
  - `buildPianoVoicing(chord, density, prevVoicing)` — с поддержкой quartal
  - Quartal: стеки из чистых кварт (5 semitones) от корня или терции
- **Критерий готовности (DoD):** typecheck + test (каждый voicing density для maj7, m7, 7, m7b5, dim7)
- **Зависит от задач:** T-008
- **Статус:** 🟢 Готово

#### T-011. Создать `PianoInstrument` класс

- **Родительская функция:** 3.2 (Piano Instrument)
- **Приоритет:** P0
- **Сложность:** M
- **Слой:** music-core
- **Плагин / Модуль:** `packages/music-core/src/audio/pianoInstrument.ts` (новый)
- **Описание:**
  - Реализует интерфейс `Instrument`
  - Конструктор: принимает `ChordTimeline`
  - `setProfile(profileId)` — выбор профиля компинга
  - `setVoicingDensity(density)` — выбор voicing density
  - `setStyle(style: Style)` — адаптация к стилю (влияет на выбор default-профиля)
  - `schedule(window, ctx)` — основной цикл:
    1. Для каждого такта: определить `CompPatternId` из профиля (`barIndex % 4`)
    2. Получить `CompEvent[]` для этого паттерна
    3. Для каждого события: построить voicing через `buildPianoVoicing`
    4. Запланировать событие через `ctx.scheduleEvent('piano', ...)`
  - Humanization: timing jitter ±6ms + velocity variation ±5%
- **Критерий готовности (DoD):** typecheck + lint + test (unit-тесты schedule с mock-окном)
- **Зависит от задач:** T-008, T-009, T-010
- **Статус:** 🟢 Готово

#### T-012. Создать `pianoManifest.ts`

- **Родительская функция:** 3.2 (Piano Instrument)
- **Приоритет:** P0
- **Сложность:** XS
- **Слой:** music-core
- **Плагин / Модуль:** `packages/music-core/src/audio/pianoManifest.ts` (новый)
- **Описание:**
  - `pianoManifest: InstrumentManifest` — аналогично `rhodesManifest`
  - `sampleManifest` ссылается на Salamander (default) или Upright KW (через параметр)
  - `createInstrument: () => new PianoInstrument(new ChordTimeline())`
  - `defaultSettings: { enabled: false, volume: 0.7, profile: 'swing-sparse', voicingDensity: 'rootless3', sampleLibrary: 'salamander' }`
- **Критерий готовности (DoD):** typecheck
- **Зависит от задач:** T-007, T-011
- **Статус:** 🟢 Готово

#### T-013. Экспортировать piano-модули из `music-core/audio/index.ts`

- **Родительская функция:** 3.2 (Piano Instrument)
- **Приоритет:** P0
- **Сложность:** XS
- **Слой:** music-core
- **Плагин / Модуль:** `packages/music-core/src/audio/index.ts`
- **Описание:**
  - Экспортировать `PianoInstrument`, `pianoManifest`, `pickPianoLayer`, типы voicing и профилей
- **Критерий готовности (DoD):** typecheck
- **Зависит от задач:** T-011, T-012
- **Статус:** 🟢 Готово

#### T-014. Подключить Piano в `useTransport.ts`

- **Родительская функция:** 3.2 (Piano Instrument)
- **Приоритет:** P0
- **Сложность:** M
- **Слой:** web
- **Плагин / Модуль:** `apps/web/src/engine/useTransport.ts`
- **Описание:**
  - Импортировать `PianoInstrument`, `pianoManifest`, `pickPianoLayer`
  - Создать FX-цепь для piano: ConvolutionReverb (загрузить IR зала) + EQ3 (subtle)
  - Создать `PitchedInstrumentResources` для piano сэмплов (через `createPitchedResources`)
  - Создать `PianoInstrument` и зарегистрировать через `engine.addInstrument()`
  - Создать `pianoEventSink`: `scheduleEvent('piano', ...)` → играет на Tone.Sampler
  - Зарегистрировать sink через `engine.registerSink('piano', ...)`
  - `useEffect`-ы для: `pianoVolume`, `pianoProfile`, `pianoVoicingDensity`, `pianoSampleLibrary`
  - При смене библиотеки: dispose старых сэмплов, создать новые
  - Синхронизация ChordTimeline с bass и piano (как сейчас для rhodes)
- **Критерий готовности (DoD):** typecheck + lint. Piano слышен при воспроизведении.
- **Зависит от задач:** T-004, T-013
- **Статус:** 🟢 Готово

---

### Этап 3: Rhodes как комплементарный слой (MVP, P0)

#### T-015. Рефакторинг `RhodesInstrument` — добавить комплементарные режимы

- **Родительская функция:** 3.3 (Rhodes как комплементарный слой)
- **Приоритет:** P0
- **Сложность:** M
- **Слой:** music-core
- **Плагин / Модуль:** `packages/music-core/src/audio/rhodesVoicing.ts`, `packages/music-core/src/audio/rhodesInstrument.ts`
- **Описание:**
  - В `rhodesVoicing.ts`: добавить тип `RhodesLayerMode = 'pads' | 'subtle-offbeats' | 'high-comping' | 'ambient-swells' | 'stab-accents' | 'none'`
  - Определить 6 комплементарных паттернов (каждый — `CompEvent[]`):
    - `pads`: целые ноты, velocity 0.3–0.4
    - `subtle-offbeats`: только 2& и 4&, velocity 0.3–0.4
    - `high-comping`: как halfNotes но +12 semitones (верхний регистр)
    - `ambient-swells`: один аккорд на 2 такта, velocity 0.25–0.35
    - `stab-accents`: beat 2 и 4, velocity 0.6–0.7, короткая длительность
    - `none`: пустой массив
  - В `RhodesInstrument`: добавить `setLayerMode(mode)`, `schedule()` использует `layerMode` вместо `mode`
  - Сохранить `setMode()` как deprecated (прокси на старые режимы, если они ещё нужны)
- **Критерий готовности (DoD):** typecheck + test (6 режимов × несколько аккордов)
- **Зависит от задач:** T-008 (использует CompEvent)
- **Статус:** 🟢 Готово

#### T-016. Правила взаимодействия Piano ↔ Rhodes

- **Родительская функция:** 3.3 (Rhodes как комплементарный слой)
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** music-core
- **Плагин / Модуль:** `packages/music-core/src/audio/pianoRhodesInteraction.ts` (новый)
- **Описание:**
  - Функция `avoidConflicts(rhodesEvents, pianoEvents, barStartTick, tpBeat): CompEvent[]`
  - Правила:
    1. Если Rhodes-событие попадает в ту же долю (±1/16), что и piano — сместить на 1/16 позже или тише
    2. Если Rhodes в режиме `high-comping` — транспонировать ноты на октаву вверх
    3. Если Rhodes `subtle-offbeats` — только если piano не играет на этой доле
  - Тесты: 3 сценария (Rhodes накладывается / не накладывается / high-comping)
- **Критерий готовности (DoD):** typecheck + test
- **Зависит от задач:** T-011 (PianoInstrument API), T-015
- **Статус:** 🟢 Готово

#### T-017. Подключить комплементарный Rhodes в `useTransport.ts`

- **Родительская функция:** 3.3 (Rhodes как комплементарный слой)
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** web
- **Плагин / Модуль:** `apps/web/src/engine/useTransport.ts`
- **Описание:**
  - Добавить `rhodesLayerMode` и `rhodesLayerVolume` в настройки
  - Передать `setLayerMode` и громкость в `RhodesInstrument`
  - Убедиться, что Rhodes FX-цепь не конфликтует с Piano (разные Channel)
  - Rhodes подключается к тому же ChordTimeline что и Piano
- **Критерий готовности (DoD):** typecheck + lint. Rhodes работает как слой поверх Piano.
- **Зависит от задач:** T-014, T-015
- **Статус:** 🟢 Готово

---

### Этап 4: API, настройки и форма (P0)

#### T-018. Расширить `UserSettingsDTO` — piano и rhodes поля

- **Родительская функция:** 4.3 (Новые Piano-настройки), 4.2 (Миграция Rhodes)
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** shared
- **Плагин / Модуль:** `packages/shared/src/dto.ts`
- **Описание:**
  - Добавить поля:
    ```ts
    pianoEnabled: z.boolean().optional(),
    pianoVolume: z.number().min(0).max(1).optional(),
    pianoProfile: z.enum(['swing-sparse','swing-medium','basie-light','offbeat-push','beginner-safe']).optional(),
    pianoVoicingDensity: z.enum(['shell2','rootless3','rootless4','quartal']).optional(),
    pianoSampleLibrary: z.enum(['salamander','upright-kw']).optional(),
    pianoRandomizationLevel: z.enum(['off','subtle','moderate','high']).optional(),
    rhodesLayerMode: z.enum(['pads','subtle-offbeats','high-comping','ambient-swells','stab-accents','none']).optional(),
    rhodesLayerVolume: z.number().min(0).max(1).optional(),
    ```
  - Пометить `rhodesMode` как `@deprecated` (заменён на `rhodesLayerMode`)
- **Критерий готовности (DoD):** typecheck (Zod-схема валидна)
- **Зависит от задач:** T-001, T-009, T-015
- **Статус:** 🟢 Готово

#### T-019. Расширить DB schema — piano + rhodes колонки

- **Родительская функция:** 4.3 (Новые Piano-настройки)
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** api
- **Плагин / Модуль:** `apps/api/src/db/schema.ts`
- **Описание:**
  - Добавить в `userSettings`:
    - `pianoEnabled: integer('piano_enabled', { mode: 'boolean' }).notNull().default(false)`
    - `pianoVolume: real('piano_volume').notNull().default(0.7)`
    - `pianoProfile: text('piano_profile').notNull().default('swing-sparse')`
    - `pianoVoicingDensity: text('piano_voicing_density').notNull().default('rootless3')`
    - `pianoSampleLibrary: text('piano_sample_library').notNull().default('salamander')`
    - `pianoRandomizationLevel: text('piano_randomization_level').notNull().default('off')`
    - `rhodesLayerMode: text('rhodes_layer_mode').notNull().default('none')`
    - `rhodesLayerVolume: real('rhodes_layer_volume').notNull().default(0.5)`
  - Создать drizzle-миграцию
- **Критерий готовности (DoD):** typecheck + миграция применяется
- **Зависит от задач:** T-018
- **Статус:** 🟢 Готово

#### T-020. Обновить API и `auth.service` для новых полей

- **Родительская функция:** 4.2, 4.3
- **Приоритет:** P0
- **Сложность:** XS
- **Слой:** api
- **Плагин / Модуль:** `apps/api/src/routes/settings.routes.ts`, `apps/api/src/services/auth.service.ts`
- **Описание:**
  - PATCH `/api/settings`: поддержка всех новых полей из T-018
  - `toSettingsDTO()`: маппинг всех новых полей
- **Критерий готовности (DoD):** typecheck + lint
- **Зависит от задач:** T-018, T-019
- **Статус:** 🟢 Готово

#### T-021. Обновить `SettingsForm` — секция Piano

- **Родительская функция:** 4.3 (Новые Piano-настройки)
- **Приоритет:** P0
- **Сложность:** M
- **Слой:** web
- **Плагин / Модуль:** `apps/web/src/components/settings/SettingsForm.tsx`
- **Описание:**
  - Новая карточка «Piano» (аналогично текущим «Rhodes», «Drums»):
    - `pianoEnabled` — чекбокс
    - `pianoVolume` — слайдер
    - `pianoProfile` — Select (5 профилей: Swing Sparse, Swing Medium, Basie Light, Offbeat Push, Beginner Safe)
    - `pianoVoicingDensity` — Select (shell2, rootless3, rootless4, quartal)
    - `pianoSampleLibrary` — Select (Salamander Grand, Upright KW)
    - `pianoRandomizationLevel` — Select (off, subtle, moderate, high)
  - Все контролы disabled когда `pianoEnabled = false`
- **Критерий готовности (DoD):** typecheck + lint + визуально форма отображается
- **Зависит от задач:** T-018
- **Статус:** 🟢 Готово

#### T-022. Обновить `SettingsForm` — секция Rhodes (комплементарный слой)

- **Родительская функция:** 4.2 (Миграция Rhodes-настроек)
- **Приоритет:** P0
- **Сложность:** S
- **Слой:** web
- **Плагин / Модуль:** `apps/web/src/components/settings/SettingsForm.tsx`
- **Описание:**
  - В карточке Rhodes:
    - Заменить `rhodesMode` (старые режимы) на `rhodesLayerMode` (6 комплементарных режимов)
    - `rhodesVoicingDensity` — оставить
    - Добавить `rhodesLayerVolume` — слайдер громкости слоя
    - Добавить подсказку: «Rhodes теперь работает как дополнительный слой поверх Piano»
  - Старый `rhodesMode` Select заменить на `rhodesLayerMode`:
    - Pads, Subtle Offbeats, High Comping, Ambient Swells, Stab Accents, None
- **Критерий готовности (DoD):** typecheck + lint + визуально
- **Зависит от задач:** T-018
- **Статус:** 🟢 Готово

---

### Этап 5: Style Selector на панели плеера (P1)

#### T-023. Добавить StyleSelector на панель плеера

- **Родительская функция:** 3.4 (Панель плеера: Style Selector)
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** web
- **Плагин / Модуль:** `apps/web/src/engine/useTransport.ts`, плагин `core-player` (playbar)
- **Описание:**
  - Компонент `StyleSelector` — Select / кнопки: Swing, Bossa Nova, Funk, Latin, Ballad
  - Разместить на панели плеера (рядом с транспортом)
  - При изменении: обновить `style` в настройках через `useUpdateSettings`
  - `useTransport`: слушать `settings.style` → пробрасывать во все инструменты (`drumInstrument.setStyle()`, `pianoInstrument.setStyle()`, `rhodesInstrument.setStyle()`, `bassInstrument.setStyle()`)
  - Мгновенное переключение (следующий такт подхватывает новый стиль)
- **Критерий готовности (DoD):** typecheck + lint + визуально: переключение стиля меняет звучание
- **Зависит от задач:** T-004, T-014, T-017
- **Статус:** 🟢 Готово

---

### Этап 6: Piano Randomizer (P2)

#### T-024. Создать `PianoRandomizer`

- **Родительская функция:** 3.5 (Piano Randomizer)
- **Приоритет:** P2
- **Сложность:** M
- **Слой:** music-core
- **Плагин / Модуль:** `packages/music-core/src/audio/pianoRandomizer.ts` (новый)
- **Описание:**
  - `PianoRandomizer` — чистый класс, без IO, полностью тестируемый
  - `apply(profile, settings, barContext): CompEvent[]` — модифицирует события такта:
    - С вероятностью (level): пропускает долю, добавляет anticipation, смещает на восьмую
    - Варьирует voicing density: `shell2` ↔ `rootless4` (на лету перестраивает voicing)
    - С вероятностью (level): добавляет passing chord между текущим и следующим аккордом
  - Уровни: `off` (no-op), `subtle` (~10% тактов), `moderate` (~25%), `high` (~40%)
  - Использует `pseudoRandom(barIndex * 17 + beat * 31 + 1)` для repeatable randomness
- **Критерий готовности (DoD):** typecheck + test (все 4 уровня, проверка что события изменены)
- **Зависит от задач:** T-011 (PianoInstrument API)
- **Статус:** 🟢 Готово

#### T-025. Интегрировать `PianoRandomizer` в `PianoInstrument`

- **Родительская функция:** 3.5 (Piano Randomizer)
- **Приоритет:** P2
- **Сложность:** S
- **Слой:** music-core
- **Плагин / Модуль:** `packages/music-core/src/audio/pianoInstrument.ts`
- **Описание:**
  - `PianoInstrument` создаёт `PianoRandomizer` в конструкторе
  - `setRandomizationLevel(level)` — пробрасывает в randomizer
  - В `schedule()`: после получения `CompEvent[]` из профиля → `randomizer.apply(events, settings, barContext)`
  - При `level = 'off'` — zero-cost (randomizer возвращает исходный массив)
- **Критерий готовности (DoD):** typecheck + test (интеграционный: randomizer влияет на schedule)
- **Зависит от задач:** T-024
- **Статус:** 🟢 Готово

---

### Этап 7: Стиле-зависимый Bass (P1)

#### T-026. Адаптировать `BassInstrument` к глобальному стилю

- **Родительская функция:** 4.5 (Стиле-зависимый Bass)
- **Приоритет:** P1
- **Сложность:** M
- **Слой:** music-core
- **Плагин / Модуль:** `packages/music-core/src/audio/bassInstrument.ts`
- **Описание:**
  - Добавить `setStyle(style: Style)` в `BassInstrument`
  - 5 режимов басовой линии:
    - `swing` → walking bass (текущее поведение)
    - `bossa` → root-5th паттерн (половинные: 1 5 | 1 5)
    - `funk` → синкопированная линия (восьмые с паузами)
    - `latin` → montuno-style: root на 1, 5th на 2&, octave на 4
    - `ballad` → two-feel (только 1 и 3 доли, длинные ноты)
  - `schedule()`: выбор режима по `this.currentStyle`
- **Критерий готовности (DoD):** typecheck + test (5 стилей × несколько прогрессий)
- **Зависит от задач:** T-004 (глобальный стиль уже передаётся)
- **Статус:** 🟢 Готово

---

### Этап 8: Тесты и документация (P1)

#### T-027. Тесты `PianoInstrument`

- **Родительская функция:** 3.2 (Piano Instrument)
- **Приоритет:** P1
- **Сложность:** M
- **Слой:** music-core
- **Плагин / Модуль:** `packages/music-core/src/audio/pianoInstrument.test.ts` (новый)
- **Описание:**
  - Unit-тесты `schedule()` с mock `ScheduleContext` и `ScheduleWindow`
  - Тесты для каждого из 5 профилей (проверка, что генерируются правильные события)
  - Тесты смены voicing density
  - Тесты humanization (timing jitter, velocity variation в допустимых пределах)
  - Тесты `reset()` и `setTimeline()`
- **Критерий готовности (DoD):** typecheck + test pass (≥20 тестов)
- **Зависит от задач:** T-011
- **Статус:** 🟢 Готово

#### T-028. Тесты `PianoRandomizer`

- **Родительская функция:** 3.5 (Piano Randomizer)
- **Приоритет:** P1
- **Сложность:** M
- **Слой:** music-core
- **Плагин / Модуль:** `packages/music-core/src/audio/pianoRandomizer.test.ts` (новый)
- **Описание:**
  - `off` → массив не изменён
  - `subtle` / `moderate` / `high` → события модифицированы (структурно валидны)
  - Passing chords генерируются корректно
  - Не выходит за границы такта
- **Критерий готовности (DoD):** typecheck + test pass (≥15 тестов)
- **Зависит от задач:** T-024
- **Статус:** 🟢 Готово

#### T-029. Тесты комплементарных Rhodes-режимов

- **Родительская функция:** 3.3 (Rhodes как комплементарный слой)
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** music-core
- **Плагин / Модуль:** `packages/music-core/src/audio/rhodesInstrument.test.ts` (обновить)
- **Описание:**
  - Тесты для каждого из 6 `layerMode`
  - `none` → 0 событий
  - `pads` → целые ноты
  - `subtle-offbeats` → только 2& и 4&
  - `high-comping` → ноты в верхнем регистре
  - `ambient-swells` → 1 событие на 2 такта
  - `stab-accents` → короткие акценты на 2 и 4
- **Критерий готовности (DoD):** typecheck + test pass
- **Зависит от задач:** T-015
- **Статус:** 🟢 Готово

#### T-030. Тесты `BassInstrument` — стилевые режимы

- **Родительская функция:** 4.5 (Стиле-зависимый Bass)
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** music-core
- **Плагин / Модуль:** `packages/music-core/src/audio/bassInstrument.test.ts` (обновить)
- **Описание:**
  - Тесты для 5 стилей: swing (walking), bossa (root-5th), funk (syncopated), latin (montuno), ballad (two-feel)
- **Критерий готовности (DoD):** typecheck + test pass
- **Зависит от задач:** T-026
- **Статус:** 🟢 Готово

#### T-031. Создать `docs/PIANO.md`

- **Родительская функция:** 4.4 (Документация)
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** docs
- **Плагин / Модуль:** `docs/PIANO.md` (новый)
- **Описание:**
  - Роль Piano в аранжировке
  - Сэмплы: Salamander Grand Piano, Upright KW (источник, характеристики, оптимизация)
  - Профили компинга: 5 составных профилей с описанием
  - Voicings: shell2, rootless3, rootless4, quartal
  - FX-цепь
  - Взаимодействие с Rhodes (правила избегания конфликтов)
- **Критерий готовности (DoD):** Документ готов, отражает актуальное состояние
- **Зависит от задач:** T-011, T-015, T-016
- **Статус:** 🟢 Готово

#### T-032. Обновить `docs/RHODES.md`

- **Родительская функция:** 4.4 (Документация)
- **Приоритет:** P1
- **Сложность:** S
- **Слой:** docs
- **Плагин / Модуль:** `docs/RHODES.md`
- **Описание:**
  - Обновить §1: Rhodes теперь комплементарный слой
  - Новые режимы: pads, subtle-offbeats, high-comping, ambient-swells, stab-accents
  - Правила взаимодействия с Piano
  - Старые режимы помечены как устаревшие (перенесены в Piano)
- **Критерий готовности (DoD):** Документ отражает актуальное состояние
- **Зависит от задач:** T-015, T-016
- **Статус:** 🟢 Готово

#### T-033. Обновить `docs/FUNCTIONS.md`

- **Родительская функция:** 4.4 (Документация)
- **Приоритет:** P1
- **Сложность:** XS
- **Слой:** docs
- **Плагин / Модуль:** `docs/FUNCTIONS.md`
- **Описание:**
  - §6.3: разделить «Гармония (Rhodes)» на «Piano» и «Rhodes (комплементарный слой)»
  - §6.4: добавить глобальный стиль
  - Обновить статусы: Piano 🟢, Rhodes 🟡 (рефакторинг)
- **Критерий готовности (DoD):** Документ актуален
- **Зависит от задач:** T-031, T-032
- **Статус:** 🟢 Готово

---

## 2. Последовательность (Ordering)

```
Этап 1 (T-001–T-004): Глобальный стиль + контракты
    │
    ├── Этап 2 (T-005–T-014): Piano Instrument
    │       │
    │       ├── T-005, T-006 (сэмплы) — параллельно
    │       ├── T-007 (sampleRegistry) — после T-005, T-006
    │       ├── T-008 (простые паттерны)
    │       ├── T-009 (профили) — после T-008
    │       ├── T-010 (voicing) — после T-008
    │       ├── T-011 (PianoInstrument) — после T-008, T-009, T-010
    │       ├── T-012 (manifest) — после T-007, T-011
    │       ├── T-013 (exports) — после T-011, T-012
    │       └── T-014 (useTransport) — после T-004, T-013
    │
    ├── Этап 3 (T-015–T-017): Rhodes комплементарный
    │       │
    │       ├── T-015 (RhodesInstrument refactor) — после T-008
    │       ├── T-016 (interaction rules) — после T-011, T-015
    │       └── T-017 (useTransport rhodes) — после T-014, T-015
    │
    ├── Этап 4 (T-018–T-022): API, настройки, форма
    │       │
    │       ├── T-018 (DTO) — после T-001, T-009, T-015
    │       ├── T-019 (DB schema) — после T-018
    │       ├── T-020 (API routes) — после T-018, T-019
    │       ├── T-021 (SettingsForm Piano) — после T-018
    │       └── T-022 (SettingsForm Rhodes) — после T-018
    │
    ├── Этап 5 (T-023): Style Selector — после T-004, T-014, T-017
    │
    ├── Этап 6 (T-024–T-025): Piano Randomizer
    │       │
    │       ├── T-024 (PianoRandomizer) — после T-011
    │       └── T-025 (интеграция) — после T-024
    │
    ├── Этап 7 (T-026): Bass стилевой — после T-004
    │
    └── Этап 8 (T-027–T-033): Тесты + документация
            │
            ├── T-027 (PianoInstrument tests) — после T-011
            ├── T-028 (PianoRandomizer tests) — после T-024
            ├── T-029 (Rhodes tests) — после T-015
            ├── T-030 (Bass tests) — после T-026
            ├── T-031 (PIANO.md) — после T-011, T-015, T-016
            ├── T-032 (RHODES.md update) — после T-015, T-016
            └── T-033 (FUNCTIONS.md update) — после T-031, T-032
```

## 3. Оценка суммарной трудоёмкости

| Сложность | Количество   | Часы (оценка)           |
| --------- | ------------ | ----------------------- |
| XS (<1d)  | 6            | ~12h                    |
| S (1–2d)  | 13           | ~65h                    |
| M (3–5d)  | 10           | ~100h                   |
| L (1–2w)  | 0            | 0                       |
| XL (>2w)  | 0            | 0                       |
| **Итого** | **29 задач** | **~180h (~4.5 недель)** |

> Оценка для одного разработчика. При параллельной работе над сэмплами (T-005, T-006) и кодом — можно сократить до 3–4 недель.

## 4. Критические пути

1. **T-001 → T-004 → T-014 → T-017 → T-023** — цепочка «глобальный стиль → drums → piano → rhodes → style selector». Критический путь для MVP.
2. **T-005, T-006 → T-007 → T-012** — цепочка «сэмплы → sampleRegistry → manifest». Можно начать параллельно с кодом.
3. **T-008 → T-009 + T-010 → T-011** — цепочка «паттерны → профили + voicing → PianoInstrument». Блокирует всю piano-разработку.
4. **T-018 → T-019 → T-020** — цепочка «DTO → DB → API». Блокирует сохранение настроек.
