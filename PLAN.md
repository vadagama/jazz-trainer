# План работ — Рефакторинг DrumInstrument

**На основе:** VISION.md (2026-06-13)
**Дата:** 2026-06-13
**Статус:** 🟡 В работе

## 1. Задачи (Tasks)

---

### Этап 1: Классический свинг (MVP)

#### T-001. Расширить `DrumSound` и `DrumEvent`

- **Родительская функция:** 3.1 Звуковой набор Swirly Drums
- **Приоритет:** P0
- **Сложность:** XS (<1d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/drumSampleRegistry.ts`, `instrument.ts`
- **Описание:** Добавить в `DrumSound` новые значения: `'bassDrum'`, `'snare'`, `'hihat'`, `'crash'`, `'rim'`. Сохранить старые (`'ride'`, `'stir'`, `'hihatFoot'`) как deprecated aliases. Обновить `DrumEvent` — поле `sound` принимает новый union. Обновить `InstrumentEventPayload`.
- **Критерий готовности:** typecheck проходит, `DrumEvent.sound` принимает новые значения.
- **Зависит от задач:** —
- **Статус:** 🔴 Запланировано

#### T-002. Отобрать и сконвертировать сэмплы Swirly Drums

- **Родительская функция:** 3.1 Звуковой набор Swirly Drums
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** music-core + web (public/assets)
- **Модуль:** `apps/web/public/samples/drums/`
- **Описание:** Скачать Swirly Drums с GitHub, отобрать подмножество для 6 звуков (по 4 RR на звук, 1 velocity layer). Для hihat — 3 степени открытости (closed, half, open) × 4 RR = 12 файлов. Итого ~36–40 OGG-файлов. Конвертировать WAV → OGG (libopus 128k) через ffmpeg. Разместить в `apps/web/public/samples/drums/swirly/`.
- **Критерий готовности:** Все файлы в директории, проигрываются через Tone.js.
- **Зависит от задач:** T-001 (нужны имена звуков для маппинга)
- **Статус:** 🔴 Запланировано

#### T-003. Обновить `drumSampleRegistry.ts`

- **Родительская функция:** 3.1 Звуковой набор Swirly Drums
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/drumSampleRegistry.ts`
- **Описание:** Новый `DRUM_SAMPLE_FILES` с маппингом звук → массив OGG-имён. Новый `DRUMS_BASE_URL` (`/samples/drums/swirly/`). Сохранить старый реестр как `LEGACY_DRUM_SAMPLE_FILES` для обратной совместимости. Round-robin логика остаётся без изменений.
- **Критерий готовности:** typecheck + существующие тесты `drumSampleRegistry` проходят.
- **Зависит от задач:** T-001, T-002
- **Статус:** 🔴 Запланировано

#### T-004. Обновить `drumsManifest.ts`

- **Родительская функция:** 3.1 Звуковой набор Swirly Drums
- **Приоритет:** P0
- **Сложность:** XS (<1d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/drumsManifest.ts`
- **Описание:** Новый `SampleManifest` с 6+ звуками. Обновить `defaultSettings`: добавить `bassDrumEnabled`, `snareEnabled`, `hihatEnabled`, `crashEnabled`, `rimEnabled`, `hihatOpenness`, `humanizeIntensity`, `pattern`. Сохранить старые настройки с маппингом.
- **Критерий готовности:** typecheck, `drumsManifest.defaultSettings` содержит все новые поля.
- **Зависит от задач:** T-003
- **Статус:** 🔴 Запланировано

#### T-005. Переписать `DrumInstrument.schedule()` — алгоритм свинга

- **Родительская функция:** 3.2 Паттерн «Классический свинг»
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/drumInstrument.ts`
- **Описание:** Новый метод `schedule()` с полноценной ритм-секцией:
  - **Ride:** классический swing (ding ding-a-ding), оффбиты через `ctx.swingRatio`
  - **Hihat:** восьмые с variable openness (closed на 2 и 4, half на оффбитах 1& и 3&, open на остальных)
  - **Snare:** акцент на 2 и 4 (backbeat), velocity 0.8
  - **Bass drum:** feathering (тихие четверти, velocity 0.3), акцент на 1 и 3 (velocity 0.6)
  - **Crash:** акцент на первую долю каждого N-го такта (начало формы)
  - **Rim:** опционально, выключен по умолчанию в свинге
  - Humanization: ±5ms timing, ±0.05 velocity (настраиваемая intensity)
  - Уважать per-sound `enabled` флаги
  - Деградация для не-4/4 размеров (3/4 jazz waltz, 6/8 и др.)
- **Критерий готовности:** typecheck + test + ручное прослушивание — свинг звучит естественно.
- **Зависит от задач:** T-004
- **Статус:** 🔴 Запланировано

#### T-006. Humanization с настраиваемой интенсивностью

- **Родительская функция:** 3.2 Паттерн «Классический свинг»
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/drumInstrument.ts`
- **Описание:** Параметр `humanizeIntensity: 'off' | 'low' | 'med' | 'high'`:
  - `off`: без jitter
  - `low`: ±3ms timing, ±0.03 velocity
  - `med`: ±5ms timing, ±0.05 velocity (текущий)
  - `high`: ±8ms timing, ±0.08 velocity
  - Метод `setHumanizeIntensity(intensity)` на DrumInstrument.
- **Критерий готовности:** typecheck + test — jitter в заданных диапазонах.
- **Зависит от задач:** T-005
- **Статус:** 🔴 Запланировано

#### T-007. Обновить DB schema — новые поля настроек

- **Родительская функция:** 3.5 Настройки барабанов
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** api
- **Модуль:** `apps/api/src/db/schema.ts`, migration
- **Описание:** Создать миграцию `0009_add_drums_v2_settings.sql`:
  ```sql
  ALTER TABLE user_settings ADD COLUMN drums_bass_drum_enabled BOOLEAN NOT NULL DEFAULT TRUE;
  ALTER TABLE user_settings ADD COLUMN drums_bass_drum_volume REAL NOT NULL DEFAULT 0.7;
  ALTER TABLE user_settings ADD COLUMN drums_snare_enabled BOOLEAN NOT NULL DEFAULT TRUE;
  ALTER TABLE user_settings ADD COLUMN drums_snare_volume REAL NOT NULL DEFAULT 0.8;
  ALTER TABLE user_settings ADD COLUMN drums_hihat_enabled BOOLEAN NOT NULL DEFAULT TRUE;
  ALTER TABLE user_settings ADD COLUMN drums_hihat_volume REAL NOT NULL DEFAULT 0.65;
  ALTER TABLE user_settings ADD COLUMN drums_hihat_openness INTEGER NOT NULL DEFAULT 0; -- 0–5
  ALTER TABLE user_settings ADD COLUMN drums_crash_enabled BOOLEAN NOT NULL DEFAULT TRUE;
  ALTER TABLE user_settings ADD COLUMN drums_crash_volume REAL NOT NULL DEFAULT 0.8;
  ALTER TABLE user_settings ADD COLUMN drums_rim_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE user_settings ADD COLUMN drums_rim_volume REAL NOT NULL DEFAULT 0.6;
  ALTER TABLE user_settings ADD COLUMN drums_pattern TEXT NOT NULL DEFAULT 'swing';
  ALTER TABLE user_settings ADD COLUMN drums_humanize_intensity TEXT NOT NULL DEFAULT 'med';
  ```
  Старые колонки (`drums_stir_*`, `drums_hihat_*`) оставить, пометить `-- deprecated` в схеме.
- **Критерий готовности:** Миграция применяется, `typecheck`.
- **Зависит от задач:** T-001
- **Статус:** 🔴 Запланировано

#### T-008. Обновить Zod-DTO (`shared/src/dto.ts`)

- **Родительская функция:** 3.5 Настройки барабанов
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** shared
- **Модуль:** `packages/shared/src/dto.ts`
- **Описание:** Добавить новые поля в `UserSettingsDTOSchema`:
  ```ts
  drumsBassDrumEnabled: z.boolean().optional(),
  drumsBassDrumVolume: z.number().min(0).max(1).optional(),
  drumsSnareEnabled: z.boolean().optional(),
  drumsSnareVolume: z.number().min(0).max(1).optional(),
  drumsHihatEnabled: z.boolean().optional(),       // replaces drumsStirEnabled
  drumsHihatVolume: z.number().min(0).max(1).optional(),
  drumsHihatOpenness: z.number().int().min(0).max(5).optional(),
  drumsCrashEnabled: z.boolean().optional(),
  drumsCrashVolume: z.number().min(0).max(1).optional(),
  drumsRimEnabled: z.boolean().optional(),
  drumsRimVolume: z.number().min(0).max(1).optional(),
  drumsPattern: z.enum(['swing', 'bossa', 'funk']).optional(),
  drumsHumanizeIntensity: z.enum(['off', 'low', 'med', 'high']).optional(),
  ```
  Старые поля (`drumsStirEnabled`, `drumsStirVolume`, `drumsHihatEnabled`, `drumsHihatVolume`) оставить с пометкой `/** @deprecated */`, удалить из валидации новых запросов.
- **Критерий готовности:** typecheck, Zod-схема принимает новые поля.
- **Зависит от задач:** T-007
- **Статус:** 🔴 Запланировано

#### T-009. Обновить API — PATCH `/api/settings`

- **Родительская функция:** 3.5 Настройки барабанов
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** api
- **Модуль:** `apps/api/src/routes/settings.routes.ts`, `apps/api/src/services/settings.service.ts`
- **Описание:** Обработка новых полей в PATCH `/api/settings`. Маппинг старых полей на новые при чтении (для обратной совместимости): `drumsStirEnabled` → `drumsSnareEnabled`, `drumsStirVolume` → `drumsSnareVolume`. Сохранение новых полей в БД. Валидация через обновлённую Zod-схему.
- **Критерий готовности:** `GET /api/settings` возвращает новые поля, `PATCH` сохраняет их в БД. Старые клиенты продолжают работать.
- **Зависит от задач:** T-007, T-008
- **Статус:** 🔴 Запланировано

#### T-010. Обновить SettingsForm (секция Drums)

- **Родительская функция:** 3.5 Настройки барабанов
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** web
- **Плагин:** `core-player` (`apps/web/src/plugins/core-player/`)
- **Описание:** Новая секция «Drums» в `SettingsForm.tsx`:
  - Master: on/off, volume
  - Pattern: select (`swing` | `bossa` | `funk`), условно показывать только доступные
  - Swing feel: slider 0.50–0.75 (общий `swingRatio` из TransportEngine)
  - Humanize: select (`off` | `low` | `med` | `high`)
  - Per-sound subsections:
    - Bass Drum: on/off, volume
    - Snare: on/off, volume
    - Hi-hat: on/off, volume, openness slider (0–5)
    - Ride: on/off, volume
    - Crash: on/off, volume
    - Rim: on/off, volume
  - Миграция: при первом рендере — если старые настройки есть, маппить на новые.
- **Критерий готовности:** UI отображает все контролы, изменения применяются к звуку. Старые настройки не теряются.
- **Зависит от задач:** T-009
- **Статус:** 🔴 Запланировано

#### T-011. Обновить `useLocalSettingsStore` и синхронизацию с DrumInstrument

- **Родительская функция:** 3.5 Настройки барабанов
- **Приоритет:** P0
- **Сложность:** S (1–2d)
- **Слой:** web
- **Плагин:** `core-player`
- **Описание:** Добавить новые поля в `useLocalSettingsStore`. `useEffect` для синхронизации настроек с `DrumInstrument.setRidePattern()` / новых методов (`setHihatOpenness`, `setHumanizeIntensity`, `setPattern`). При изменении `pattern` — пересоздавать внутреннее состояние DrumInstrument (или передавать pattern в `schedule()`).
- **Критерий готовности:** Изменение любого контрола в SettingsForm мгновенно влияет на звук.
- **Зависит от задач:** T-005, T-010
- **Статус:** 🔴 Запланировано

#### T-012. Тесты для нового DrumInstrument

- **Родительская функция:** 3.2 Паттерн «Классический свинг»
- **Приоритет:** P0
- **Сложность:** M (3–5d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/drumInstrument.test.ts`
- **Описание:** Написать unit-тесты:
  - 4/4 свинг: ride на все доли + оффбиты, snare на 2 и 4, bass drum на 1 и 3, hihat восьмые, crash на начало
  - 3/4 jazz waltz: ride на все доли, snare на 2 и 3, bass drum на 1
  - 6/8: ride на 1,3,5; snare на 4; bass drum на 1
  - Отключённый звук не попадает в sink
  - Humanization: jitter не выходит за границы окна
  - `swingRide` паттерн (legacy) работает идентично новому `swing` для 4/4
  - Старые тесты проходят с deprecated алиасами
- **Критерий готовности:** `npm run test -- packages/music-core` — все тесты зелёные.
- **Зависит от задач:** T-005, T-006
- **Статус:** 🔴 Запланировано

#### T-013. Обновить `docs/DRUMS.md`

- **Родительская функция:** 4.2 DRUMS.md
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** docs
- **Модуль:** `docs/DRUMS.md`
- **Описание:** Полностью переписать документ: новые звуки, новые паттерны, библиотека Swirly Drums, архитектура DrumInstrument v2, настройки, инструкция по добавлению стиля.
- **Критерий готовности:** Документ отражает актуальное состояние.
- **Зависит от задач:** T-012
- **Статус:** 🔴 Запланировано

---

### Этап 2: Босса-нова

#### T-014. Добавить bossa nova паттерн в DrumInstrument

- **Родительская функция:** 3.3 Паттерн «Босса-нова»
- **Приоритет:** P1
- **Сложность:** M (3–5d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/drumInstrument.ts`
- **Описание:** Метод `scheduleBossa()` или ветка в `schedule()` при `pattern === 'bossa'`:
  - Rim: clave-подобный паттерн (X . X . X . . .)
  - Bass drum: синкопы на 1 и 3&
  - Hihat: закрытый chick на 2 и 4, восьмые на остальных
  - Ride: опционально (по умолчанию выключен)
  - Crash: на начало формы
- **Критерий готовности:** typecheck + test + прослушивание — босса-нова звучит аутентично.
- **Зависит от задач:** T-005, T-012
- **Статус:** 🔴 Запланировано

#### T-015. Настройки bossa nova (pattern selection, UI)

- **Родительская функция:** 3.3 Паттерн «Босса-нова»
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** api + web
- **Модуль:** `apps/api/`, `apps/web/`
- **Описание:** Расширить `drumsPattern` enum значением `'bossa'` (уже заложено в T-008). В SettingsForm: выбор `bossa` в селекторе паттерна. Для bossa — автоматически выключить ride (или сделать опциональным). Добавить опцию `bossaClaveDirection` (P3 — опционально).
- **Критерий готовности:** Выбор «Bossa Nova» в UI меняет паттерн.
- **Зависит от задач:** T-014, T-010
- **Статус:** 🔴 Запланировано

#### T-016. Тесты bossa nova

- **Родительская функция:** 3.3 Паттерн «Босса-нова»
- **Приоритет:** P1
- **Сложность:** S (1–2d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/drumInstrument.test.ts`
- **Описание:** Тесты для bossa nova:
  - 4/4: rim clave-паттерн, bass drum синкопы, hihat chick
  - 3/4: деградация (waltz bossa?)
  - Humanization работает
- **Критерий готовности:** Тесты проходят.
- **Зависит от задач:** T-014
- **Статус:** 🔴 Запланировано

---

### Этап 3: Фанк

#### T-017. Добавить funk паттерн в DrumInstrument

- **Родительская функция:** 3.4 Паттерн «Фанк»
- **Приоритет:** P2
- **Сложность:** M (3–5d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/drumInstrument.ts`
- **Описание:** Метод `scheduleFunk()` или ветка в `schedule()` при `pattern === 'funk'`:
  - Hihat: 16th note (или восьмые с открытым звуком на оффбитах)
  - Bass drum: синкопированный грув с вариациями плотности
  - Snare: акценты на 2 и 4, rimshot, опциональные заполнения
  - Ride: выключен по умолчанию
  - Crash: акценты на границах секций
- **Критерий готовности:** typecheck + test + прослушивание — фанк звучит groove-во.
- **Зависит от задач:** T-014
- **Статус:** 🔴 Запланировано

#### T-018. Настройки funk (complexity, fill frequency, UI)

- **Родительская функция:** 3.4 Паттерн «Фанк»
- **Приоритет:** P2
- **Сложность:** S (1–2d)
- **Слой:** api + web
- **Модуль:** `apps/api/`, `apps/web/`
- **Описание:** Расширить `drumsPattern` значением `'funk'`. Добавить поля:
  - `drumsFunkComplexity: 'simple' | 'medium' | 'complex'` (плотность bass drum)
  - `drumsFillFrequency: 'none' | 'rare' | 'often'` (частота заполнений)
  - DB миграция, Zod-DTO, API, SettingsForm.
- **Критерий готовности:** Выбор «Funk» в UI, настройки complexity/fill работают.
- **Зависит от задач:** T-017, T-015
- **Статус:** 🔴 Запланировано

#### T-019. Тесты funk

- **Родительская функция:** 3.4 Паттерн «Фанк»
- **Приоритет:** P2
- **Сложность:** S (1–2d)
- **Слой:** music-core
- **Модуль:** `packages/music-core/src/audio/drumInstrument.test.ts`
- **Описание:** Тесты для funk:
  - 4/4: 16th note hihat, синкопированная bass drum, snare backbeat
  - Разные уровни complexity
  - Humanization работает
- **Критерий готовности:** Тесты проходят.
- **Зависит от задач:** T-017
- **Статус:** 🔴 Запланировано

---

## 2. Последовательность (Ordering)

```
Этап 1 (Swing MVP):
T-001 → T-002 → T-003 → T-004 → T-005 → T-006
                    ↘ T-007 → T-008 → T-009 → T-010 → T-011
                                               T-005 → T-012 → T-013

Этап 2 (Bossa Nova):
T-014 → T-015 → T-016

Этап 3 (Funk):
T-017 → T-018 → T-019
```

Параллельно можно делать:
- T-002 (сэмплы) и T-007 (DB schema) — независимы
- T-012 (тесты) и T-010 (SettingsForm) — независимы после T-005

## 3. Оценка суммарной трудоёмкости

| Сложность | Количество |
|---|---|
| XS | 2 (T-001, T-004) |
| S | 11 (T-003, T-006, T-007, T-008, T-009, T-011, T-013, T-015, T-016, T-018, T-019) |
| M | 6 (T-002, T-005, T-010, T-012, T-014, T-017) |
| L | 0 |
| XL | 0 |

**Суммарно:** ~27–36 рабочих дней (~5.5–7 недель одним разработчиком).

- Этап 1: ~15–20 дней (3–4 недели)
- Этап 2: ~6–8 дней (~1.5 недели)
- Этап 3: ~6–8 дней (~1.5 недели)

## 4. Критические пути

- **T-001 → T-005 → T-012** — критическая цепочка музыкального ядра. Без неё нет звука.
- **T-007 → T-008 → T-009 → T-010 → T-011** — цепочка настроек. Без неё пользователь не может управлять барабанами.
- **T-002 (сэмплы)** — блокирует T-003, но может делаться параллельно с T-001, T-007, T-008.

---

*План создан 2026-06-13 на основе VISION.md. Статусы задач обновляются по мере реализации.*
