/**
 * Единая grid-математика для конструкторов ударных и мелодических инструментов.
 *
 * Извлечена из дублированных localModel.ts обоих плагинов. Инструмент-агностична:
 * стиль определяет только сетку (триоли для swing/ballad, 16-е для остальных),
 * а не звук/высоту.
 *
 * Все функции принимают optional `subdivisions` (делений на долю) — по умолчанию
 * берётся {@link subdivisionsPerBeat}. Бас-конструктор передаёт `8` (32-е) чтобы
 * получить более мелкую сетку для funk/latin; барабаны/пианино/перкуссия не
 * передают его и остаются на прежнем разрешении (3 или 4).
 */

export const PPQ = 480;
export const BEATS_PER_BAR = 4;

export const STYLES = ['swing', 'bossa', 'funk', 'latin', 'ballad'] as const;
export type ConstructorStyle = (typeof STYLES)[number];

export const STYLE_LABELS: Record<ConstructorStyle, string> = {
  swing: 'Swing',
  bossa: 'Bossa Nova',
  funk: 'Funk',
  latin: 'Latin',
  ballad: 'Ballad',
};

/**
 * Сетка авторинга: swing/ballad мыслятся триолями (3 деления на долю),
 * bossa/funk/latin — шестнадцатыми (4 деления на долю).
 */
export function subdivisionsPerBeat(style: string): 3 | 4 {
  return style === 'swing' || style === 'ballad' ? 3 : 4;
}

/**
 * Делений на долю: явное значение, если передано, иначе {@link subdivisionsPerBeat}.
 * Бас передаёт 8 для 32-х нот; барабаны/пианино/перкуссия — ничего (3 или 4).
 */
function resolveSub(style: string, subdivisions?: number): number {
  return subdivisions ?? subdivisionsPerBeat(style);
}

export function ticksPerCol(style: string, subdivisions?: number): number {
  return PPQ / resolveSub(style, subdivisions);
}

export function colsPerBar(style: string, subdivisions?: number): number {
  return resolveSub(style, subdivisions) * BEATS_PER_BAR;
}

export function tickToCol(tick: number, style: string, subdivisions?: number): number {
  return Math.round(tick / ticksPerCol(style, subdivisions));
}

export function colToTick(col: number, style: string, subdivisions?: number): number {
  return col * ticksPerCol(style, subdivisions);
}

/**
 * Подпись деления: "1", "1e", "1&", "1a" (16-е), "1", "1t", "1l" (триоли),
 * или для 32-х (sub=8): первая половина доли "1 e & a", вторая "1·e 1·& 1·a".
 */
export function colLabel(col: number, style: string, subdivisions?: number): string {
  const sub = resolveSub(style, subdivisions);
  const beat = Math.floor(col / sub) + 1;
  const within = col % sub;
  if (within === 0) return String(beat);
  if (sub === 3) return `${beat}${['', 't', 'l'][within]}`;
  if (sub === 4) return `${beat}${['', 'e', '&', 'a'][within]}`;
  // sub === 8 (32-е): вторая половина доли помечается точкой-разделителем.
  if (sub === 8) {
    const half = within < 4 ? ['', 'e', '&', 'a'][within] : ['·', '·e', '·&', '·a'][within - 4];
    return `${beat}${half}`;
  }
  return `${beat}.${within}`;
}

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
}
