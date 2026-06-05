# Bass Sample Audit — паттерн ii-V-I (8 тактов)

Паттерн из скриншота: **Dm7b5 | G7b9 Fm7 | Cm7 | Dm7b5 | G7b9 | Cm7 | Dm7b5 | G7b9 ∞**

## Ограничение движка

`buildChordTimelineEntries` берёт только `chords[0]` из каждого слота:

```ts
const slot = allBars[originalBarIdx]?.chords[0];
```

**Fm7 в такте 2 (G7b9 | Fm7) игнорируется.** Бас играет G7b9 на всех 4 долях такта 2.

---

## Тоны аккордов (опорные данные)

| Аккорд | Качество | Root | Third | Fifth | Seventh |
|--------|----------|------|-------|-------|---------|
| Dm7b5 | halfDiminished | D2 | F2 | Ab2 | C3 |
| G7b9 | dominant | G2 | B2 | D3 | F3 |
| Cm7 | minor | C2 | Eb2 | G2 | Bb2 |

> `Fm7` не используется в движке баса (см. выше).

Диапазон потолка: ноты выше G3 (C3=0, G3=index 7) автоматически опускаются на октаву.

---

## Velocity по долям (все уровни)

| Доля | Velocity |
|------|----------|
| 1 | 0.82 |
| 2 | 0.68 |
| 3 | 0.76 |
| 4 | 0.70 |

---

## Уровень 1 — Root only (1 нота / такт)

Артикуляция: **pluck** (всегда).

| Такт | Аккорд | Доля 1 |
|------|--------|--------|
| 1 | Dm7b5 | D2 |
| 2 | G7b9 | G2 |
| 3 | Cm7 | C2 |
| 4 | Dm7b5 | D2 |
| 5 | G7b9 | G2 |
| 6 | Cm7 | C2 |
| 7 | Dm7b5 | D2 |
| 8 | G7b9 | G2 |

### Уникальные сэмплы (уровень 1)

| Файл (без _rr{n}.ogg) | RR |
|-----------------------|----|
| `sneakybass_d2_pluck` | 1–4 |
| `sneakybass_g2_pluck` | 1–4 |
| `sneakybass_c2_pluck` | 1–4 |

---

## Уровень 2 — Root every beat (октавное чередование)

Сильные доли (1, 3 в 4/4) → октава 2 + **pluck**. Слабые доли (2, 4) → октава 3 + **finger**.

| Такт | Аккорд | Доля 1 | Доля 2 | Доля 3 | Доля 4 |
|------|--------|--------|--------|--------|--------|
| 1 | Dm7b5 | D2/pluck | D3/finger | D2/pluck | D3/finger |
| 2 | G7b9 | G2/pluck | G3/finger | G2/pluck | G3/finger |
| 3 | Cm7 | C2/pluck | C3/finger | C2/pluck | C3/finger |
| 4 | Dm7b5 | D2/pluck | D3/finger | D2/pluck | D3/finger |
| 5 | G7b9 | G2/pluck | G3/finger | G2/pluck | G3/finger |
| 6 | Cm7 | C2/pluck | C3/finger | C2/pluck | C3/finger |
| 7 | Dm7b5 | D2/pluck | D3/finger | D2/pluck | D3/finger |
| 8 | G7b9 | G2/pluck | G3/finger | G2/pluck | G3/finger |

### Уникальные сэмплы (уровень 2)

| Файл (без _rr{n}.ogg) | RR |
|-----------------------|----|
| `sneakybass_d2_pluck` | 1–4 |
| `sneakybass_d3_finger` | 1–4 |
| `sneakybass_g2_pluck` | 1–4 |
| `sneakybass_g3_finger` | 1–4 |
| `sneakybass_c2_pluck` | 1–4 |
| `sneakybass_c3_finger` | 1–4 |

---

## Уровень 3 — Root + Fifth

Сильные доли (1, 3) → root + **pluck**. Слабые доли (2, 4) → fifth + **finger**.  
Доля 3 такта с нечётным `barIndex` (0-based) → root октава 3, чётного → октава 2.

| Такт | barIndex | Аккорд | Доля 1 | Доля 2 | Доля 3 | Доля 4 |
|------|----------|--------|--------|--------|--------|--------|
| 1 | 0 (чёт) | Dm7b5 | D2/pluck | Ab2/finger | D2/pluck | Ab2/finger |
| 2 | 1 (нечёт) | G7b9 | G2/pluck | D3/finger | G3/pluck | D3/finger |
| 3 | 2 (чёт) | Cm7 | C2/pluck | G2/finger | C2/pluck | G2/finger |
| 4 | 3 (нечёт) | Dm7b5 | D2/pluck | Ab2/finger | D3/pluck | Ab2/finger |
| 5 | 4 (чёт) | G7b9 | G2/pluck | D3/finger | G2/pluck | D3/finger |
| 6 | 5 (нечёт) | Cm7 | C2/pluck | G2/finger | C3/pluck | G2/finger |
| 7 | 6 (чёт) | Dm7b5 | D2/pluck | Ab2/finger | D2/pluck | Ab2/finger |
| 8 | 7 (нечёт) | G7b9 | G2/pluck | D3/finger | G3/pluck | D3/finger |

### Уникальные сэмплы (уровень 3)

| Файл (без _rr{n}.ogg) | RR |
|-----------------------|----|
| `sneakybass_d2_pluck` | 1–4 |
| `sneakybass_d3_pluck` | 1–4 |
| `sneakybass_ab2_finger` | 1–4 |
| `sneakybass_g2_pluck` | 1–4 |
| `sneakybass_g3_pluck` | 1–4 |
| `sneakybass_d3_finger` | 1–4 |
| `sneakybass_c2_pluck` | 1–4 |
| `sneakybass_c3_pluck` | 1–4 |
| `sneakybass_g2_finger` | 1–4 |

---

## Уровень 4 — Chord Tones (root–third–fifth–seventh)

Сильные доли (1, 3) → **pluck**. Слабые (2, 4) → **finger**. Октавы фиксированы.

| Такт | Аккорд | Доля 1 | Доля 2 | Доля 3 | Доля 4 |
|------|--------|--------|--------|--------|--------|
| 1 | Dm7b5 | D2/pluck | F2/finger | Ab2/pluck | C3/finger |
| 2 | G7b9 | G2/pluck | B2/finger | D3/pluck | F3/finger |
| 3 | Cm7 | C2/pluck | Eb2/finger | G2/pluck | Bb2/finger |
| 4 | Dm7b5 | D2/pluck | F2/finger | Ab2/pluck | C3/finger |
| 5 | G7b9 | G2/pluck | B2/finger | D3/pluck | F3/finger |
| 6 | Cm7 | C2/pluck | Eb2/finger | G2/pluck | Bb2/finger |
| 7 | Dm7b5 | D2/pluck | F2/finger | Ab2/pluck | C3/finger |
| 8 | G7b9 | G2/pluck | B2/finger | D3/pluck | F3/finger |

### Уникальные сэмплы (уровень 4)

| Файл (без _rr{n}.ogg) | RR |
|-----------------------|----|
| `sneakybass_d2_pluck` | 1–4 |
| `sneakybass_f2_finger` | 1–4 |
| `sneakybass_ab2_pluck` | 1–4 |
| `sneakybass_c3_finger` | 1–4 |
| `sneakybass_g2_pluck` | 1–4 |
| `sneakybass_b2_finger` | 1–4 |
| `sneakybass_d3_pluck` | 1–4 |
| `sneakybass_f3_finger` | 1–4 |
| `sneakybass_c2_pluck` | 1–4 |
| `sneakybass_eb2_finger` | 1–4 |
| `sneakybass_bb2_finger` | 1–4 |

---

## Уровень 5 — Walking Bass + Chromatic Approach

Доли 1–3: root–third–fifth. Доля 4 (последняя): хроматический подход к root следующего аккорда.  
Чётный `barIndex` → подход сверху (+1 полутон). Нечётный → снизу (–1 полутон).  
Артикуляция: доли 1, 3 → **pluck** (кроме доли 4 → всегда **finger**).

| Такт | barIndex | Аккорд | Доля 1 | Доля 2 | Доля 3 | Доля 4 |
|------|----------|--------|--------|--------|--------|--------|
| 1 | 0 (чёт) | Dm7b5 | D2/pluck | F2/finger | Ab2/pluck | Ab2/finger ¹ |
| 2 | 1 (нечёт) | G7b9 | G2/pluck | B2/finger | D3/pluck | B1/finger ² |
| 3 | 2 (чёт) | Cm7 | C2/pluck | Eb2/finger | G2/pluck | Eb2/finger ³ |
| 4 | 3 (нечёт) | Dm7b5 | D2/pluck | F2/finger | Ab2/pluck | Gb2/finger ⁴ |
| 5 | 4 (чёт) | G7b9 | G2/pluck | B2/finger | D3/pluck | Db2/finger ⁵ |
| 6 | 5 (нечёт) | Cm7 | C2/pluck | Eb2/finger | G2/pluck | Db2/finger ⁶ |
| 7 | 6 (чёт) | Dm7b5 | D2/pluck | F2/finger | Ab2/pluck | Ab2/finger ¹ |
| 8 | 7 (нечёт) | G7b9 | G2/pluck | B2/finger | D3/pluck | F3/finger ⁷ |

**Подходы (доля 4):**
1. Сверху к G: Ab2 (G=7, подход=8=Ab, 8>7 → oct 2)
2. Снизу к C: B1 (C=0, подход=11=B, 11≥0 → oct 2–1=1)
3. Сверху к D: Eb2 (D=2, подход=3=Eb, 3>2 → oct 2)
4. Снизу к G: Gb2 (G=7, подход=6=Gb, 6<7 → oct 2)
5. Сверху к C: Db2 (C=0, подход=1=Db, 1>0 → oct 2)
6. Снизу к D: Db2 (D=2, подход=1=Db, 1<2 → oct 2)
7. Нет следующего аккорда (конец петли) → fallback: seventh G7b9 = F3

### Уникальные сэмплы (уровень 5)

| Файл (без _rr{n}.ogg) | RR | Доля |
|-----------------------|----|------|
| `sneakybass_d2_pluck` | 1–4 | 1 |
| `sneakybass_f2_finger` | 1–4 | 2 |
| `sneakybass_ab2_pluck` | 1–4 | 3 |
| `sneakybass_ab2_finger` | 1–4 | 4 (подход ¹) |
| `sneakybass_g2_pluck` | 1–4 | 1 |
| `sneakybass_b2_finger` | 1–4 | 2 |
| `sneakybass_d3_pluck` | 1–4 | 3 |
| `sneakybass_b1_finger` | 1–4 | 4 (подход ²) |
| `sneakybass_c2_pluck` | 1–4 | 1 |
| `sneakybass_eb2_finger` | 1–4 | 2 |
| `sneakybass_g2_finger` | 1–4 | 3 (в Cm7 — G2 strong, но finger? нет: pluck) |
| `sneakybass_eb2_finger` | 1–4 | 4 (подход ³, тот же файл) |
| `sneakybass_gb2_finger` | 1–4 | 4 (подход ⁴) |
| `sneakybass_db2_finger` | 1–4 | 4 (подходы ⁵ ⁶) |
| `sneakybass_f3_finger` | 1–4 | 4 (fallback ⁷) |

> **Замечание:** Cm7 доля 3 (G2) → G2/pluck (сильная доля), не finger. Строка `sneakybass_g2_finger` не нужна — удалена.

### Финальный список (уровень 5)

| Файл (без _rr{n}.ogg) | RR |
|-----------------------|----|
| `sneakybass_d2_pluck` | 1–4 |
| `sneakybass_f2_finger` | 1–4 |
| `sneakybass_ab2_pluck` | 1–4 |
| `sneakybass_ab2_finger` | 1–4 |
| `sneakybass_g2_pluck` | 1–4 |
| `sneakybass_b2_finger` | 1–4 |
| `sneakybass_d3_pluck` | 1–4 |
| `sneakybass_b1_finger` | 1–4 |
| `sneakybass_c2_pluck` | 1–4 |
| `sneakybass_eb2_finger` | 1–4 |
| `sneakybass_gb2_finger` | 1–4 |
| `sneakybass_db2_finger` | 1–4 |
| `sneakybass_f3_finger` | 1–4 |

---

## Сводная таблица уникальных сэмплов по уровням

| Сэмпл | Lvl 1 | Lvl 2 | Lvl 3 | Lvl 4 | Lvl 5 |
|-------|:-----:|:-----:|:-----:|:-----:|:-----:|
| d2_pluck | ✓ | ✓ | ✓ | ✓ | ✓ |
| g2_pluck | ✓ | ✓ | ✓ | ✓ | ✓ |
| c2_pluck | ✓ | ✓ | ✓ | ✓ | ✓ |
| d3_finger | | ✓ ᵃ | ✓ ᵇ | | |
| g3_finger | | ✓ | | | |
| c3_finger | | ✓ | | ✓ | |
| ab2_finger | | | ✓ | | ✓ |
| g3_pluck | | | ✓ | | |
| d3_pluck | | | ✓ | ✓ | ✓ |
| c3_pluck | | | ✓ | | |
| g2_finger | | | ✓ | | |
| f2_finger | | | | ✓ | ✓ |
| ab2_pluck | | | | ✓ | ✓ |
| b2_finger | | | | ✓ | ✓ |
| f3_finger | | | | ✓ | ✓ |
| eb2_finger | | | | ✓ | ✓ |
| bb2_finger | | | | ✓ | |
| b1_finger | | | | | ✓ |
| gb2_finger | | | | | ✓ |
| db2_finger | | | | | ✓ |

ᵃ Lvl 2: Dm7b5 слабые доли → root D на окт. 3  
ᵇ Lvl 3: G7b9 слабые доли → fifth D на окт. 3 (тот же файл)

**Итого уникальных комбинаций нота+артикуляция:**
- Lvl 1: 3
- Lvl 2: 6
- Lvl 3: 9
- Lvl 4: 11
- Lvl 5: 13
