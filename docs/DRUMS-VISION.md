# DRUMS-VISION — Рефакторинг джазовых и фанковых барабанов

> **Дата:** 2026-07-02
> **Версия:** 1.2
> **Статус:** 🟢 Реализовано (Jazz Kit + Funk Kit — плагины, multi-velocity, артикуляции)
> **Приоритет:** Jazz Kit первым ✅, Funk Kit вторым ✅

## 1. Резюме

**Проблема:** Текущая реализация барабанов (Swirly Drums v2 и Modern Kit) использует single-velocity сэмплы (одна громкость на звук) без артикуляционных вариантов (buzz, flam, rimshot, crossstick, edge, dig, bell, stir). Это ограничивает выразительность: нельзя сыграть ghost-note, акцент, buzz-roll или flam. Funk-паттерн «плоский» без динамических нюансов, jazz-компинг лишён текстуры stir (щётка по хай-хэту).

**Цель:** Построить избыточную структуру папок и MIDI-привязку для двух наборов барабанов — джазового (Swirly.Drums_1104) и фанкового (virtuosity-drums) — с многослойной велосити и артикуляциями, но **умеренно компактную**: без излишних слоёв, оптимальную по качество/размер.

**Горизонт:** Новые `InstrumentManifest` (`jazz-drum-kit` — "Jazz Drum Kit" и `funk-drum-kit` — "Funk Drum Kit"), переиспользующие `DrumInstrument` с расширенной логикой выбора артикуляции по velocity + жанровому контексту.

**Порядок:** Сначала Jazz Kit, затем Funk Kit.

## 2. Текущее состояние (as-is)

### 2.1. Архитектура

```
DrumInstrument          ← единый класс для всех китов
  ├── schedule(style)   ← swing | bossa | funk
  ├── DrumRandomizer    ← fills, ghost-notes, ride variation
  └── DrumSampleRegistry ← oneshots: { sound → [4 RR файла] }

InstrumentManifest      ← drumsManifest / modernKitManifest
  └── SampleManifest.oneshots  ← плоский словарь, нет velocity-слоёв
```

**Ограничения:**
- `SampleManifest.oneshots` — `Record<string, string[]>` — не поддерживает velocity-слои. Звук выбирается по имени, velocity игнорируется.
- `DrumInstrumentSettings` — per-sound enable/volume, но нет выбора артикуляции.
- Тип `DrumSound` — 10 фиксированных имён, без артикуляций.

### 2.2. Swirly Drums v2 (deployed)

| Параметр | Значение |
|----------|----------|
| Звуков | 8 (bassDrum, snare, hihat, hihatHalf, hihatOpen, ride, crash, rim) |
| Velocity-слоёв | 1 (один файл на звук, например `bd_vl5` — взят 5-й слой из ~20) |
| Round-robin | 4 |
| Томы | нет (пустые массивы) |
| Формат | AAC `.m4a` (с MP3-фолбэком) |
| Путь | `apps/web/public/samples/aac/drums/swirly/` |

**Важно:** В именах файлов Swirly v2 видны следы исходной многослойности: `bd_vl5_rr1.m4a`, `ride_vl6_rr1.m4a`. Это означает, что полная библиотека Swirly Drums (версия 1104) содержит **до 20 velocity-слоёв** на звук (`vl1`–`vl20`). Для деплоя был выбран один срез. Новый Jazz Kit должен использовать 5 слоёв из 20.

### 2.3. Modern Kit (deployed)

| Параметр | Значение |
|----------|----------|
| Звуков | 10 (+highTom, +lowTom) |
| Velocity-слоёв | 1 |
| Round-robin | 4 |
| Формат | AAC `.m4a` |
| Путь | `apps/web/public/samples/aac/drums/modern-kit/` |

### 2.4. Файлы `_source`

| Набор | Путь | Состояние |
|-------|------|-----------|
| Swirly.Drums_1104 | `_source/drums/Swirly.Drums_1104/` | **Только структура папок** (12 папок-артикуляций). Исходные WAV/FLAC — вне репозитория. Полная библиотека имеет vl1–vl20. |
| virtuosity-drums | `_source/drums/virtuosity-drums/` | **FLAC/WAV-файлы**, много velocity-слоёв и артикуляций |
| unruly-drums | `_source/drums/unruly-drums/` | Пусто |

## 3. Анализ исходных материалов

### 3.1. Swirly.Drums_1104 — структура папок

```
Swirly.Drums_1104/     (12 артикуляций — папки как референс-структура)
├── kick/              — bass drum (vl1–vl20 в исходной библиотеке)
├── snare_main/        — центр мембраны (vl1–vl20)
├── snare_edge/        — край мембраны / crossstick
├── snare_dig/         — press roll / digging
├── hat_closed/        — закрытый хай-хэт
├── hat_open/          — открытый хай-хэт
├── hat_foot/          — педаль хай-хэта (chick)
├── stir/              — ⭐ stir (джазовая текстура — вращение щётки по хай-хэту)
├── ride/              — тарелка ride (bow)
├── crash/             — crash-тарелка
├── splash/            — splash-тарелка
├── tom_mlow/          — средний/низкий том
└── tom_mhi/           — средний/высокий том
```

**Вывод:** Swirly.Drums_1104 — полноценная джазовая установка с расширенным набором артикуляций: 3 варианта snare (main, edge, dig), уникальный джазовый **stir** (brush-текстура), splash, 2 тома. Исходная библиотека содержит до 20 velocity-слоёв на звук (судя по `bd_vl5`, `ride_vl6` в деплое). Это значительно богаче текущего Swirly v2.

### 3.2. virtuosity-drums — анализ файлов

#### kick/ (24 WAV-файла)
| Параметр | Значение |
|----------|----------|
| Velocity-слоёв | 6 (`vl1`–`vl6`) |
| Round-robin | 4 (`rr1`–`rr4`) |
| Формат | WAV |
| Именование | `ks_vl{1-6}_rr{1-4}.wav` |

#### snare/ (6 артикуляций, 108+ FLAC-файлов)
| Артикуляция | Velocity-слоёв | Файлов | Назначение |
|-------------|---------------|--------|------------|
| `mid_snare_center` | 36 (`vl1`–`vl36`) | 36 | Основной удар по центру |
| `mid_snare_buzz` | 12 (`vl1`–`vl12`) | 12 | ⭐ Buzz-roll (press roll) — фанк |
| `mid_snare_crossstick` | 16 (`vl1`–`vl16`) | 16 | Cross-stick / rim-click |
| `mid_snare_flam` | 12 (`vl1`–`vl12`) | 12 | ⭐ Flam (форшлаг) — фанк |
| `mid_snare_muted` | 16 (`vl1`–`vl16`) | 16 | Muted snare (глухой) |
| `mid_snare_rimshot` | 12 (`vl1`–`vl12`) | 12 | Rimshot (обод+центр) — фанк |

#### hh/ (4 артикуляции, 72 FLAC-файла)
| Артикуляция | Vel-слоёв | RR | Файлов | Назначение |
|-------------|----------|-----|--------|------------|
| `mid_hh_closed` | 4 | 4 | 16 | Закрытый хай-хэт |
| `mid_hh_open` | 4 | ~3 | 11 | Открытый хай-хэт |
| `mid_hh_pedal` | 3 | 4 | 12 | Педаль (foot chick) |
| `mid_hh_34` | 4 | 4 | 16 | 3/4-открытый — ❌ удалён (не нужен) |

#### ride/ (2 артикуляции, 21 FLAC-файл)
| Артикуляция | Vel-слоёв | RR | Файлов | Назначение |
|-------------|----------|-----|--------|------------|
| `mid_ride_ride` | 4 | 4 | 16 | Ride bow (основной) |
| `mid_ride_bell` | 3 | 3 | 9 | ⭐ Ride bell (купольный) — фанк |

#### crash/ (2 артикуляции, 24 FLAC-файла)
| Артикуляция | Vel-слоёв | RR | Файлов | Назначение |
|-------------|----------|-----|--------|------------|
| `mid_crash_crash` | 3 | 4 | 12 | Основной crash |
| `mid_crash_sizzle` | 3 | 4 | 12 | ⭐ Sizzle crash (с цепочкой) — фанк |

#### htom/ (высокий том)
16 velocity-слоёв (`vl1`–`vl16`), 16 FLAC-файлов, без RR.

#### ltom/ (низкий том)
11 из 16 velocity-слоёв: vl2–vl9, vl14–vl16. Отсутствуют vl1, vl10–vl13. Без RR.

### 3.3. Сводная таблица — virtuosity-drums

| Звук | Артикуляций | Всего файлов | Слоёв | RR | Формат |
|------|------------|-------------|-------|-----|--------|
| Kick | 1 | 24 | 6 vel | 4 | WAV |
| Snare | 6 | 108+ | 12–36 vel | 1 (эмулируем) | FLAC |
| Hi-hat | 3 (без 3/4) | ~56 | 3–4 vel | 3–4 | FLAC |
| Ride | 2 | 25 | 3–4 vel | 3–4 | FLAC |
| Crash | 2 | 24 | 3 vel | 4 | FLAC |
| High tom | 1 | 16 | 16 vel | 1 | FLAC |
| Low tom | 1 | 11 | 11/16 | 1 | FLAC |

**Ключевой инсайт:** virtuosity-drums — это **фанковый кит**: 6 (!) snare-артикуляций включая buzz и flam, 2 crash-артикуляции (crash + sizzle), 2 ride-вариации (bow + bell), но без джазового stir. Идеально для фанка/R&B.

## 4. Предлагаемая архитектура

### 4.1. Принципы

1. **Velocity-слои в `SampleManifest`** — расширить через новое поле `velocityOneshots` (или вложенную структуру в `oneshots`): `{ [sound_articulation]: { [velLayer]: [rr-files] } }`.
2. **Артикуляции как часть имени звука** — `DrumSound` расширяется: `'snare_center'`, `'snare_buzz'`, `'snare_flam'`, `'ride_bell'`, `'crash_sizzle'`, `'hihat_stir'` и т.д.
3. **Выбор артикуляции по velocity + контексту стиля**:
   - Низкая velocity → ghost / buzz / stir / muted
   - Средняя → center / closed / bow
   - Высокая → rimshot / edge / bell / open
   - Flam — специальный вероятностный триггер
4. **Формат:** FLAC (source) → AAC `.m4a` (web), с MP3-фолбэком.
5. **Умеренная компактность:**
   - Основные звуки (kick, snare_center, hihat_closed, ride_bow): **5 velocity-слоёв** для Jazz (из vl1–vl20), **3–5 слоёв** для Funk (из имеющихся)
   - Артикуляции: 2–3 слоя
   - Текстурные (stir): 1 слой
   - 4 round-robin на слой
6. **GM MIDI-привязка** — стандартные ноты General MIDI Percussion, плюс зарезервированные для нестандартных артикуляций.

### 4.2. Структура папок для Jazz Kit (Swirly.Drums_1104)

**Исходные данные:** Swirly Drums v2 (деплой) собран из одного среза полной библиотеки Swirly.Drums_1104. Для рефакторинга берём **5 velocity-слоёв** из диапазона vl1–vl20: `vl1` (pp), `vl5` (p), `vl10` (mf), `vl15` (f), `vl20` (ff). Слой `vl5` уже есть в деплое для kick и ride — используем как точку отсчёта.

```
samples/aac/drums/jazz-drum-kit/
├── kick/
│   ├── kick_vl1_rr1.m4a    (pp)   ← из исходной библиотеки vl1
│   ├── kick_vl1_rr2.m4a
│   ├── kick_vl1_rr3.m4a
│   ├── kick_vl1_rr4.m4a
│   ├── kick_vl5_rr1.m4a    (p)    ← уже есть в деплое
│   ├── kick_vl5_rr2.m4a
│   ├── kick_vl5_rr3.m4a
│   ├── kick_vl5_rr4.m4a
│   ├── kick_vl10_rr1.m4a   (mf)
│   ├── kick_vl10_rr2.m4a
│   ├── kick_vl10_rr3.m4a
│   ├── kick_vl10_rr4.m4a
│   ├── kick_vl15_rr1.m4a   (f)
│   ├── kick_vl15_rr2.m4a
│   ├── kick_vl15_rr3.m4a
│   ├── kick_vl15_rr4.m4a
│   ├── kick_vl20_rr1.m4a   (ff)
│   ├── kick_vl20_rr2.m4a
│   ├── kick_vl20_rr3.m4a
│   └── kick_vl20_rr4.m4a
│
├── snare/
│   ├── center_vl1_rr1.m4a   (pp ghost)
│   ├── center_vl1_rr2.m4a
│   ├── center_vl1_rr3.m4a
│   ├── center_vl1_rr4.m4a
│   ├── center_vl5_rr1.m4a   (p)
│   ├── center_vl5_rr2.m4a
│   ├── center_vl5_rr3.m4a
│   ├── center_vl5_rr4.m4a
│   ├── center_vl10_rr1.m4a  (mf backbeat)
│   ├── center_vl10_rr2.m4a
│   ├── center_vl10_rr3.m4a
│   ├── center_vl10_rr4.m4a
│   ├── center_vl15_rr1.m4a  (f)
│   ├── center_vl15_rr2.m4a
│   ├── center_vl15_rr3.m4a
│   ├── center_vl15_rr4.m4a
│   ├── center_vl20_rr1.m4a  (ff accent)
│   ├── center_vl20_rr2.m4a
│   ├── center_vl20_rr3.m4a
│   ├── center_vl20_rr4.m4a
│   │
│   ├── edge_vl1_rr1.m4a     (crossstick pp)
│   ├── edge_vl1_rr2.m4a
│   ├── edge_vl1_rr3.m4a
│   ├── edge_vl1_rr4.m4a
│   ├── edge_vl10_rr1.m4a    (crossstick mf)
│   ├── edge_vl10_rr2.m4a
│   ├── edge_vl10_rr3.m4a
│   ├── edge_vl10_rr4.m4a
│   ├── edge_vl20_rr1.m4a    (crossstick ff)
│   ├── edge_vl20_rr2.m4a
│   ├── edge_vl20_rr3.m4a
│   ├── edge_vl20_rr4.m4a
│   │
│   ├── dig_vl1_rr1.m4a      (press roll pp)
│   ├── dig_vl1_rr2.m4a
│   ├── dig_vl1_rr3.m4a
│   ├── dig_vl1_rr4.m4a
│   ├── dig_vl10_rr1.m4a     (press roll mf)
│   ├── dig_vl10_rr2.m4a
│   ├── dig_vl10_rr3.m4a
│   ├── dig_vl10_rr4.m4a
│   ├── dig_vl20_rr1.m4a     (press roll ff)
│   ├── dig_vl20_rr2.m4a
│   ├── dig_vl20_rr3.m4a
│   └── dig_vl20_rr4.m4a
│
├── hihat/
│   ├── closed_vl1_rr1.m4a   (pp)
│   ├── closed_vl1_rr2.m4a
│   ├── closed_vl1_rr3.m4a
│   ├── closed_vl1_rr4.m4a
│   ├── closed_vl5_rr1.m4a   (p)
│   ├── closed_vl5_rr2.m4a
│   ├── closed_vl5_rr3.m4a
│   ├── closed_vl5_rr4.m4a
│   ├── closed_vl10_rr1.m4a  (mf)
│   ├── closed_vl10_rr2.m4a
│   ├── closed_vl10_rr3.m4a
│   ├── closed_vl10_rr4.m4a
│   ├── closed_vl15_rr1.m4a  (f)
│   ├── closed_vl15_rr2.m4a
│   ├── closed_vl15_rr3.m4a
│   ├── closed_vl15_rr4.m4a
│   ├── closed_vl20_rr1.m4a  (ff)
│   ├── closed_vl20_rr2.m4a
│   ├── closed_vl20_rr3.m4a
│   ├── closed_vl20_rr4.m4a
│   │
│   ├── open_vl1_rr1.m4a     (pp)
│   ├── open_vl1_rr2.m4a
│   ├── open_vl1_rr3.m4a
│   ├── open_vl1_rr4.m4a
│   ├── open_vl10_rr1.m4a    (mf)
│   ├── open_vl10_rr2.m4a
│   ├── open_vl10_rr3.m4a
│   ├── open_vl10_rr4.m4a
│   ├── open_vl20_rr1.m4a    (ff)
│   ├── open_vl20_rr2.m4a
│   ├── open_vl20_rr3.m4a
│   ├── open_vl20_rr4.m4a
│   │
│   ├── foot_vl1_rr1.m4a     (chick pp)
│   ├── foot_vl1_rr2.m4a
│   ├── foot_vl1_rr3.m4a
│   ├── foot_vl1_rr4.m4a
│   ├── foot_vl10_rr1.m4a    (chick mf)
│   ├── foot_vl10_rr2.m4a
│   ├── foot_vl10_rr3.m4a
│   ├── foot_vl10_rr4.m4a
│   ├── foot_vl20_rr1.m4a    (chick ff)
│   ├── foot_vl20_rr2.m4a
│   ├── foot_vl20_rr3.m4a
│   ├── foot_vl20_rr4.m4a
│   │
│   ├── stir_rr1.m4a         (⭐ brush stir — 1 vel, 4 RR)
│   ├── stir_rr2.m4a
│   ├── stir_rr3.m4a
│   └── stir_rr4.m4a
│
├── ride/
│   ├── bow_vl1_rr1.m4a      (pp)
│   ├── bow_vl1_rr2.m4a
│   ├── bow_vl1_rr3.m4a
│   ├── bow_vl1_rr4.m4a
│   ├── bow_vl5_rr1.m4a      (p)
│   ├── bow_vl5_rr2.m4a
│   ├── bow_vl5_rr3.m4a
│   ├── bow_vl5_rr4.m4a
│   ├── bow_vl10_rr1.m4a     (mf)
│   ├── bow_vl10_rr2.m4a
│   ├── bow_vl10_rr3.m4a
│   ├── bow_vl10_rr4.m4a
│   ├── bow_vl15_rr1.m4a     (f)
│   ├── bow_vl15_rr2.m4a
│   ├── bow_vl15_rr3.m4a
│   ├── bow_vl15_rr4.m4a
│   ├── bow_vl20_rr1.m4a     (ff)
│   ├── bow_vl20_rr2.m4a
│   ├── bow_vl20_rr3.m4a
│   └── bow_vl20_rr4.m4a
│
├── crash/
│   ├── crash_vl1_rr1.m4a    (p)
│   ├── crash_vl1_rr2.m4a
│   ├── crash_vl1_rr3.m4a
│   ├── crash_vl1_rr4.m4a
│   ├── crash_vl10_rr1.m4a   (mf)
│   ├── crash_vl10_rr2.m4a
│   ├── crash_vl10_rr3.m4a
│   ├── crash_vl10_rr4.m4a
│   ├── crash_vl20_rr1.m4a   (ff)
│   ├── crash_vl20_rr2.m4a
│   ├── crash_vl20_rr3.m4a
│   └── crash_vl20_rr4.m4a
│
├── splash/
│   ├── splash_vl1_rr1.m4a   (p — 2 vel, 4 RR)
│   ├── splash_vl1_rr2.m4a
│   ├── splash_vl1_rr3.m4a
│   ├── splash_vl1_rr4.m4a
│   ├── splash_vl10_rr1.m4a  (f)
│   ├── splash_vl10_rr2.m4a
│   ├── splash_vl10_rr3.m4a
│   └── splash_vl10_rr4.m4a
│
├── tom_mlow/                (mid-low tom)
│   ├── mlow_vl1_rr1.m4a
│   ├── mlow_vl1_rr2.m4a
│   ├── mlow_vl1_rr3.m4a
│   ├── mlow_vl1_rr4.m4a
│   ├── mlow_vl10_rr1.m4a
│   ├── mlow_vl10_rr2.m4a
│   ├── mlow_vl10_rr3.m4a
│   ├── mlow_vl10_rr4.m4a
│   ├── mlow_vl20_rr1.m4a
│   ├── mlow_vl20_rr2.m4a
│   ├── mlow_vl20_rr3.m4a
│   └── mlow_vl20_rr4.m4a
│
└── tom_mhi/                 (mid-high tom)
    ├── mhi_vl1_rr1.m4a
    ├── mhi_vl1_rr2.m4a
    ├── mhi_vl1_rr3.m4a
    ├── mhi_vl1_rr4.m4a
    ├── mhi_vl10_rr1.m4a
    ├── mhi_vl10_rr2.m4a
    ├── mhi_vl10_rr3.m4a
    ├── mhi_vl10_rr4.m4a
    ├── mhi_vl20_rr1.m4a
    ├── mhi_vl20_rr2.m4a
    ├── mhi_vl20_rr3.m4a
    └── mhi_vl20_rr4.m4a
```

**Итого Jazz Kit:** ~240 файлов (12 артикуляций × слои × 4 RR).

### 4.3. Структура папок для Funk Kit (virtuosity-drums)

```
samples/aac/drums/funk-drum-kit/
├── kick/
│   ├── kick_vl1_rr1.m4a    (pp)   ← ks_vl1
│   ├── kick_vl1_rr2.m4a
│   ├── kick_vl1_rr3.m4a
│   ├── kick_vl1_rr4.m4a
│   ├── kick_vl2_rr1.m4a    (mf)   ← ks_vl3
│   ├── kick_vl2_rr2.m4a
│   ├── kick_vl2_rr3.m4a
│   ├── kick_vl2_rr4.m4a
│   ├── kick_vl3_rr1.m4a    (ff)   ← ks_vl5
│   ├── kick_vl3_rr2.m4a
│   ├── kick_vl3_rr3.m4a
│   └── kick_vl3_rr4.m4a
│
├── snare/
│   ├── center_vl1_rr1.m4a  (pp)       ← vl1
│   ├── center_vl1_rr2.m4a             ← vl2 (соседний как RR)
│   ├── center_vl1_rr3.m4a             ← vl3
│   ├── center_vl1_rr4.m4a             ← vl4
│   ├── center_vl2_rr1.m4a  (mp)       ← vl8
│   ├── center_vl2_rr2.m4a
│   ├── center_vl2_rr3.m4a
│   ├── center_vl2_rr4.m4a
│   ├── center_vl3_rr1.m4a  (mf)       ← vl18
│   ├── center_vl3_rr2.m4a
│   ├── center_vl3_rr3.m4a
│   ├── center_vl3_rr4.m4a
│   ├── center_vl4_rr1.m4a  (f)        ← vl28
│   ├── center_vl4_rr2.m4a
│   ├── center_vl4_rr3.m4a
│   ├── center_vl4_rr4.m4a
│   ├── center_vl5_rr1.m4a  (ff)       ← vl36
│   ├── center_vl5_rr2.m4a
│   ├── center_vl5_rr3.m4a
│   ├── center_vl5_rr4.m4a
│   │
│   ├── buzz_vl1_rr1.m4a    (pp)  ⭐   ← vl1
│   ├── buzz_vl1_rr2.m4a               ← vl2
│   ├── buzz_vl1_rr3.m4a               ← vl4
│   ├── buzz_vl1_rr4.m4a               ← vl5
│   ├── buzz_vl2_rr1.m4a    (mf)       ← vl6
│   ├── buzz_vl2_rr2.m4a
│   ├── buzz_vl2_rr3.m4a
│   ├── buzz_vl2_rr4.m4a
│   ├── buzz_vl3_rr1.m4a    (ff)       ← vl12
│   ├── buzz_vl3_rr2.m4a
│   ├── buzz_vl3_rr3.m4a
│   ├── buzz_vl3_rr4.m4a
│   │
│   ├── flam_vl1_rr1.m4a    (pp)  ⭐   ← vl1
│   ├── flam_vl1_rr2.m4a               ← vl2
│   ├── flam_vl1_rr3.m4a               ← vl4
│   ├── flam_vl1_rr4.m4a               ← vl5
│   ├── flam_vl2_rr1.m4a    (mf)       ← vl6
│   ├── flam_vl2_rr2.m4a
│   ├── flam_vl2_rr3.m4a
│   ├── flam_vl2_rr4.m4a
│   ├── flam_vl3_rr1.m4a    (ff)       ← vl12
│   ├── flam_vl3_rr2.m4a
│   ├── flam_vl3_rr3.m4a
│   ├── flam_vl3_rr4.m4a
│   │
│   ├── crossstick_vl1_rr1.m4a  (pp)   ← vl1
│   ├── crossstick_vl1_rr2.m4a         ← vl4
│   ├── crossstick_vl1_rr3.m4a         ← vl6
│   ├── crossstick_vl1_rr4.m4a         ← vl8
│   ├── crossstick_vl2_rr1.m4a  (f)    ← vl16
│   ├── crossstick_vl2_rr2.m4a
│   ├── crossstick_vl2_rr3.m4a
│   ├── crossstick_vl2_rr4.m4a
│   │
│   ├── muted_vl1_rr1.m4a    (pp)      ← vl1
│   ├── muted_vl1_rr2.m4a              ← vl4
│   ├── muted_vl1_rr3.m4a              ← vl6
│   ├── muted_vl1_rr4.m4a              ← vl8
│   ├── muted_vl2_rr1.m4a    (f)       ← vl16
│   ├── muted_vl2_rr2.m4a
│   ├── muted_vl2_rr3.m4a
│   ├── muted_vl2_rr4.m4a
│   │
│   ├── rimshot_vl1_rr1.m4a  (mf)  ⭐  ← vl1
│   ├── rimshot_vl1_rr2.m4a            ← vl3
│   ├── rimshot_vl1_rr3.m4a            ← vl4
│   ├── rimshot_vl1_rr4.m4a            ← vl6
│   ├── rimshot_vl2_rr1.m4a  (f)       ← vl8
│   ├── rimshot_vl2_rr2.m4a
│   ├── rimshot_vl2_rr3.m4a
│   ├── rimshot_vl2_rr4.m4a
│   ├── rimshot_vl3_rr1.m4a  (ff)      ← vl12
│   ├── rimshot_vl3_rr2.m4a
│   ├── rimshot_vl3_rr3.m4a
│   └── rimshot_vl3_rr4.m4a
│
├── hihat/
│   ├── closed_vl1_rr1.m4a   (pp)      ← vl1
│   ├── closed_vl1_rr2.m4a
│   ├── closed_vl1_rr3.m4a
│   ├── closed_vl1_rr4.m4a
│   ├── closed_vl2_rr1.m4a   (mf)      ← vl2
│   ├── closed_vl2_rr2.m4a
│   ├── closed_vl2_rr3.m4a
│   ├── closed_vl2_rr4.m4a
│   ├── closed_vl3_rr1.m4a   (ff)      ← vl4
│   ├── closed_vl3_rr2.m4a
│   ├── closed_vl3_rr3.m4a
│   ├── closed_vl3_rr4.m4a
│   │
│   ├── open_vl1_rr1.m4a     (mf)      ← vl1
│   ├── open_vl1_rr2.m4a
│   ├── open_vl1_rr3.m4a
│   ├── open_vl2_rr1.m4a     (ff)      ← vl3
│   ├── open_vl2_rr2.m4a
│   ├── open_vl2_rr3.m4a
│   │
│   ├── pedal_vl1_rr1.m4a    (pp)      ← vl1
│   ├── pedal_vl1_rr2.m4a
│   ├── pedal_vl1_rr3.m4a
│   ├── pedal_vl1_rr4.m4a
│   ├── pedal_vl2_rr1.m4a    (mf)      ← vl2
│   ├── pedal_vl2_rr2.m4a
│   ├── pedal_vl2_rr3.m4a
│   └── pedal_vl2_rr4.m4a
│
├── ride/
│   ├── bow_vl1_rr1.m4a      (pp)      ← vl1
│   ├── bow_vl1_rr2.m4a
│   ├── bow_vl1_rr3.m4a
│   ├── bow_vl1_rr4.m4a
│   ├── bow_vl2_rr1.m4a      (mf)      ← vl2
│   ├── bow_vl2_rr2.m4a
│   ├── bow_vl2_rr3.m4a
│   ├── bow_vl2_rr4.m4a
│   ├── bow_vl3_rr1.m4a      (ff)      ← vl4
│   ├── bow_vl3_rr2.m4a
│   ├── bow_vl3_rr3.m4a
│   ├── bow_vl3_rr4.m4a
│   │
│   ├── bell_vl1_rr1.m4a     (pp)  ⭐  ← vl1
│   ├── bell_vl1_rr2.m4a
│   ├── bell_vl1_rr3.m4a
│   ├── bell_vl2_rr1.m4a     (mf)      ← vl2
│   ├── bell_vl2_rr2.m4a
│   ├── bell_vl2_rr3.m4a
│   ├── bell_vl3_rr1.m4a     (ff)      ← vl3
│   ├── bell_vl3_rr2.m4a
│   └── bell_vl3_rr3.m4a
│
├── crash/
│   ├── crash_vl1_rr1.m4a    (pp)      ← mid_crash_crash vl1
│   ├── crash_vl1_rr2.m4a
│   ├── crash_vl1_rr3.m4a
│   ├── crash_vl1_rr4.m4a
│   ├── crash_vl2_rr1.m4a    (mf)      ← vl2
│   ├── crash_vl2_rr2.m4a
│   ├── crash_vl2_rr3.m4a
│   ├── crash_vl2_rr4.m4a
│   ├── crash_vl3_rr1.m4a    (ff)      ← vl3
│   ├── crash_vl3_rr2.m4a
│   ├── crash_vl3_rr3.m4a
│   ├── crash_vl3_rr4.m4a
│   │
│   ├── sizzle_vl1_rr1.m4a   (pp)  ⭐  ← mid_crash_sizzle vl1
│   ├── sizzle_vl1_rr2.m4a
│   ├── sizzle_vl1_rr3.m4a
│   ├── sizzle_vl1_rr4.m4a
│   ├── sizzle_vl2_rr1.m4a   (mf)      ← vl2
│   ├── sizzle_vl2_rr2.m4a
│   ├── sizzle_vl2_rr3.m4a
│   ├── sizzle_vl2_rr4.m4a
│   ├── sizzle_vl3_rr1.m4a   (ff)      ← vl3
│   ├── sizzle_vl3_rr2.m4a
│   ├── sizzle_vl3_rr3.m4a
│   └── sizzle_vl3_rr4.m4a
│
├── tom_hi/                  (high tom)
│   ├── htom_vl1.m4a         (pp)      ← vl1
│   ├── htom_vl2.m4a         (mf)      ← vl8
│   └── htom_vl3.m4a         (ff)      ← vl16
│
└── tom_lo/                  (low tom)
    ├── ltom_vl1.m4a         (pp)      ← vl2 (vl1 отсутствует)
    ├── ltom_vl2.m4a         (mf)      ← vl8
    └── ltom_vl3.m4a         (ff)      ← vl16
```

**Итого Funk Kit:** ~250 файлов (snare-артикуляции — основная масса).

## 5. MIDI-ноты (General MIDI Percussion Map)

### 5.1. Общая карта — Jazz & Funk

| MIDI № | Нота | Звук | Jazz Kit | Funk Kit | Примечание |
|--------|------|------|----------|----------|------------|
| **27** | **D#1** | **Stir (brush)** | ✅ hihat_stir | — | ⭐ Джазовая текстура щёткой |
| 28 | E1 | Snare Buzz | — | ✅ snare_buzz | ⭐ Buzz-roll |
| 29 | F1 | Snare Flam | — | ✅ snare_flam | ⭐ Flam-триггер |
| 30 | F#1 | Snare Rimshot | — | ✅ snare_rimshot | ⭐ Акцентный rimshot |
| 31 | G1 | Snare Dig | ✅ snare_dig | — | Press roll |
| 32 | G#1 | Snare Edge | ✅ snare_edge | — | Crossstick / edge |
| 33 | A1 | Snare Crossstick | — | ✅ snare_crossstick | Cross-stick |
| 34 | A#1 | Snare Muted | — | ✅ snare_muted | Глухой snare |
| 35 | B1 | (резерв) | — | — | |
| **36** | **C2** | **Kick** | ✅ kick | ✅ kick | Основной bass drum |
| 37 | C#2 | Side Stick / Rim | (через edge) | (через crossstick) | Дубль через артикуляцию |
| **38** | **D2** | **Snare (center)** | ✅ snare_center | ✅ snare_center | Основной малый |
| 39 | D#2 | Hand Clap | — | — | (future) |
| 40 | E2 | Electric Snare | — | — | (не используем) |
| **41** | **F2** | **Low Floor Tom** | ✅ tom_mlow | ✅ tom_lo | Низкий том |
| **42** | **F#2** | **Closed Hi-hat** | ✅ hihat_closed | ✅ hihat_closed | Закрытый хай-хэт |
| **43** | **G2** | **High Floor Tom** | ✅ tom_mhi | ✅ tom_hi | Высокий том |
| 44 | G#2 | Pedal Hi-hat | ✅ hihat_foot | ✅ hihat_pedal | Педаль хай-хэта |
| 45 | A2 | Low Tom | — | — | (не используем) |
| **46** | **A#2** | **Open Hi-hat** | ✅ hihat_open | ✅ hihat_open | Открытый хай-хэт |
| 47 | B2 | Low-Mid Tom | — | — | (не используем) |
| 48 | C3 | Hi-Mid Tom | — | — | (не используем) |
| **49** | **C#3** | **Crash Cymbal 1** | ✅ crash | ✅ crash | Основной crash |
| 50 | D3 | High Tom | — | — | (не используем) |
| **51** | **D#3** | **Ride Cymbal 1** | ✅ ride_bow | ✅ ride_bow | Ride bow |
| 52 | E3 | Chinese Cymbal | — | — | (не используем) |
| 53 | F3 | Ride Bell | — | ✅ ride_bell | ⭐ Ride bell |
| 54 | F#3 | Tambourine | — | — | (не используем) |
| **55** | **G3** | **Splash Cymbal** | ✅ splash | — | Splash |
| 56 | G#3 | Cowbell | — | — | (не используем) |
| 57 | A3 | Crash Cymbal 2 | — | — | (не используем) |
| 82 | A#4 | Sizzle Crash | — | ✅ crash_sizzle | ⭐ Sizzle crash (фанк) |

### 5.2. Логика выбора артикуляции по velocity и стилю

```
velocity 0–50   → ghost / buzz / stir / muted (тихие артикуляции)
velocity 51–100 → center / closed / bow (основные звуки)
velocity 101–127 → rimshot / edge / bell / open (акценты)

Jazz-specific:
  - stir:  постоянная текстурная подложка на 2 и 4 (не через velocity)
  - ghost → dig (press roll на слабых долях)
  - accent → edge (crossstick на 2 и 4 в bossa)

Funk-specific:
  - ghost → buzz (buzz-roll на субдивизиях)
  - accent → rimshot (на backbeat при высокой velocity)
  - flam:  20% вероятностный триггер при velocity > 100
  - bell:  акцентные доли ride
```

## 6. Типы TypeScript (предлагаемые изменения)

### 6.1. Расширение `SampleManifest`

Добавить поддержку velocity-слоёв (обратно-совместимо):

```ts
export interface SampleManifest {
  baseUrl: string;
  fallbackBaseUrl?: string;
  formatSwap?: readonly [string, string];

  // Существующее (плоское) — остаётся для обратной совместимости
  oneshots?: Record<string, string[]>;

  // Новое: многослойные oneshots
  // Ключ = sound_articulation (например 'snare_center', 'ride_bell')
  // Значение = { [velLayer]: [rr-files] }
  // velLayer: 'vl1', 'vl2', ... — строковые ключи, порядок задаётся массивом velocityLayers
  velocityOneshots?: Record<string, Record<string, string[]>>;

  // Порядок velocity-слоёв (от тихого к громкому)
  // ['vl1', 'vl5', 'vl10', 'vl15', 'vl20'] для Jazz, ['vl1', 'vl2', 'vl3'] для Funk
  velocityLayers?: string[];

  rrCount?: number;
  layers?: Record<string, Record<string, string>>;
  release?: number;
}
```

### 6.2. Расширение `DrumSound`

```ts
export type DrumSound =
  // Core
  | 'kick'
  // Snare articulations
  | 'snare_center' | 'snare_edge' | 'snare_dig'
  | 'snare_buzz' | 'snare_flam' | 'snare_crossstick' | 'snare_muted' | 'snare_rimshot'
  // Hi-hat articulations
  | 'hihat_closed' | 'hihat_open' | 'hihat_foot' | 'hihat_stir'
  // Ride articulations
  | 'ride_bow' | 'ride_bell'
  // Cymbals
  | 'crash' | 'crash_sizzle' | 'splash'
  // Toms
  | 'tom_hi' | 'tom_lo' | 'tom_mhi' | 'tom_mlow';
```

### 6.3. Расширение `DrumInstrumentSettings`

```ts
interface DrumInstrumentSettings {
  // ... существующие поля (enabled, volume, bassDrum*, snare*, hihat*, ride*, crash*, rim*, tom*) ...

  // Новые: per-articulation enable/volume
  snareBuzzEnabled: boolean;
  snareBuzzVolume: number;
  snareFlamEnabled: boolean;
  snareFlamVolume: number;
  snareRimshotEnabled: boolean;
  snareRimshotVolume: number;
  snareCrossstickEnabled: boolean;
  snareCrossstickVolume: number;
  snareMutedEnabled: boolean;
  snareMutedVolume: number;
  snareDigEnabled: boolean;
  snareDigVolume: number;
  snareEdgeEnabled: boolean;
  snareEdgeVolume: number;
  rideBellEnabled: boolean;
  rideBellVolume: number;
  stirEnabled: boolean;
  stirVolume: number;
  crashSizzleEnabled: boolean;
  crashSizzleVolume: number;
  splashEnabled: boolean;
  splashVolume: number;

  // Funk-specific probabilities
  funkFlamProbability: number;   // 0–1
  funkBuzzProbability: number;   // 0–1
}
```

## 7. Стратегия редукции velocity-слоёв

### 7.1. Принципы

| Роль звука | Слоёв (Jazz) | Слоёв (Funk) | Какие |
|------------|-------------|-------------|-------|
| **Основные** (kick, snare_center, hihat_closed, ride_bow) | **5** (из vl1–vl20) | 3–5 (из имеющихся) | Равномерно по диапазону: vl1, vl5, vl10, vl15, vl20 |
| **Акцентные** (snare_rimshot, ride_bell, hihat_open) | 3 | 2–3 | Только громкие слои |
| **Текстурные** (snare_buzz, snare_flam, snare_dig, snare_muted) | 3 | 2–3 | Преимущественно тихие/средние |
| **Специальные** (stir) | 1 | — | Один слой (текстура без динамики) |
| **Тарелки** (crash, splash, sizzle) | 2–3 | 3 | Средние-громкие |
| **Томы** (tom_hi/lo/mhi/mlow) | 3 | 3 | Равномерно по диапазону |
| **Crossstick/edge** | 3 | 2 | Тихие-средние |

### 7.2. Конкретные слои — Swirly.Drums_1104 → Jazz Kit

Исходная библиотека содержит vl1–vl20. Выбираем с шагом ~5:

| Звук | Слоёв | Какие именно | RR |
|------|-------|-------------|-----|
| Kick | 5 | vl1, vl5, vl10, vl15, vl20 | 4 |
| Snare center | 5 | vl1, vl5, vl10, vl15, vl20 | 4 |
| Snare edge | 3 | vl1, vl10, vl20 | 4 |
| Snare dig | 3 | vl1, vl10, vl20 | 4 |
| HH closed | 5 | vl1, vl5, vl10, vl15, vl20 | 4 |
| HH open | 3 | vl1, vl10, vl20 | 4 |
| HH foot | 3 | vl1, vl10, vl20 | 4 |
| Stir | 1 | single (текстура) | 4 |
| Ride bow | 5 | vl1, vl5, vl10, vl15, vl20 | 4 |
| Crash | 3 | vl1, vl10, vl20 | 4 |
| Splash | 2 | vl1, vl10 | 4 |
| Tom mlow | 3 | vl1, vl10, vl20 | 4 |
| Tom mhi | 3 | vl1, vl10, vl20 | 4 |

### 7.3. Конкретные слои — virtuosity-drums → Funk Kit

| Звук | Исходных слоёв | Оставляем | Какие именно | RR-эмуляция |
|------|---------------|-----------|-------------|-------------|
| Kick | 6 (vl1–6) | 3 | vl1, vl3, vl5 | Родные 4 RR |
| Snare center | 36 | 5 | vl1, vl8, vl18, vl28, vl36 | Соседние vl как RR (vl1→rr1, vl2→rr2, vl3→rr3, vl4→rr4) |
| Snare buzz | 12 | 3 | vl1, vl6, vl12 | Соседние vl как RR |
| Snare flam | 12 | 3 | vl1, vl6, vl12 | Соседние vl как RR |
| Snare crossstick | 16 | 2 | vl1, vl16 | Соседние vl как RR |
| Snare muted | 16 | 2 | vl1, vl16 | Соседние vl как RR |
| Snare rimshot | 12 | 3 | vl1, vl8, vl12 | Соседние vl как RR |
| HH closed | 4 vel × 4 RR | 3 | vl1, vl2, vl4 | Родные 4 RR |
| HH open | 4 vel × ~3 RR | 2 | vl1, vl3 | Родные RR где есть |
| HH pedal | 3 vel × 4 RR | 2 | vl1, vl2 | Родные 4 RR |
| Ride bow | 4 vel × 4 RR | 3 | vl1, vl2, vl4 | Родные 4 RR |
| Ride bell | 3 vel × 3 RR | 3 | vl1, vl2, vl3 | Родные 3 RR |
| Crash | 3 vel × 4 RR | 3 | vl1, vl2, vl3 | Родные 4 RR |
| Crash sizzle | 3 vel × 4 RR | 3 | vl1, vl2, vl3 | Родные 4 RR |
| High tom | 16 | 3 | vl1, vl8, vl16 | Без RR (1 файл/слой) |
| Low tom | 11 из 16 | 3 | vl2, vl8, vl16 | Без RR (1 файл/слой) |

## 8. План реализации

### Этап 1: Подготовка сэмплов (аудио-инженер)

1. **Jazz Kit (первым):** Конвертировать полную библиотеку Swirly.Drums_1104 (vl1–vl20) в AAC `.m4a` согласно структуре §4.2. Применить редукцию согласно §7.2. Создать MP3-фолбэки в `samples/mp3/drums/jazz-drum-kit/`.
2. **Funk Kit (вторым):** Конвертировать virtuosity-drums FLAC/WAV → AAC `.m4a` согласно структуре §4.3. Применить редукцию согласно §7.3. Создать MP3-фолбэки в `samples/mp3/drums/funk-drum-kit/`.

### Этап 2: Расширение SampleManifest

1. Добавить `velocityOneshots` и `velocityLayers` в `SampleManifest` (обратно-совместимо).
2. Обновить `DrumSound` тип.
3. Создать `jazzDrumKitSampleRegistry.ts` и `funkDrumKitSampleRegistry.ts`.

### Этап 3: Расширение DrumInstrument

1. Добавить логику выбора velocity-слоя в `schedule()`: map velocity 0–127 → индекс в `velocityLayers`.
2. Добавить логику выбора артикуляции по velocity + стилю (§5.2):
   - Jazz: ghost → dig, accent → edge, текстура → stir
   - Funk: ghost → buzz, accent → rimshot, flam-триггер
3. Добавить новые поля в `DrumInstrumentSettings` (§6.3).
4. Обновить `DrumRandomizer` для работы с артикуляциями.

### Этап 4: Новые манифесты

1. `jazzDrumKitManifest.ts` — `id: 'jazz-drum-kit'`, name: `'Jazz Drum Kit'`, perStyleDefaults: swing → stir=on, bossa → snare_edge=on.
2. `funkDrumKitManifest.ts` — `id: 'funk-drum-kit'`, name: `'Funk Drum Kit'`, perStyleDefaults: акцент на funk (buzz, flam, rimshot активны).

### Этап 5: Миграция и депрекация

1. Добавить `'jazz-drum-kit'` и `'funk-drum-kit'` в `InstrumentId` (styleProfile.ts).
2. Обновить `InstrumentGroupDef` для группы `drums`: добавить варианты "Jazz Drum Kit" и "Funk Drum Kit".
3. Депрекейтить старые `'drums'` и `'modern-kit'` (оставить для обратной совместимости).
4. Обновить UI-компонент выбора drum kit.

## 9. Out of Scope

- ❌ **Brush-кит для джаза** — stir — единственная brush-артикуляция, полноценный brush-кит (щётки) — отдельная задача.
- ❌ **Hand clap для Funk Kit** — нет в исходниках, future.
- ❌ **Humanization velocity-слоёв** — текущая humanization только timing (jitter), не velocity-вариация.
- ❌ **MIDI-экспорт паттернов с артикуляциями** — потребует расширения формата.
- ❌ **Solo instrument для барабанов** (live drum MIDI-ввод) — не в scope.
- ❌ **Half-open hi-hat (3/4) для Funk** — удалён по решению ревью.

## 10. Риски и допущения

| Риск | Вероятность | Влияние | Митигация |
|------|------------|---------|-----------|
| Swirly.Drums_1104 полные исходники (vl1–vl20) недоступны | Средняя | Jazz Kit не сможем собрать в 5 слоёв | Использовать текущий Swirly v2 (vl5) + дополнительные слои из virtuosity или уменьшить до 3 слоёв |
| «Соседние velocity как RR» звучит неестественно для snare | Средняя | Machine-gun effect на snare | Протестировать; если плохо — оставить 1 слой без RR (как у toms) или уменьшить RR до 2 |
| Размер бандла слишком большой | Средняя | Медленная загрузка | Ленивая загрузка per-kit; загрузка только выбранного кита; AAC-сжатие |
| Неполные ltom-слои (11/16, нет vl1) | Низкая | Нет самого тихого слоя pp | Используем vl2 как ближайший к pp |
| Усложнение SampleManifest ломает обратную совместимость | Низкая | Старые киты не грузятся | `velocityOneshots` — опциональное поле, `oneshots` продолжает работать |

## 11. Метрики успеха

- [ ] Jazz Kit: stir, splash, ≥3 snare-артикуляций (center, edge, dig) — ✅ спроектировано
- [ ] Funk Kit: ≥5 snare-артикуляций (buzz, flam, rimshot, crossstick, muted) — ✅ спроектировано
- [ ] ≥5 velocity-слоёв для основных звуков Jazz (kick, snare_center, hihat_closed, ride_bow) — ✅ спроектировано (vl1, vl5, vl10, vl15, vl20)
- [ ] ≥3 velocity-слоя для основных звуков Funk — ✅ спроектировано
- [ ] 2 crash-артикуляции для Funk (crash + sizzle) — ✅ спроектировано
- [ ] GM MIDI-привязка для основных звуков (36–55) — ✅ выполнено
- [ ] Stir на MIDI 27 (D#1) — ✅ назначено
- [ ] Размер одного кита (AAC) ≤ 20 МБ — оценка: Jazz ~16 МБ, Funk ~15 МБ
- [ ] Обратная совместимость со старыми `drums` / `modern-kit` манифестами — заложено
- [ ] Все существующие тесты `drumInstrument.test.ts` и `drumRandomizer.test.ts` проходят — требуется проверка

---

*Следующий шаг: подтверждение структуры → поиск/конвертация исходников Swirly.Drums_1104 → конвертация сэмплов → реализация в коде.*
