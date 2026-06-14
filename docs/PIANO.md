# Piano в джазовом тренажёре

> **Статус:** 🟢 Реализовано
> **Модуль:** `packages/music-core/src/audio/pianoInstrument.ts`

## 1. Роль Piano в аранжировке

Piano — основной гармонический инструмент в аранжировке Jazz Trainer. В отличие от Rhodes, который теперь выполняет роль комплементарного слоя, Piano берёт на себя ведущую гармоническую партию:

- **Гармоническая опора:** полные аккордовые voicing'и (shell2, rootless3, rootless4, quartal)
- **Ритмический драйв:** составные 4-тактовые профили компинга
- **Голосоведение:** плавные переходы между аккордами с минимальным движением голосов
- **Вариативность:** встроенный рандомайзер для естественного звучания

Piano и Rhodes работают в паре:
- **Piano** — основной слой, играет активный компинг
- **Rhodes** — комплементарный слой, добавляет текстуру и окраску (см. `docs/RHODES.md`)

## 2. Сэмплы

### 2.1. Salamander Grand Piano

- **Источник:** SFZ-библиотека Salamander Grand Piano (Yamaha C5, 16 velocity layers)
- **Формат:** OGG (libopus 128k), сконвертированы из FLAC
- **Охват:** A0–C8 (88 нот)
- **Размещение:** `apps/web/public/samples/piano/salamander/`

### 2.2. Upright KW

- **Источник:** SFZ-библиотека Upright KW (вертикальное пианино Kawai)
- **Формат:** OGG (libopus 128k)
- **Характер:** более мягкое, камерное звучание — хорошая альтернатива для баллад
- **Размещение:** `apps/web/public/samples/piano/upright/`

### 2.3. Оптимизация

- Сэмплы обрезаны по sustain (без длинных хвостов) для экономии памяти
- Velocity-слои: 4 (p, mf, f, ff) через Tone.js Sampler с интерполяцией
- Реестр: `pianoSampleRegistry.ts`

## 3. Профили компинга

Piano использует **составные 4-тактовые профили** — последовательности простых паттернов («кирпичиков»), циклически повторяющиеся каждые 4 такта.

### 3.1. Простые паттерны («кирпичики»)

| Паттерн | Описание | Доли |
|---------|----------|------|
| `charleston` | Charleston rhythm | 1, 2& |
| `reverse-charleston` | Reverse Charleston | 1&, 3 |
| `basie-2-4` | Basie-style 2 & 4 | 2, 4 |
| `offbeat-2-4` | Offbeat 2&, 4& | 2&, 4& |
| `anticipation-4and` | Антиципация на 4& | 4& |
| `one-twoand-four` | 1 + 2& + 4 | 1, 2&, 4 |
| `oneand-three` | 1& + 3 | 1&, 3 |
| `twoand-only` | Только 2& | 2& |
| `four-and-sparse` | Редкая 4& | 4& |
| `two-threeand` | 2 + 3& | 2, 3& |
| `halfNotes` | Половинные | 1, 3 |
| `quarterNotes` | Четверти | 1, 2, 3, 4 |
| `wholeNotes` | Целые | 1 |
| `rest` | Пауза | — |

### 3.2. Составные профили (5 шт.)

| Профиль | Сложность | Такт 1 | Такт 2 | Такт 3 | Такт 4 | Стиль по умолчанию |
|---------|-----------|--------|--------|--------|--------|-------------------|
| `swing-sparse` | 1 | basie-2-4 | charleston | basie-2-4 | halfNotes | swing, bossa |
| `swing-medium` | 2 | charleston | one-twoand-four | reverse-charleston | oneand-three | — |
| `basie-light` | 1 | basie-2-4 | rest | basie-2-4 | twoand-only | latin |
| `offbeat-push` | 3 | offbeat-2-4 | two-threeand | offbeat-2-4 | anticipation-4and | funk |
| `beginner-safe` | 1 | halfNotes | wholeNotes | halfNotes | wholeNotes | ballad |

### 3.3. Стиль → профиль по умолчанию

| Стиль | Профиль |
|-------|---------|
| `swing` | swing-sparse |
| `bossa` | swing-sparse |
| `funk` | offbeat-push |
| `latin` | basie-light |
| `ballad` | beginner-safe |

## 4. Voicings

Piano поддерживает 4 типа voicing'ов:

| Voicing | Нот | Описание | Для каких аккордов |
|---------|-----|----------|-------------------|
| `shell2` | 2 | 3-й + 7-й тон | Все типы |
| `rootless3` | 3 | 3 + 7 + 9 (color tone) | Все типы |
| `rootless4` | 4 | 3 + 7 + 9 + 13 | Все типы |
| `quartal` | 3–4 | Квартовые стеки (McCoy Tyner style) | Все типы |

### 4.1. Shell voicings (2 ноты)

Минимальный гармонический остов: только терция и септима. Используется для прозрачного звучания.

```
Dm7  → F, C   (b3, b7)
G7   → B, F   (3, b7)
Cmaj7 → E, B   (3, 7)
```

### 4.2. Rootless 3-note voicings

Добавляет tension (9-й тон) к shell:

```
Dm7  → F, C, E   (b3, b7, 9)
G7   → B, F, A   (3, b7, 9)
Cmaj7 → E, B, D   (3, 7, 9)
```

### 4.3. Rootless 4-note voicings

Полный джазовый voicing с 13-м тоном:

```
Dm7  → F, C, E, B   (b3, b7, 9, 13)
G7   → B, F, A, E   (3, b7, 9, 13)
Cmaj7 → E, B, D, A   (3, 7, 9, 13)
```

### 4.4. Quartal voicings

Стеки из чистых кварт (5 полутонов), характерные для стиля McCoy Tyner:

- Для maj7/m7/7: стек из 4 нот от терции
- Для m7b5: стек из 3 нот от септимы
- Для dim7: симметричный стек из 4 нот

## 5. Голосоведение (Voice Leading)

При переходе между аккордами Piano выбирает voicing с **минимальным суммарным движением голосов**:

1. Генерируются все возможные voicing'и для целевого аккорда в регистре C3–C6
2. Каждый кандидат сравнивается с предыдущим voicing'ом по сумме полутоновых перемещений
3. При равной дистанции выбирается более узкий (меньший span) voicing
4. Первый аккорд (без предыдущего) берётся в root-position на минимальной допустимой октаве

## 6. Рандомайзер (PianoRandomizer)

Встроенный в `PianoInstrument` рандомайзер добавляет естественную вариативность:

| Уровень | Описание |
|---------|----------|
| `off` | Без изменений |
| `subtle` | Лёгкие вариации: 10% шанс изменений |
| `moderate` | Умеренные: 25% шанс, включая пропуск долей и антиципации |
| `high` | Активные: 40% шанс, включая passing chords |

**Операции рандомайзера:**
- **Skip beats:** пропуск неакцентных долей (кроме beat 1)
- **Eighth shifts:** сдвиг долей на восьмую
- **Anticipations:** антиципации на beat 3–4 (только если есть следующий аккорд)
- **Passing chords:** короткие проходящие аккорды на beat 4.5
- **Voicing variation:** переключение между shell2 и rootless4 для контраста

Рандомайзер **детерминирован** — одинаковый вход даёт одинаковый выход (seed от индекса такта).

## 7. Humanization

- **Timing jitter:** ±6 мс (преобразуется в тики в зависимости от BPM)
- **Velocity variation:** ±0.05 (добавляется к базовой velocity события)
- Отключается через `setHumanize(false)`

## 8. FX-цепь

Piano-сэмплы проходят через стандартную цепь эффектов Tone.js:

```
Sampler → EQ3 → Reverb → Channel (volume/pan) → Master
```

Параметры настраиваются через `pianoManifest.ts` и применяются в `useTransport.ts`.

## 9. Взаимодействие с Rhodes

Piano и Rhodes работают как **основной + комплементарный слой**:

| Аспект | Piano | Rhodes |
|--------|-------|--------|
| Роль | Основная гармония | Текстурный слой |
| Ритм | Активный компинг (профили) | Разреженный (pads, offbeats) |
| Регистр | C3–C6 (полный) | C4–C6 (средний/верхний) |
| Voicings | shell2/rootless3/rootless4/quartal | rootless voicings |
| Активация | Всегда включён (основной) | Опциональный слой |

**Правила избегания конфликтов:**
- Rhodes не играет, когда Piano активен в том же ритмическом слоте
- Rhodes использует верхний регистр (C4+), оставляя низ Piano
- При высокой плотности Piano, Rhodes автоматически снижает активность
- Rhodes-режимы `pads` и `ambient-swells` специально спроектированы для работы поверх Piano

## 10. API

```ts
class PianoInstrument implements Instrument {
  setTimeline(timeline: ChordTimeline): void;
  setProfile(profileId: CompingProfileId): void;
  setVoicingDensity(density: PianoVoicingDensity): void;
  setBaseVelocity(velocity: number): void;        // [0, 2]
  setHumanize(enabled: boolean): void;
  setStyle(style: Style): void;                   // меняет профиль по умолчанию
  setRandomizationLevel(level: PianoRandomizationLevel): void;
  reset(): void;
  dispose(): void;
  schedule(window: ScheduleWindow, ctx: ScheduleContext): void;
}
```

## 11. Тесты

- Unit-тесты: `pianoInstrument.test.ts` (≥25 тестов)
- Unit-тесты рандомайзера: `pianoRandomizer.test.ts` (≥15 тестов)
- Покрытие: все 5 профилей, все voicing-типы, voice leading, humanization, edge cases

---

_См. также: `docs/RHODES.md` (комплементарный слой), `docs/FUNCTIONS.md` §6.3 (инструменты)_
