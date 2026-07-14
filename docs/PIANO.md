# Grand Piano в джазовом тренажёре

> **Статус:** 🟢 Реализовано (частичная миграция в плагин)
> **Модуль:** `packages/music-core/src/audio/pianoInstrument.ts`
> **Манифесты:** `uprightPianoManifest` в плагине `@jazz/plugin-upright-piano` (Upright KW), `salamanderManifest` в `music-core` (Salamander Grand), `pianoManifest` (deprecated) в `music-core`
> **Плагин:** `packages/plugins/instruments/upright-piano/` — экспортирует `uprightPianoManifest` через `contributes.instruments`
> **Конструктор:** `packages/plugins/admin-piano-constructor/` — админ-инструмент для изучения/редактирования молекул, клеток и организмов
> **Pattern-engine:** `pianoVoicing.ts`, `pianoUpperStructures.ts`, `pianoMolecules.ts`,
> `pianoCells.ts`, `pianoOrganisms.ts`, `pianoPatternEngine.ts` — см. §11

## 1. Роль Grand Piano в аранжировке

Grand Piano — **основной гармонический инструмент** в аранжировке Jazz Trainer. В отличие от Rhodes, который выполняет роль комплементарного слоя, Grand Piano берёт на себя ведущую гармоническую партию:

- **Гармоническая опора:** полные аккордовые voicing'и — shell2, rootless3, rootless4, quartal
- **Ритмический драйв:** составные 4-тактовые профили компинга из простых паттернов («кирпичиков»)
- **Голосоведение:** плавные переходы с минимальным движением голосов и гравитационным смещением вниз
- **Вариативность:** встроенный детерминированный рандомайзер для естественного звучания

## 2. Grand Piano + Rhodes: основной + комплементарный слой

| Аспект    | Grand Piano                        | Rhodes                       |
| --------- | ---------------------------------- | ---------------------------- |
| Роль      | Основная гармония                  | Текстурный слой              |
| Ритм      | Активный компинг (профили)         | Разреженный (pads, offbeats) |
| Регистр   | C3–C6 (полный)                     | C4–C6 (средний/верхний)      |
| Voicings  | shell2/rootless3/rootless4/quartal | shell2/rootless3/rootless4   |
| Активация | Всегда основной                    | Опциональный слой            |

**Правила избегания конфликтов** (`pianoRhodesInteraction.ts`):

- Rhodes не играет в том же ритмическом слоте (±1/16), что и Grand Piano
- При конфликте Rhodes-событие сдвигается на 1/16 позже
- Громкость конфликтующего Rhodes снижается на 30%
- Rhodes-режимы `pads` и `ambient-swells` специально спроектированы для работы поверх Grand Piano

## 3. Сэмплы

### 3.1. Upright KW (по умолчанию, плагин `@jazz/plugin-upright-piano`)

- **Источник:** UprightPianoKW-SFZ-20220221 (CC0, FreePats) — вертикальное пианино Kawai
- **Формат:** AAC (`.m4a`) с MP3-фолбэком
- **Velocity-слои:** 3 (`soft` — до 0.33, `medium` — 0.33–0.66, `hard` — от 0.66)
- **Охват:** C1–G7, анкерные ноты через квинту (C/G) с интерполяцией ±2 полутона (Tone.js)
- **Release:** 1.8 сек
- **Размещение:** `apps/web/public/samples/aac/piano/upright/`
- **Плагин:** `packages/plugins/instruments/upright-piano/` — экспортирует `uprightPianoManifest` через `contributes.instruments`

> Старый манифест `pianoManifest` (2 vel. слоя, release 0.8) в `music-core` помечен как `@deprecated`.

### 3.2. Salamander Grand Piano

- **Источник:** Salamander Grand Piano (Yamaha C5, 16 velocity layers в оригинале)
- **Формат:** AAC (`.m4a`) с MP3-фолбэком
- **Velocity-слои:** 3 (`p` — до 0.4, `mf` — до 0.7, `f` — от 0.7)
- **Охват:** A0–C7, анкерные ноты через малую терцию
- **Размещение:** `apps/web/public/samples/aac/piano/salamander/`

Обе библиотеки используют одинаковый `PianoInstrument` — различаются только `SampleManifest`.

## 4. Voicing-движок

### 4.1. Типы voicing'ов

| Voicing     | Нот | Состав                              | Для каких аккордов |
| ----------- | --- | ----------------------------------- | ------------------ |
| `shell2`    | 2   | 3-й + 7-й тон                       | Все типы           |
| `rootless3` | 3   | 3 + 7 + 9 (color tone)              | Все типы           |
| `rootless4` | 4   | 3 + 7 + 9 + 13                      | Все типы           |
| `quartal`   | 3–4 | Квартовые стеки (McCoy Tyner style) | Все типы           |

### 4.2. Интервальные таблицы

Алгоритм `voicingIntervals()` возвращает интервалы от root для каждого типа аккорда:

| Аккорд | shell2 | rootless3 | rootless4 | quartal                     |
| ------ | ------ | --------- | --------- | --------------------------- |
| Maj7   | 4, 11  | 4, 11, 14 | +19       | стек от 3-й: 4, 9, 14, 19   |
| m7     | 3, 10  | 3, 10, 14 | +19       | стек от b3: 3, 8, 13, 18    |
| Dom7   | 4, 10  | 4, 10, 14 | +21       | стек от 3-й                 |
| m7b5   | 3, 10  | 3, 10, 13 | +18       | стек от b7: 10, 15, 20      |
| Dim7   | 3, 9   | 3, 6, 9   | +12       | симметричный: 9, 14, 19, 24 |

### 4.3. Построение voicing'а

1. Для заданного аккорда и плотности определяются интервалы
2. Генерируются все уникальные перестановки pitch-классов в регистре C3–C6
3. Отбрасываются варианты с размахом >24 полутонов
4. При наличии предыдущего voicing'а — выбирается кандидат с минимальным voice-leading расстоянием

### 4.4. Уровень напряжения (Tension) и надстройки

> Подробное обоснование архитектуры: `docs/PIANO-EXTENDED-ARRANGEMENT-2.md`.

`buildPianoVoicing(chord, density, prevVoicing, tension, seed)` — четвёртый параметр `tension`
управляет тем, добавляется ли поверх базового voicing'а надстройка (upper structure triad):

| `tension`  | Поведение |
| ---------- | --------- |
| `clean`    | Только density-voicing, надстройки выключены |
| `moderate` | Надстройки изредка (35%), только «мягкие» цвета |
| `altered`  | Надстройки часто (70%), включая альтерации на доминантах |
| `max`      | Надстройки почти всегда (100%) |

Выбор конкретной надстройки — `suggestUpperStructure(chord, functionHint, tension, seed)`
(`pianoUpperStructures.ts`): таблица триад по `chord.quality` (dominant/major/minor/
halfDiminished/diminished), **детерминированный** сидированный выбор (тот же LCG, что и
`poolIndex` в pattern-движке — воспроизводимо для одного и того же такта). Найденная
надстройка транспонируется в MIDI через `intervalToMidi()` и достраивается поверх верхней
ноты base voicing'а (`mergeUpperStructure()`), с тем же жёстким потолком по регистру.

`tension` задаётся в `StyleProfile.instrumentDefaults.piano.tension` (по умолчанию свинг —
`'moderate'`) или через `PianoInstrument.setTension()`.

## 5. Голосоведение (Voice Leading)

Алгоритм `buildPianoVoicing()` реализует направленное голосоведение:

1. **Минимальное движение:** сумма полутоновых перемещений всех голосов между voicing'ами
2. **Направленный bias:**
   - Движение **вниз** стоит 0.7× (дешевле — поощряется)
   - Движение **вверх** стоит 1.3× (дороже)
3. **Мягкий потолок (C5, MIDI 72):** когда верхний голос выше C5, движение вверх стоит 2.0×
4. **Жёсткий потолок (MIDI 80):** если voicing упирается в C6, сбрасывается в root-position
5. **При равной дистанции:** выбирается более узкий (меньший span) voicing

Это создаёт естественное «гравитационное» смещение вниз, предотвращая бесконечный дрейф вверх.

## 6. Профили компинга

### 6.1. Простые паттерны («кирпичики»)

16 паттернов в `pianoComping.ts`. Каждый — массив `CompEvent` (beat, subdivision, durationBeats, velocity):

| Паттерн              | Доли       | Описание            |
| -------------------- | ---------- | ------------------- |
| `charleston`         | 1, 2&      | Charleston rhythm   |
| `reverse-charleston` | 1&, 3      | Reverse Charleston  |
| `basie-2-4`          | 2, 4       | Basie-style 2 & 4   |
| `offbeat-2-4`        | 2&, 4&     | Offbeat акценты     |
| `anticipation-4and`  | 4& (next)  | Антиципация         |
| `one-twoand-four`    | 1, 2&, 4   | 3-hit паттерн       |
| `oneand-three`       | 1&, 3      | Offbeat + downbeat  |
| `twoand-only`        | 2&         | Минимальный         |
| `four-and-sparse`    | 4& (next)  | Редкая антиципация  |
| `two-threeand`       | 2, 3&      | Средний драйв       |
| `halfNotes`          | 1, 3       | Половинные          |
| `quarterNotes`       | 1, 2, 3, 4 | Четверти            |
| `quarter-comp`       | 1, 2, 3, 4 | Плотные четверти    |
| `two-and-four`       | 2, 4       | Акценты на backbeat |
| `one-three`          | 1, 3       | Сильные доли        |
| `wholeNotes`         | 1          | Целые               |
| `rest`               | —          | Пауза               |

### 6.2. Составные профили (5 шт.)

Каждый профиль — 4-тактовая последовательность «кирпичиков»:

| Профиль         | Сложность | Такт 1      | Такт 2          | Такт 3             | Такт 4            | Стиль по умолчанию |
| --------------- | --------- | ----------- | --------------- | ------------------ | ----------------- | ------------------ |
| `swing-sparse`  | 1         | basie-2-4   | charleston      | basie-2-4          | halfNotes         | swing, bossa       |
| `swing-medium`  | 2         | charleston  | one-twoand-four | reverse-charleston | oneand-three      | —                  |
| `basie-light`   | 1         | basie-2-4   | rest            | basie-2-4          | twoand-only       | latin              |
| `offbeat-push`  | 3         | offbeat-2-4 | two-threeand    | offbeat-2-4        | anticipation-4and | funk               |
| `beginner-safe` | 1         | halfNotes   | wholeNotes      | halfNotes          | wholeNotes        | ballad             |

## 7. Адаптивный режим (adaptiveProfile)

При `setAdaptiveProfile(true)` плотность автоматически повышается для multi-chord тактов:

- 3+ аккорда в такте → `quarter-comp` (все 4 доли)
- 2 аккорда в такте → `two-and-four` (2 и 4 доли)

## 8. Рандомайзер (PianoRandomizer)

Встроенный в `PianoInstrument` рандомайзер добавляет естественную вариативность. **Детерминирован** — seed от `barIndex`.

| Уровень    | Шанс изменений |
| ---------- | -------------- |
| `off`      | 0%             |
| `subtle`   | 10%            |
| `moderate` | 25%            |
| `high`     | 40%            |

**Операции (применяются последовательно):**

1. **Skip beats** — пропуск неакцентных долей (beat 1 никогда не пропускается)
2. **Eighth shifts** — сдвиг долей на восьмую (35% от базового шанса)
3. **Anticipations** — антиципации на beat 3–4 (только если есть следующий аккорд)
4. **Voicing variation** — переключение между shell2 ↔ rootless4 (50% от базового шанса)

Проходящие аккорды (passing chords) реализованы отдельно — не в рандомайзере, а в
pattern-движке через молекулы категории `fill` + «pre-echo» войсинга следующего аккорда,
см. §11.4.

## 9. Humanization

- **Timing jitter:** ±6 мс (преобразуется в тики: `0.006 * (bpm / 60) * PPQ`)
- **Velocity variation:** ±0.05
- Отключается через `setHumanize(false)`

## 10. Манифесты

Фортепиано представлено тремя манифестами — один актуальный плагинный, один в `music-core` и один deprecated:

```ts
// packages/plugins/instruments/upright-piano/src/manifest.ts — актуальный (плагин)
export const uprightPianoManifest: InstrumentManifest = {
  id: 'upright',
  name: 'Upright Piano',
  family: 'pitched',
  settingsPrefix: 'piano',
  createInstrument: () => new PianoInstrument(new ChordTimeline()),
  sampleManifest: UPRIGHT_SAMPLE_MANIFEST,   // 3 vel. слоя, release 1.8
  defaultSettings: {
    enabled: false,
    volume: 0.7,
    profile: 'swing-sparse',
    voicingDensity: 'rootless3',
    sampleLibrary: 'upright',
  },
  perStyleDefaults: {
    swing: { profile: 'swing-sparse', voicingDensity: 'rootless3' },
    bossa: { profile: 'swing-sparse', voicingDensity: 'shell2' },
    funk: { profile: 'offbeat-push', voicingDensity: 'rootless4' },
    latin: { profile: 'basie-light', voicingDensity: 'quartal' },
    ballad: { profile: 'beginner-safe', voicingDensity: 'rootless4' },
  },
};

// music-core/src/audio/pianoManifest.ts — @deprecated (2 vel. слоя, release 0.8)
export const pianoManifest: InstrumentManifest = { /* ... */ };

// music-core/src/audio/salamanderManifest.ts — Salamander Grand Piano
export const salamanderManifest: InstrumentManifest = {
  id: 'piano',
  name: 'Salamander Grand Piano',
  family: 'pitched',
  settingsPrefix: 'piano',
  createInstrument: () => new PianoInstrument(new ChordTimeline()),
  sampleManifest: SALAMANDER_SAMPLE_MANIFEST, // 3 vel. слоя
  defaultSettings: {
    enabled: false,
    volume: 0.7,
    profile: 'swing-sparse',
    voicingDensity: 'rootless3',
    sampleLibrary: 'salamander',
  },
};
```

Все манифесты используют один и тот же `PianoInstrument`. Активный манифест выбирается через реестр инструментов: `pianoSampleLibrary === 'upright'` → `uprightPianoManifest` (плагин), иначе → `salamanderManifest`.

## 11. Молекулы, роли голоса и pattern-engine

> Целевая архитектура и мотивация: `docs/PIANO-EXTENDED-ARRANGEMENT-2.md`.

Альтернативный (более гибкий) путь планирования — `PianoPatternEngine`
(`pianoPatternEngine.ts` + generic `pattern/engine.ts`), активируется через
`setOrganismId()`. Иерархия та же, что у барабанов: **атом → молекула → клетка →
организм**, но с ключевым отличием от версии v1 документа.

### 11.1. Атом = роль голоса, не интервал и не MIDI-нота

Атом молекулы (`PianoAtom`) хранит **когда**, **как громко**, **какой длительности** и
**какую роль голоса** играть — `sound: VoiceRole`:

| Роль       | Что играет |
| ---------- | ---------- |
| `chord`    | Весь текущий voicing (по умолчанию) |
| `shell`    | Только 2 нижних голоса (3 + 7) |
| `bass`     | Только самый нижний голос |
| `top`      | Только самый верхний голос |
| `upper`    | Цветные тона выше shell — надстройка, если `tension` её включил |

Никаких «зашитых» интервалов в молекуле — один и тот же ритм (например, Charleston)
корректно звучит на любом аккорде и любом уровне `tension`. Это устраняет
комбинаторный взрыв `ритм × voicing × надстройка × качество аккорда`, описанный в
`PIANO-EXTENDED-ARRANGEMENT-2.md`.

### 11.2. Резолв ролей в ноты

`PianoInstrument.scheduleWithPatternEngine()` на каждый хит:

1. Строит полный voicing аккорда: `buildPianoVoicing(chord, density, prevVoicing, tension, seed)`
2. Выбирает нужное подмножество нот по роли: `selectVoicingRole(voicing, hit.sound)`

`selectVoicingRole` работает позиционно (voicing всегда bass→top по возрастанию):
`shell` — первые 2 ноты, `upper` — всё, что выше shell (надстройка, если она включена
`tension`, иначе просто верхние extension-тона density-voicing'а).

### 11.3. Категории молекул

`groove` (ритмический компинг, роль `chord`), `accent` (акценты/антиципации),
`texture` (пауза), `fill` (проходящие — см. ниже).

Отдельной категории «надстроечного акцента» нет: роль `chord` уже несёт
надстроечные ноты, как только `tension` их добавил (они дописаны в тот же
voicing, который `chord` читает целиком). Отдельный `upper`-хит **параллельно**
с `chord` в той же точке такта дублировал бы те же ноты — так когда-то было
устроено (лейн `upper` + 2 generic-молекулы `piano-upper-accent-long/short`),
но это убрано как избыточное. Роль `upper` осталась в `VoiceRole` — для будущих
авторских молекул, которые захотят звучать **только** цветными тонами
(используется вместо `chord`, а не поверх него).

### 11.4. Проходящие аккорды (passing) — voicing pre-echo

Молекулы категории `fill` — чистый ритм на beat 4 или позже (тег `passing` + идиома
подхода: `chromatic-above`, `tritone`, `diatonic-ii-V` и т.д. — сейчас теги
документируют идиому, а не порождают разные ноты). Движок резолвит гармонию
единым правилом: хит в последней доле такта «предвосхищает» **следующий** аккорд —
если он отличается от текущего, voicing строится по нему. Это классический приём
джазового пианиста (антиципация) и не требует отдельной молекулы под каждый
переход аккордов.

### 11.5. Уровень напряжения — единственная пользовательская настройка

В UI (`InstrumentTile.tsx`) один select «Tension» (`clean|moderate|altered|max`,
см. §4.4) заменяет собой прежние тумблеры «Upper Structures» / «Passing Chords» —
они не были подключены к движку и не оказывали влияния на звук. Проброс:
`InstrumentTile` → `settings.pianoTension` (DTO, `dto.ts`) → `user_settings.piano_tension`
(БД) → `useTransport.ts` вызывает `PianoInstrument.setTension()` при монтировании,
при live-обновлении настроек и при смене per-style overrides.

Passing-хиты не имеют отдельного переключателя — они всегда часть ритма клетки;
надстройки на них включаются тем же общим `tension`.

## 12. API

```ts
class PianoInstrument implements Instrument {
  setTimeline(timeline: ChordTimeline): void;
  setProfile(profileId: CompingProfileId): void;
  setVoicingDensity(density: PianoVoicingDensity): void; // shell2|rootless3|rootless4|quartal
  setTension(tension: TensionLevel): void; // clean|moderate|altered|max — надстройки
  setBaseVelocity(velocity: number): void; // [0, 2]
  setHumanize(enabled: boolean): void;
  setStyle(style: Style): void; // меняет профиль по умолчанию
  setRandomizationLevel(level: PianoRandomizationLevel): void;
  setAdaptiveProfile(enabled: boolean): void; // авто-повышение плотности
  setOrganismId(id: string | null): void; // выбор организма pattern-engine (§11)
  reset(): void; // сброс голосоведения
  dispose(): void;
  schedule(window: ScheduleWindow, ctx: ScheduleContext): void;
}
```

## 13. Тесты

- `pianoInstrument.test.ts` — ≥70 тестов: все профили, voicing-типы, голосоведение, humanization, tension/upper structures, passing pre-echo
- `pianoRandomizer.test.ts` — ≥15 тестов: детерминизм, уровни, операции
- `pianoVoicing.ts` — генерация voicing'ов для всех типов аккордов + слияние надстроек
- `pianoRhodesInteraction.test.ts` — избегание конфликтов

## 14. Конструктор фортепиано (admin)

`packages/plugins/admin-piano-constructor/` — админ-инструмент для изучения и редактирования фортепианных молекул, клеток и организмов. Использует общую базу `admin-constructor-shared` (Strategy-паттерн).

**Путь:** `/admin/piano-constructor` (требует `content:write`)

**Особенности pitched-конструктора:**
- **Piano-roll редактор молекул** (`PianoMoleculeTable`) — вместо step-grid'а барабанов, ноты отображаются в двумерной сетке (роль × tick)
- **Роли голоса как «звуки»** — `sound: VoiceRole` (`chord`, `shell`, `bass`, `top`, `upper`)
- **Предпрослушивание через сэмплер** (`usePianoPreview`) — загружает сэмплы выбранного варианта (Upright/Salamander) и играет плоские PianoHit'ы
- **Варианты фортепиано** (`PianoVariantSelector`) — переключение между библиотеками сэмплов в тулбаре
- **Сохранение:** localStorage (autosave) + публикация через `POST /api/dev/piano-source` (dev-режим)

**Стратегия** (`pianoStrategy.ts`): family `pitched`, использует generic `assemblePatternBar` из `pattern/engine.ts`, валидация клеток опциональна (piano не имеет `validateCell`).

---

## Changelog

- **Плагинная миграция + 3 vel. слоя (2026-07):** Upright Piano вынесен в плагин `@jazz/plugin-upright-piano` (категория `core`). Новый манифест `uprightPianoManifest` (id: `'upright'`, 3 velocity-слоя, release 1.8). Старый `pianoManifest` в `music-core` помечен `@deprecated`. Диапазон обновлён: C1–G7 с анкерами C/G (вместо A0–C8 с анкерами через терцию).
- **Конструктор фортепиано (2026-07):** Добавлен админ-плагин `admin-piano-constructor` на базе `admin-constructor-shared`. Strategy-паттерн: pitched family, piano-roll редактор, VoiceRole-звуки, sampler-based preview.

_См. также: `docs/RHODES.md` (комплементарный слой), `docs/BASS.md` (бас),
`docs/PIANO-EXTENDED-ARRANGEMENT-2.md` (архитектура молекул/tension, план миграции)_
