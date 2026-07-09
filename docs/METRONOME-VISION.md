# METRONOME-VISION — Метроном как отдельный инструмент-плагин

> **Дата:** 2026-07-09
> **Версия:** 1.0
> **Статус:** 🟡 Черновик (v1.0 — первичное видение)
> **Приоритет:** P1 — улучшение существующей функции

## 1. Резюме

**Проблема:** Текущий метроном (`MetronomeInstrument`) жёстко зашит в `music-core` и `useTransport.ts`. Он либо включён глобально (на затакте и на всех тактах), либо выключен. Невозможно включить метроном только на затакте, оставив основные такты без кликов — а это ключевой сценарий для музыканта: «услышал темп в затакте, дальше играю под аккомпанемент».

**Цель:** Вынести метроном в отдельный инструмент-плагин `packages/plugins/instruments/metronome/` с возможностью независимого управления затактом и основными тактами. Расширить палитру звуков метронома за счёт перкуссионных сэмплов из funk-drum-kit.

**Горизонт:** Новый плагин `metronome` (категория `technique`), расширенный `SampleManifest.oneshots` с 8 звуками, новый компонент настроек в UI, миграция `useTransport.ts` — без изменения `MetronomeInstrument` (ядро не трогаем).

**Сценарии:**

| Сценарий | Затакт | Основные такты | Пример использования |
|----------|--------|----------------|---------------------|
| A | 🔈 метроном | 🔇 без метронома | Студент хочет услышать темп перед входом |
| B | 🔈 метроном | 🔈 метроном | Разучивание ритмически сложного материала |
| C | 🔇 без метронома | 🔈 метроном | Работа над грувом под аккомпанемент с кликом |

## 2. Текущее состояние (as-is)

### 2.1. Архитектура

```
MetronomeInstrument (music-core)     ← чистая логика: расписание кликов
  ├── schedule(window, ctx)          ← итерация по битам, вызов scheduleClick()
  ├── activeBeats[]                  ← маска активных долей
  ├── strongBeats[]                  ← индексы сильных долей
  └── secondStrongBeats[]            ← индексы вторых сильных долей

TransportEngine.scheduleClick()      ← ClickSink → Tone.Player в useTransport.ts
```

**Важно:** `MetronomeInstrument` остаётся в ядре — это чистый планировщик, полностью тестируемый. Меняется только то, _что_ и _когда_ он планирует, и _как_ рендерятся клики.

### 2.2. Рендеринг (useTransport.ts)

- **3 статических `Tone.Player`**: `strongPlayer`, `strong2Player`, `weakPlayer`
- Каждый загружает сэмпл из `clickStrong` / `clickStrong2` / `clickWeak`
- Громкость: strong = `metronomeDb`, strong2 = `metronomeDb - 3dB`, weak = `metronomeDb - 6dB`
- `scheduleClick(atTicks, beatType)` → `tone.scheduleOnce(...)` → `player.start()`

### 2.3. Затакт (count-in)

- Настраивается параметром `countIn` (0–4 такта)
- Реализован **отдельно** от `TransportEngine`: `setTimeout`-ы в `play()`, минуя `scheduleWindow`
- Звуки затакта — те же, что у основного метронома, без возможности отдельного отключения
- Если `metronomeEnabled = false`, затакт тоже отключается

### 2.4. Настройки пользователя

| Параметр | Тип | По умолчанию | Где |
|----------|-----|-------------|-----|
| `clickStrong` | `ClickSound \| null` | `'drum-stick'` | `UserSettingsDTO` |
| `clickStrong2` | `ClickSound \| null` | `'drum-stick'` | `UserSettingsDTO` |
| `clickWeak` | `ClickSound \| null` | `'drum-stick'` | `UserSettingsDTO` |
| `metronomeEnabled` | `boolean` | `true` | `UserSettingsDTO` |
| `metronomeVolume` | `0–1` | `0.8` | `UserSettingsDTO` |
| `countIn` | `0–4` | `1` | `UserSettingsDTO` |
| — | — | — | **Новые (to-be)** |
| `metronomeMode` | `'both' \| 'pickup-only' \| 'main-only'` | `'both'` | → добавить |
| `metronomeStrongEnabled` | `boolean` | `true` | → добавить |
| `metronomeStrongVolume` | `0–1` | `0.8` | → добавить |
| `metronomeStrong2Enabled` | `boolean` | `true` | → добавить |
| `metronomeStrong2Volume` | `0–1` | `0.8` | → добавить |
| `metronomeWeakEnabled` | `boolean` | `true` | → добавить |
| `metronomeWeakVolume` | `0–1` | `0.8` | → добавить |

### 2.5. Доступные звуки (5 шт.)

| ID | Название | Файл |
|----|----------|------|
| `analog-metronome` | Analog Metronome | `/samples/aac/metronome/analog-metronome.m4a` |
| `button-click` | Button Click | `/samples/aac/metronome/button-click.m4a` |
| `drum-stick` | Drum Stick | `/samples/aac/metronome/drum-stick.m4a` |
| `retro-stick` | Retro Stick | `/samples/aac/metronome/retro-stick.m4a` |
| `switch` | Switch | `/samples/aac/metronome/switch.m4a` |

## 3. Предлагаемое решение

### 3.1. Принципы

1. **Ядро не трогаем.** `MetronomeInstrument` остаётся в `music-core` без изменений. Его задача — чистое расписание кликов. Новая логика (режимы A/B/C, выбор звуков) — на уровне плагина и UI.
2. **Метроном — плагин.** `packages/plugins/instruments/metronome/` экспортирует `InstrumentManifest`, `sampleRegistry` и UI-компонент настроек. Регистрируется в `plugin-registry`.
3. **Звуки — через SampleManifest.oneshots.** Расширяем `SampleManifest` для перкуссионных звуков метронома (по аналогии с `DrumInstrument`).
4. **Раздельное управление затактом и тактами.** Три режима: `'both'` | `'pickup-only'` | `'main-only'`.
5. **Обратная совместимость.** Существующие настройки `clickStrong`/`clickStrong2`/`clickWeak`/`metronomeEnabled`/`metronomeVolume` сохраняются, добавляется новое поле `metronomeMode`.

### 3.2. Новый плагин: `packages/plugins/instruments/metronome/`

```
packages/plugins/instruments/metronome/
  package.json                # deps: @jazz/music-core, @jazz/plugin-sdk, @jazz/shared
  src/
    index.ts                  # definePlugin({ contributes: { instruments: [...], routes: [...] } })
    manifest.ts               # InstrumentManifest: id='metronome', createInstrument, sampleManifest, defaultSettings
    sampleRegistry.ts         # MetronomeSound → velocity-layer → [rr filenames] (8 звуков)
    settings/                 # UI-компонент настроек метронома
      MetronomeSettings.tsx   # выбор звуков (strong/strong2/weak), громкость, режим
    manifest.test.ts          # resolveInstrumentDefaults + smoke-тест манифеста
```

### 3.3. Расширение палитры звуков: 8 звуков

Добавляем 3 звука из funk-drum-kit к существующим 5:

| # | ID | Название | Источник |
|---|----|----------|----------|
| 1 | `analog-metronome` | Analog Metronome | текущий `metronome/` |
| 2 | `button-click` | Button Click | текущий `metronome/` |
| 3 | `drum-stick` | Drum Stick | текущий `metronome/` |
| 4 | `retro-stick` | Retro Stick | текущий `metronome/` |
| 5 | `switch` | Switch | текущий `metronome/` |
| 6 | `cross-stick` | Cross-Stick (Rim Click) | `funk-drum-kit`: `mid_snare_crossstick` |
| 7 | `hh-chick` | Hi-Hat Foot Chick | `funk-drum-kit`: `mid_hh_pedal` |
| 8 | `hh-closed` | Hi-Hat Closed | `funk-drum-kit`: `mid_hh_closed` |

**Важно:** Звуки 6–8 — те же `.m4a`-файлы из деплоя funk-drum-kit. Новых сэмплов не требуется. Плагин `metronome` ссылается на те же URL: `/samples/aac/drums/modern-kit/...` (после миграции funk на новый SampleManifest — см. DRUMS-VISION.md).

Тип `ClickSound` расширяется:

```ts
// shared/src/constants.ts
export const CLICK_SOUNDS = [
  'analog-metronome',
  'button-click',
  'drum-stick',
  'retro-stick',
  'switch',
  'cross-stick',    // ← новый
  'hh-chick',       // ← новый
  'hh-closed',      // ← новый
] as const;
```

### 3.4. Новый параметр: `metronomeMode`

```ts
// shared/src/constants.ts
export const METRONOME_MODES = ['both', 'pickup-only', 'main-only'] as const;
export type MetronomeMode = (typeof METRONOME_MODES)[number];
```

Добавляется в `UserSettingsDTO`:

```ts
metronomeMode: z.enum(METRONOME_MODES).default('both'),
```

| Режим | Поведение затакта | Поведение основных тактов |
|-------|------------------|--------------------------|
| `'both'` | 🔈 клики | 🔈 клики |
| `'pickup-only'` | 🔈 клики | 🔇 тишина |
| `'main-only'` | 🔇 тишина | 🔈 клики |

**Логика в `useTransport.ts`:**

- `scheduleClick` проверяет: если `metronomeMode === 'pickup-only'` → пропускаем клики в основных тактах (после старта транспорта)
- Count-in проверяет: если `metronomeMode === 'main-only'` → пропускаем клики в затакте
- `metronomeMode === 'both'` → текущее поведение

### 3.5. Интеграция с `TransportEngine` (без изменений ядра)

`MetronomeInstrument` **не меняется**. Вся новая логика — в `ClickSink` (колбэк в `useTransport.ts`) и в count-in-коде:

```ts
// useTransport.ts — псевдокод новой логики
const sink = (atTicks: number, beatType: BeatType, isPickup: boolean) => {
  const mode = optsRef.current.settings.metronomeMode ?? 'both';
  if (mode === 'pickup-only' && !isPickup) return;   // основные такты — без кликов
  if (mode === 'main-only' && isPickup) return;       // затакт — без кликов
  // ... рендеринг клика
};
```

**Альтернатива (более чистая):** Создать два экземпляра `MetronomeInstrument`:
- Один для затакта (всегда `metronomeMode !== 'main-only'`)
- Один для основных тактов (всегда `metronomeMode !== 'pickup-only'`)

Это позволяет использовать `activeBeats` и другие настройки `MetronomeOptions` без дублирования логики в sink'е. **Рекомендуемый подход.**

### 3.6. SampleManifest для метронома

```ts
// plugins/instruments/metronome/src/sampleRegistry.ts
export const metronomeSampleManifest: SampleManifest = {
  type: 'unpitched',
  oneshots: {
    'analog-metronome': ['analog-metronome.m4a'],
    'button-click':     ['button-click.m4a'],
    'drum-stick':       ['drum-stick.m4a'],
    'retro-stick':      ['retro-stick.m4a'],
    'switch':           ['switch.m4a'],
    'cross-stick':      ['mid_snare_crossstick_vl8_rr1.m4a'],   // из funk-drum-kit
    'hh-chick':         ['mid_hh_pedal_vl2_rr1.m4a'],           // из funk-drum-kit
    'hh-closed':        ['mid_hh_closed_vl3_rr1.m4a'],          // из funk-drum-kit
  },
  rrCount: 1,
};
```

**Уточнение:** Конкретные имена файлов funk-drum-kit зависят от результата DRUMS-VISION (миграция на новый `SampleManifest`). Здесь указаны примерные имена — финальные будут после Этапа 4 DRUMS-VISION.

### 3.7. InstrumentManifest

```ts
// plugins/instruments/metronome/src/manifest.ts
export const metronomeManifest: InstrumentManifest = {
  id: 'metronome',
  name: 'Метроном',
  createInstrument: () => new MetronomeInstrument(),
  sampleManifest: metronomeSampleManifest,
  defaultSettings: {
    clickStrong: 'drum-stick',
    clickStrong2: 'drum-stick',
    clickWeak: 'drum-stick',
    metronomeEnabled: true,
    metronomeVolume: 0.8,
    metronomeMode: 'both',
    metronomeStrongEnabled: true,
    metronomeStrongVolume: 0.8,
    metronomeStrong2Enabled: true,
    metronomeStrong2Volume: 0.8,
    metronomeWeakEnabled: true,
    metronomeWeakVolume: 0.8,
  },
};
```

### 3.8. UI: компонент настроек

Новый компонент `MetronomeSettings` в плагине, подключается через `contributes.routes` как подстраница настроек (или как секция в существующих настройках аранжировки).

**Элементы UI:**

| Элемент | Тип | Описание |
|---------|-----|----------|
| Режим метронома | Select | `both` / `pickup-only` / `main-only` |
| — | — | — |
| **Сильная доля (beat 1)** | | |
| Вкл/Выкл | Toggle | `metronomeStrongEnabled` — проигрывать ли клик на сильной доле |
| Звук | Select (8 опций) + предпрослушивание | `clickStrong` |
| Громкость | Slider 0–1 | `metronomeStrongVolume` — независимая громкость сильной доли |
| — | — | — |
| **Вторая сильная доля (beat 3)** | | |
| Вкл/Выкл | Toggle | `metronomeStrong2Enabled` — проигрывать ли клик на второй сильной доле |
| Звук | Select (8 опций) + предпрослушивание | `clickStrong2` |
| Громкость | Slider 0–1 | `metronomeStrong2Volume` — независимая громкость второй сильной доли |
| — | — | — |
| **Слабая доля (beats 2, 4)** | | |
| Вкл/Выкл | Toggle | `metronomeWeakEnabled` — проигрывать ли клик на слабых долях |
| Звук | Select (8 опций) + предпрослушивание | `clickWeak` |
| Громкость | Slider 0–1 | `metronomeWeakVolume` — независимая громкость слабых долей |
| — | — | — |
| **Общее** | | |
| Общая громкость | Slider 0–1 | `metronomeVolume` — мастер-громкость (умножается на per-beat громкость) |

**Логика громкости:** итоговая громкость клика = `metronomeVolume × metronome{Beat}Volume`. При выключенном toggle'е (`metronome{Beat}Enabled = false`) клик не проигрывается независимо от остальных настроек.

**Предпрослушивание:** При клике на звук в select'е — проигрывается одиночный сэмпл через `Tone.Player` (без Transport) с текущей громкостью этой доли.

**Новые поля DTO:**

```ts
// shared/src/dto.ts — расширение UserSettingsDTOSchema
metronomeStrongEnabled: z.boolean().default(true),
metronomeStrongVolume: z.number().min(0).max(1).default(0.8),
metronomeStrong2Enabled: z.boolean().default(true),
metronomeStrong2Volume: z.number().min(0).max(1).default(0.8),
metronomeWeakEnabled: z.boolean().default(true),
metronomeWeakVolume: z.number().min(0).max(1).default(0.8),
metronomeMode: z.enum(METRONOME_MODES).default('both'),
```

**Логика в ClickSink (useTransport.ts):**

```ts
const sink = (atTicks: number, beatType: BeatType, isPickup: boolean) => {
  const s = optsRef.current.settings;
  const mode = s.metronomeMode ?? 'both';

  // Режим: фильтр по затакту/тактам
  if (mode === 'pickup-only' && !isPickup) return;
  if (mode === 'main-only' && isPickup) return;

  // Per-beat фильтр: включена ли эта доля
  if (beatType === 'strong' && !(s.metronomeStrongEnabled ?? true)) return;
  if (beatType === 'strong2' && !(s.metronomeStrong2Enabled ?? true)) return;
  if (beatType === 'weak' && !(s.metronomeWeakEnabled ?? true)) return;

  // Выбор звука и per-beat громкости
  let sound: ClickSound | null = null;
  let volumeDb = 0;
  if (beatType === 'strong') {
    sound = s.clickStrong;
    volumeDb = Tone.gainToDb((s.metronomeVolume ?? 0.8) * (s.metronomeStrongVolume ?? 0.8));
  } else if (beatType === 'strong2') {
    sound = s.clickStrong2;
    volumeDb = Tone.gainToDb((s.metronomeVolume ?? 0.8) * (s.metronomeStrong2Volume ?? 0.8));
  } else {
    sound = s.clickWeak;
    volumeDb = Tone.gainToDb((s.metronomeVolume ?? 0.8) * (s.metronomeWeakVolume ?? 0.8));
  }

  if (!sound) return;
  const player = playersRef.current.get(sound);
  if (!player?.loaded) return;

  tone.scheduleOnce((time: number) => {
    player!.volume.value = volumeDb;
    player!.start(time);
  }, `${atTicks}i`);
};
```

### 3.9. Миграция `useTransport.ts`

**Что меняется:**

1. Удаляется хардкод `new MetronomeInstrument()` — создаётся через `manifest.createInstrument()` из реестра
2. Удаляются 3 хардкодных `Tone.Player` (`strongPlayer`, `strong2Player`, `weakPlayer`) — заменяются на **один** `Tone.Players` (map `ClickSound → Player`)
3. `ClickSink` получает `metronomeMode` и управляет включением/выключением
4. Count-in учитывает `metronomeMode`

**Что НЕ меняется:**
- `MetronomeInstrument` (ядро)
- `TransportEngine` (ядро)
- `ScheduleContext.scheduleClick` (контракт)

### 3.10. Стиле-независимость

Метроном **глобален** — не имеет `perStyleDefaults`. Звуки и громкость не зависят от выбранного стиля. Это осознанное решение: метроном — утилита музыканта, а не элемент аранжировки.

## 4. Улучшения существующих функций

### 4.1. Расширение `ClickSound`

Добавить 3 новых значения в `CLICK_SOUNDS` (shared/constants.ts) и соответствующие записи в `METRONOME_SAMPLES` (music-core).

### 4.2. Новое поле `metronomeMode` в DTO

Добавить `metronomeMode` в `UserSettingsDTOSchema` (shared/dto.ts), схему БД (apps/api), миграцию, seed.

### 4.3. Миграция `useTransport.ts`

Пошагово:
1. Импорт манифеста из `@jazz/plugin-metronome` вместо хардкода
2. Создание `MetronomeInstrument` через `manifest.createInstrument()`
3. Замена 3 плееров на `Map<ClickSound, Tone.Player>` (8 записей)
4. Интеграция `metronomeMode` в `ClickSink` и count-in

### 4.4. Регистрация плагина

Добавить `import metronomePlugin from '@jazz/plugin-metronome'` в `plugin-registry/src/index.ts` и алиасы в `vite.config.ts`, `tsconfig.base.json`, `vitest.config.ts`.

## 5. Не войдёт в эту версию (Out of Scope)

- Затакт с партией других инструментов (pickup-нота баса, drum fill) — архитектурно сложно, не приоритетно
- Per-style настройки метронома (разные звуки для swing vs funk)
- Визуальная индикация метронома (пульсирующая иконка/лампочка) — уже есть в плеере, не меняется
- MIDI-вывод метронома (click на внешнее устройство)
- Автоматическое определение темпа по tapping
- Поддержка нестандартных размеров (5/4, 7/8) в настройках долей — уже работает через `defaultStrongBeats()`

## 6. Риски и допущения

| Риск | Вероятность | Влияние | Митигация |
|------|------------|---------|-----------|
| Файлы funk-drum-kit недоступны после миграции DRUMS-VISION | Средняя | Среднее | Дождаться Этапа 4 DRUMS-VISION; временно использовать текущие URL funk-кита |
| `MetronomeMode` требует миграции БД | Низкая | Низкое | Добавить с `default('both')` — обратная совместимость |
| Увеличение числа `Tone.Player` с 3 до 8 | Низкая | Низкое | 8 плееров × ~50KB = 400KB памяти, некритично |
| Конфликт с `useTransport.ts` при параллельной разработке | Средняя | Среднее | Координировать с командой; этот файл уже меняется редко |

**Допущения:**
- `[assumption]` DRUMS-VISION будет завершён до или параллельно — имена файлов funk-drum-kit в новом `SampleManifest` стабильны
- `[assumption]` Метроном не требует round-robin (один сэмпл на звук достаточно)
- `[assumption]` Пользователи не ожидают per-style звуков метронома — глобальные настройки удовлетворительны

## 7. Метрики успеха

| Метрика | Цель | Как измерить |
|---------|------|-------------|
| Режимы метронома работают | 3 режима (`both`, `pickup-only`, `main-only`) проходят e2e-тест | Playwright: включить режим → проверить наличие/отсутствие кликов |
| 8 звуков доступны | Все 8 опций в select'е, каждый проигрывается | Ручное тестирование + unit-тест `METRONOME_SAMPLE_BY_ID` |
| Обратная совместимость | Существующие настройки пользователей не ломаются | `default('both')` — поведение идентично текущему |
| Плагин изолирован | Метроном не импортирует другие плагины | ESLint boundaries |
| Ядро не затронуто | `MetronomeInstrument` без изменений | Git diff по `music-core/src/audio/instrument.ts` = пусто |
| Количество тестов | ≥ 5 новых тестов | `manifest.test.ts` + `metronomeMode.test.ts` |

## 8. План реализации (краткий)

| Этап | Описание | Сложность | Зависимости |
|------|----------|-----------|-------------|
| 1. Расширить `ClickSound` | +3 значения в constants.ts, +3 в sampleRegistry | XS | — |
| 2. Добавить `metronomeMode` | DTO, схема БД, миграция, seed | S | Этап 1 |
| 3. Создать плагин | `packages/plugins/instruments/metronome/` со структурой по §3.2 | M | Этап 2 |
| 4. UI-компонент | `MetronomeSettings.tsx` | M | Этап 3 |
| 5. Миграция useTransport | `manifest.createInstrument()`, `metronomeMode`, 8-Player map | M | Этап 4 |
| 6. Регистрация + алиасы | plugin-registry, vite, tsconfig, vitest | XS | Этап 3 |
| 7. Тесты | unit + e2e | S | Этап 5 |
| 8. Документация | Обновить FUNCTIONS.md, ARCHITECTURE_BASE.md | XS | Этап 7 |

**Оценка суммарной сложности:** M (средняя). ~3–5 дней разработки.

---

*Документ создан 2026-07-09. Версия 1.0 — первичное видение. Требует ревью и подтверждения перед переходом к PLAN.*
