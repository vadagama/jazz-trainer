# ADMIN-DEFAULT-INSTRUMENT-SETTINGS — Настройки инструментов по умолчанию

**Статус:** 🔴 Запланировано
**Дата:** 2026-07-25
**Тип:** Feature Brief (требования к новому функционалу админки)
**Слой:** API + Admin Plugin + Plugin SDK (settings resolution)

---

## 1. Резюме (Executive Summary)

Добавить в админку Jazz Trainer раздел управления **настройками инструментов по умолчанию** — глобальные значения, которые становятся отправной точкой для двух категорий пользователей:

1. **Новые зарегистрированные пользователи** — при создании аккаунта получают `user_settings`-запись, инициализированную значениями из `default_settings`.
2. **Незарегистрированные (гостевые) пользователи** — настройки по умолчанию применяются напрямую через `useEffectiveSettings` → `applyStyleDefaults`, поскольку у них нет серверной записи.

После первой инициализации пользователь волен менять любые значения через существующую страницу `/settings` — его индивидуальные изменения сохраняются в `user_settings` и **не перезаписываются** при обновлении дефолтов админом.

**Аналогия:** «Заводские настройки» прибора — производитель (админ) задаёт их один раз, а каждый пользователь подстраивает под себя.

---

## 2. Проблема

### As-is
- Все значения по умолчанию захардкожены как `DEFAULT` в SQL-схеме `user_settings` (например, `bpm: 120`, `style: 'swing'`, `pianoVoicingDensity: 'rootless3'`, `drumKit: 'jazz-drum-kit'`).
- Чтобы изменить дефолтный темп или набор включённых инструментов для всех новых пользователей, нужно править код (`schema.ts` → миграция) — это требует деплоя и недоступно администраторам системы.
- Гостевые пользователи получают жёстко заданные `localSettings`-дефолты (те же `bpm: 120`, `volume: 0.8`) из `useLocalSettingsStore`, тоже без возможности администрирования.
- Нет раздела в админке для управления «глобальными» настройками.

### Why now
- Система инструментов стабилизировалась: Bass, Piano, Rhodes, Drums, Percussion, Guitar, Metronome, Vibraphone, Organ, Clarinet — все имеют настройки в `user_settings`.
- Администратор хочет управлять стартовым опытом пользователей: например, включить Rhodes по умолчанию для всех (сейчас `rhodesEnabled: false`), или сменить дефолтный drum kit.
- Для гостевых пользователей это единственный способ получить *управляемые* (а не жёстко закодированные) настройки.

---

## 3. Функциональные требования

### 3.1. Новая сущность: `default_settings`

Создать таблицу `default_settings` в БД, хранящую **ровно одну строку** (singleton). Все поля повторяют структуру `user_settings`, кроме `userId` и полей аудита конкретного пользователя.

**Схема (концепт):**

| Поле | Тип | Описание |
|---|---|---|
| `id` | `integer PK` | Всегда `1` (singleton constraint) |
| `bpm` | `integer` | Дефолтный темп (120) |
| `volume` | `real` | Дефолтная громкость (0.8) |
| `style` | `text` | Дефолтный глобальный стиль. Поддерживаемые: `'swing'`, `'bossa'`, `'funk'`, `'latin'`, `'ballad'`. 🟡 Roadmap: `'blues'`, `'soul'`. Дефолт: `'swing'` |
| `metronomeEnabled` | `boolean` | Метроном включён по умолчанию |
| `metronomeVolume` | `real` | Громкость метронома по умолчанию |
| `metronomeMode` | `text` | Режим метронома ('both') |
| `metronomeStrongEnabled` | `boolean` | Сильная доля (1) включена |
| ... | ... | **Все поля из `user_settings`** (включая `*Enabled`, `*Volume`, `*Pattern`, `*Tension`, `*Humanize`, `perStyleOverrides`, `swingRatio`, `audioFormat`, `soloToneId`, и т.д.) |
| `pianoEnabled` | `boolean` | Фортепиано включено (сейчас default `false`) |
| `pianoVolume` | `real` | Громкость фортепиано |
| `pianoVoicingDensity` | `text` | Плотность voicing'а ('rootless3') |
| `pianoSampleLibrary` | `text` | Библиотека сэмплов ('salamander') |
| `pianoTension` | `text` | Гармоническая краска ('clean') |
| `rhodesEnabled` | `boolean` | Rhodes включён (сейчас default `false`) |
| `rhodesMode` | `text` | Режим Rhodes ('halfNotes') |
| `rhodesVoicingDensity` | `text` | Плотность voicing'а ('rootless3') |
| `rhodesLayerMode` | `text` | Режим комплементарного слоя ('none' — без доп. слоя) |
| `rhodesLayerVolume` | `real` | Громкость доп. слоя (0.5) |
| `rhodesRegister` | `text` | Регистр Rhodes: `'mid'` (C4–C5, по умолчанию) / `'high'` (C5–C6). НЕ ставить `'high'` по умолчанию — см. §3.7 |
| `bassEnabled` | `boolean` | Бас включён (true) |
| `bassComplexity` | `integer` | Сложность баса (1–7, default 1) |
| `bassVariant` | `text` | Вариант ('upright' или null=стиль) |
| `drumsEnabled` | `boolean` | Барабаны включены (true) |
| `drumKit` | `text` | Кит ('jazz-drum-kit') |
| `drumsBassDrumEnabled` | `boolean` | Бочка включена |
| ... | | Все per-sound настройки барабанов, перкуссии, гитары |
| `createdAt` | `integer` | Timestamp создания |
| `updatedAt` | `integer` | Timestamp обновления |

> **Примечание:** в отличие от `user_settings`, в `default_settings` **нет** `userId`, `practiceCards`, `midiDeviceId`, `midiChannel` — эти поля индивидуальны и не имеют смысла как глобальный дефолт.

### 3.2. Per-style дефолтные инструменты (StyleProfile)

Таблица ниже — источник истины для per-style дефолтов (см. [StyleProfile в STYLES.md](Genres/STYLES.md#7-styleprofile-сводная-таблица-per-instrument-defaults)). Администратор может переопределить включение (`*Enabled`), громкость (`*Volume`), паттерн (`*Pattern`) и плотность voicing'а (`*VoicingDensity`) **любого** инструмента для **любого** стиля через поле `perStyleOverrides`.

| Инструмент | Swing (140) | Bossa (120) | Funk (100) | Latin (160) | Ballad (60) | Blues 🟡 | Soul 🟡 |
|---|---|---|---|---|---|---|---|
| **Drums** (Swirly) | on, 0.70, swing | on, 0.60, bossa | OFF | on, 0.70, latin | on, 0.50, ballad | on, 0.70, shuffle | OFF |
| **Modern Kit** | OFF | OFF | on, 0.75, funk | OFF | OFF | OFF | on, 0.65, soul |
| **Upright Bass** | on, 0.75, walking | on, 0.70, root-5th | OFF | on, 0.70, montuno | on, 0.70, two-feel | on, 0.75, blues-walking | OFF |
| **Electric Bass** | OFF | OFF | on, 0.75, syncopated | OFF | OFF | OFF | on, 0.70, pocket |
| **Piano** | on, 0.70, swing-sparse, rootless3 | on, 0.65, swing-sparse, shell2 | on, 0.70, offbeat-push, rootless4 | on, 0.70, basie-light, quartal | on, 0.65, beginner-safe, rootless4 | on, 0.70, blues-comping, rootless4 | off, 0.60, soul-complement, shell2 |
| **Upright Piano** | OFF | OFF | OFF | OFF | OFF | OFF | OFF |
| **Rhodes** | off, 0.55, subtle-offbeats, rootless3 | off, 0.50, ambient-swells, shell2 | off, 0.60, stab-accents, rootless4 | off, 0.55, high-comping, rootless3 | off, 0.50, pads, shell2 | OFF | on, 0.80, rhodes-soul-form, rootless4 |
| **Guitar** (nylon/steel) | off, 0.65, freddie-green, steel | off, 0.70, bossa-comping, nylon | OFF | OFF | OFF | OFF | OFF |
| **Electric Guitar** | OFF | OFF | off, 0.70, funk-chops | OFF | OFF | off, 0.70, blues-chops | off, 0.65, soul-comping |
| **Vibraphone** | off, 0.60, pads | OFF | OFF | off, 0.60, inserts | off, 0.55, pads | off, 0.55, pads | off, 0.60, pads |
| **Organ** | OFF | OFF | off, 0.65, pads-stabs | OFF | OFF | off, 0.70, blues-pads | off, 0.65, soul-swells |
| **Clarinet** | off, 0.60, counterpoint | OFF | OFF | OFF | OFF | off, 0.55, counterpoint | OFF |
| **Percussion** | OFF | off, 0.60, bossa | off, 0.65, funk | on, 0.70, latin | OFF | OFF | on, 0.55, soul-shaker |
| **Trumpet** (muted) | off, 0.65, melodic | OFF | off, 0.65, syncopated-accents | off, 0.65, melodic | OFF | off, 0.65, melodic | off, 0.60, brass-fills |
| **Flute** | OFF | off, 0.55, airy | OFF | off, 0.60, latin | off, 0.55, airy | OFF | OFF |

Формат ячейки: `вкл, громкость, паттерн, [voicing]`.

- `ON` / `OFF` — инструмент глобально включён/выключен для стиля (скрыт/показан в интерфейсе).
- `on` / `off` — доступен/недоступен по умолчанию, пользователь может включить.
- Громкость: `0.0`–`1.0`.
- Паттерн: organism form id или стиле-зависимый идентификатор (см. [STYLES.md §4](Genres/STYLES.md#4-voicingи-и-паттерны)).
- Voicing: `shell2`, `rootless3`, `rootless4`, `quartal` (только для гармонических инструментов).

> 🟡 Столбцы **Blues** и **Soul** — roadmap. Не блокируют реализацию `default_settings`: поля для них закладываются в `perStyleOverrides` с заделом на будущее.

### 3.3. Инициализация новых пользователей

При создании записи в `user_settings` (сейчас это происходит при первом логине или регистрации) значения берутся **не из хардкод-дефолтов Drizzle**, а из таблицы `default_settings`:

```
user_settings = merge(default_settings, { userId, createdAt, updatedAt })
```

Если `default_settings` ещё не создана (первый запуск, миграция) — заполнить её текущими хардкод-дефолтами (seed).

**Поведение при обновлении дефолтов админом:**
- Существующие пользователи **не затрагиваются** — их `user_settings` остаются как есть.
- Только **новые** пользователи получают обновлённые значения.
- Это намеренное поведение: админ не должен перезаписывать пользовательские настройки.

### 3.4. Применение для гостевых (незарегистрированных) пользователей

В `useEffectiveSettings()` (текущий код: пакет `plugin-sdk/src/queries/useEffectiveSettings.ts`) для гостей сейчас вызывается:

```ts
return applyStyleDefaults(localSettings, (localSettings.style ?? 'swing') as Style);
```

**Изменение:** перед вызовом `applyStyleDefaults` применять `default_settings` как базовый слой, поверх которого накладываются `localSettings`:

```
эффективные настройки гостя = applyStyleDefaults(
  merge(defaultSettings, localSettings),
  style
)
```

`defaultSettings` для гостей запрашиваются через **публичный** (без аутентификации) endpoint `GET /api/default-settings`.

### 3.5. UI: страница админки «Настройки по умолчанию»

Создать новый плагин `admin-defaults` в категории `admin`:

- **Маршрут:** `/admin/defaults`
- **Пункт меню:** секция `admin`, label `Настройки по умолчанию`, иконка `sliders`
- **Требует permission:** `system:settings:write` (уже есть у `super_admin`, **отсутствует** у `admin`)

**Структура страницы:** зеркало существующей страницы настроек пользователя (`/settings`, плагин `core-settings`), но:

- Вкладки: `Основные` | `Инструменты` | `Системные` (без `MIDI` — нет глобального смысла)
- На вкладке `Инструменты` — переключатель стиля (`swing`/`bossa`/`funk`/`latin`/`ballad`) и полная таблица всех инструментов (см. §3.2) с:
  - Чекбоксом `Enabled` (вкл/выкл)
  - Слайдером `Volume`
  - Выпадающим списком `Pattern`
  - Выпадающим списком `Voicing Density` (для гармонических инструментов)
- Дополнительно: плашка-предупреждение «Эти настройки будут применяться для всех новых пользователей. Существующих пользователей изменения не затронут.»
- Кнопка «Сохранить» (PATCH) — с оптимистичным обновлением
- Кнопка «Сбросить к заводским» — восстанавливает хардкод-дефолты из seed

**Поведение при отсутствии записи:**
- Если `default_settings` ещё не создана — страница показывает значения по умолчанию из кода
- При первом сохранении создаётся запись

### 3.6. API

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| `GET` | `/api/admin/default-settings` | `system:settings:read` | Получить текущие дефолтные настройки (для админки) |
| `GET` | `/api/default-settings` | Публичный (без auth) | Получить дефолтные настройки (для гостей) |
| `PUT` | `/api/admin/default-settings` | `system:settings:write` | Полностью заменить дефолтные настройки |
| `PATCH` | `/api/admin/default-settings` | `system:settings:write` | Частично обновить дефолтные настройки |
| `POST` | `/api/admin/default-settings/reset` | `system:settings:write` | Сбросить к хардкод-дефолтам |

**DTO:**
- `DefaultSettingsDTO` — Zod-схема, подмножество `UserSettingsDTOSchema` без персональных полей (`practiceCards`, `midiDeviceId`, `midiChannel`)
- `UpdateDefaultSettingsSchema = DefaultSettingsDTO.partial()`

**Аудит:**
- Все мутации (`PUT`, `PATCH`, `POST /reset`) пишутся в `audit_log` с указанием `action = 'default_settings:update'` или `'default_settings:reset'`

### 3.7. Регистр Rhodes по умолчанию

**Проблема:** Rhodes по реализации в `music-core` играет в верхнем регистре C4–C6. При дефолтных настройках регистр может оказаться слишком высоким (C5–C6) — звук становится резким, «стеклянным» и перекрывает соло-инструменты и воображаемый вокал в миксе. Администратор должен иметь возможность опустить Rhodes в комфортный средний диапазон **по умолчанию**.

**Требование:**
- В `default_settings` добавить поле `rhodesRegister` со значениями:
  - `'mid'` — средний регистр C4–C5 (рекомендованный дефолт)
  - `'high'` — высокий регистр C5–C6 (текущее поведение `music-core`)
- **Дефолтное значение:** `'mid'`. Rhodes не должен звучать слишком высоко «из коробки».
- Регистр применяется на уровне инструмента: `RhodesInstrument` сдвигает октаву voicing'ов в соответствии с настройкой.
- Пользователь может переопределить в своих настройках (поле добавляется и в `user_settings`).

### 3.8. RBAC

| Действие | Требуемое разрешение | `super_admin` | `admin` |
|---|---|---|---|
| Просмотр дефолтных настроек в админке | `system:settings:read` | ✅ | ✅ |
| Редактирование дефолтных настроек | `system:settings:write` | ✅ | ❌ |
| Публичный доступ к дефолтным настройкам (API) | Нет (публичный) | ✅ | ✅ |

**Важно:** текущая роль `admin` не имеет `system:settings:write`. Это осознанно — редактирование глобальных дефолтов должно быть только у `super_admin`. Если потребуется, можно выдать `system:settings:write` роли `admin` точечно.

---

## 4. Нефункциональные требования

### 4.1. Производительность

- `GET /api/default-settings` (публичный) должен кешироваться на 60 секунд (через `Cache-Control` или встроенный кеш Fastify), так как вызывается при каждой загрузке для гостей.
- Админский `GET /api/admin/default-settings` — без кеша (всегда актуальное).

### 4.2. Отказоустойчивость

- Если `default_settings` отсутствует (первый запуск или сбой миграции):
  - Публичный endpoint возвращает хардкод-дефолты (текущее поведение).
  - Админский endpoint показывает хардкод-дефолты и предлагает сохранить.
  - Создание нового пользователя использует хардкод-дефолты как fallback.
- Гость получает хардкод-дефолты, если API недоступен.

### 4.3. Безопасность

- Публичный endpoint `GET /api/default-settings` отдаёт только настройки — без какой-либо пользовательской или системной информации.
- Rate-limit на `PATCH /api/admin/default-settings` (не чаще 1 раза в 5 секунд), чтобы избежать случайных лавин обновлений.

---

## 5. Влияние на существующий код

| Область | Изменение |
|---|---|
| `apps/api/src/db/schema.ts` | Новая таблица `defaultSettings` |
| `apps/api/src/db/seed.ts` | Seed-значения для `default_settings` (включая per-style дефолты из §3.2) |
| `apps/api/src/routes/settings.routes.ts` | Инициализация `user_settings` из `default_settings` вместо хардкода |
| `apps/api/src/routes/` | Новый файл `defaults.routes.ts` |
| `apps/api/src/services/auth.service.ts` | `toSettingsDTO` — логика не меняется, так как дефолты применяются на этапе создания `user_settings` |
| `packages/shared/src/dto.ts` | Новые схемы: `DefaultSettingsDTO`, `UpdateDefaultSettingsSchema` |
| `packages/music-core/src/audio/rhodesInstrument.ts` | Добавить поддержку `rhodesRegister`: сдвиг октавы voicing'ов при `'mid'` (C4–C5) vs `'high'` (C5–C6) |
| `packages/plugin-sdk/src/queries/useEffectiveSettings.ts` | Применять `defaultSettings` перед `applyStyleDefaults` для гостей |
| `packages/plugin-sdk/src/queries/` | Новый хук `useDefaultSettings` (публичный, без auth) |
| `packages/plugins/admin-defaults/` | **Новый плагин** |
| `packages/plugin-registry/src/index.ts` | Регистрация `admin-defaults` |
| `apps/web/vite.config.ts`, `tsconfig.base.json`, `vitest.config.ts` | Алиасы для нового плагина |
| `docs/ROLES.md` | Дополнить permission `system:settings:write` контекстом использования |
| `docs/FUNCTIONS.md` | Добавить раздел `5.8. Настройки по умолчанию` |

---

## 6. Зависимости

| Зависимость | Статус | Примечание |
|---|---|---|
| Таблица `user_settings` | 🟢 Готово | Все поля стабильны, зеркалируем |
| `useEffectiveSettings` | 🟢 Готово | Есть точка расширения для гостевого пути |
| `system:settings:write` permission | 🟢 Готово | Уже существует, есть у `super_admin` |
| Плагин `core-settings` (UI-эталон) | 🟢 Готово | Копируем структуру страницы |
| Admin-плагины (паттерн) | 🟢 Готово | Есть 12+ админ-плагинов как образец |
| API-инфраструктура (RBAC middleware, audit) | 🟢 Готово | Переиспользуем |
| StyleProfile (`music-core/src/styleProfile.ts`) | 🟢 Готово | Есть сводная таблица per-instrument defaults; данные для `default_settings` берутся оттуда |

---

## 7. Out of Scope

- **Массовое применение дефолтов к существующим пользователям** — админ не может «пушить» изменения настроек существующим пользователям. Это отдельная фича (например, кнопка «Применить ко всем» с подтверждением).
- **Версионирование дефолтных настроек** — откат к предыдущей версии не предусмотрен (но пишется в audit log).
- **Per-role дефолтные настройки** — один набор дефолтов на всех.
- **Дефолтные настройки для практических упражнений** (`practiceCards`) — это индивидуальная настройка, не глобальная.
- **Дефолтные MIDI-настройки** — `midiDeviceId`, `midiChannel` индивидуальны.
- **Пресеты ансамблей (EnsembleType: duet/trio/quartet/quintet/full)** — выбор размера состава с преднастроенными громкостями через `applyEnsemble`. Избыточно: достаточно ручного включения/отключения инструментов через `*Enabled`-флаги и регулировки громкости через `*Volume`.

---

## 8. Метрики успеха

- Администратор может изменить дефолтный темп/стиль/набор инструментов через UI без деплоя кода.
- Новый зарегистрированный пользователь получает настройки, соответствующие `default_settings`, а не хардкоду.
- Гостевой (незарегистрированный) пользователь получает настройки из `default_settings`.
- Изменение дефолтов не влияет на существующих пользователей.
- Дефолтный Rhodes звучит в среднем регистре (C4–C5), не «визжит» на высоких нотах.
- Per-style дефолты соответствуют таблице StyleProfile из [STYLES.md](Genres/STYLES.md).
- Время ответа публичного endpoint `< 50ms` (с кешем).

---

## 9. Риски и допущения

| Риск | Вероятность | Влияние | Митигация |
|---|---|---|---|
| `user_settings` схема изменится после создания `default_settings` | Средняя | Среднее | Зеркалируем Drizzle-схему; если добавляется поле в `user_settings`, оно должно быть добавлено и в `default_settings` |
| Гости могут не получить дефолты при недоступности API | Низкая | Низкое | Fallback на хардкод-дефолты (текущее поведение) |
| Админ выставит «плохие» дефолты | Средняя | Среднее | Кнопка «Сбросить к заводским» + audit log |
| `[assumption]` Администратору достаточно одного набора дефолтов для всех | — | — | Если потребуется per-role/blues/soul — расширяем в v2 |
| Blues и Soul ещё не в коде (`type Style`), но уже в STYLES.md | Низкая | Низкое | `perStyleOverrides` поддерживает произвольные ключи; поля для blues/soul закладываются с заделом, активируются когда стили войдут в `type Style` |

---

## 10. План реализации (декомпозиция)

| ID | Задача | Слой | Сложность | Зависит от |
|---|---|---|---|---|
| T-001 | Создать таблицу `default_settings` в `schema.ts` + миграция | API | XS | — |
| T-002 | Добавить seed-данные в `seed.ts` (значения из StyleProfile §3.2) | API | S | T-001 |
| T-003 | Создать DTO: `DefaultSettingsDTO`, `UpdateDefaultSettingsSchema` | Shared | S | — |
| T-004 | Создать `defaults.routes.ts`: CRUD + публичный endpoint | API | S | T-001, T-003 |
| T-005 | Модифицировать создание `user_settings`: инициализация из `default_settings` | API | S | T-001 |
| T-006 | Добавить `useDefaultSettings` хук в `plugin-sdk` | SDK | XS | T-004 |
| T-007 | Модифицировать `useEffectiveSettings`: применять дефолты для гостей | SDK | S | T-006 |
| T-008 | Создать плагин `admin-defaults`: UI страницы (вкладки, таблица инструментов по стилям) | Plugin | M | T-004, T-006 |
| T-009 | Зарегистрировать плагин + алиасы | Config | XS | T-008 |
| T-010 | Обновить документацию: `FUNCTIONS.md`, `ROLES.md` | Docs | XS | T-008 |
| T-011 | Добавить поддержку `rhodesRegister` в `RhodesInstrument`: сдвиг октавы при `'mid'` (C4–C5) vs `'high'` (C5–C6), поле в `user_settings` и `default_settings` | Core + API | S | T-001 |

**Общая оценка сложности:** M (Medium) — ~5–7 рабочих дней одним разработчиком.

**Критический путь:** T-001 → T-004 → T-008 (таблица → API → UI). T-011 параллелен с T-004.

---

*Документ создан 2026-07-25 аналитиком на основе запроса пользователя. Для реализации передать агенту `software-engineer`.*
