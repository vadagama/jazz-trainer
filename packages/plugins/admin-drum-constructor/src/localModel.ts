import {
  DEFAULT_DRUM_SETTINGS,
  type DrumAtom,
  type DrumMolecule,
  type DrumCell,
  type DrumOrganism,
  type DrumPatternStyle,
  type DrumInstrumentSettings,
  type DrumSound,
} from '@jazz/music-core';

export const PPQ = 480;
export const BEATS_PER_BAR = 4;

export const STYLES: DrumPatternStyle[] = ['swing', 'bossa', 'funk', 'latin', 'ballad'];

export const STYLE_LABELS: Record<DrumPatternStyle, string> = {
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
export function subdivisionsPerBeat(style: DrumPatternStyle): number {
  return style === 'swing' || style === 'ballad' ? 3 : 4;
}

export function ticksPerCol(style: DrumPatternStyle): number {
  return PPQ / subdivisionsPerBeat(style);
}

export function colsPerBar(style: DrumPatternStyle): number {
  return subdivisionsPerBeat(style) * BEATS_PER_BAR;
}

export function tickToCol(tick: number, style: DrumPatternStyle): number {
  return Math.round(tick / ticksPerCol(style));
}

export function colToTick(col: number, style: DrumPatternStyle): number {
  return col * ticksPerCol(style);
}

/** Подпись деления вида "1", "1e", "1&", "1a" (16-е) или "1", "1t", "1l" (триоли). */
export function colLabel(col: number, style: DrumPatternStyle): string {
  const sub = subdivisionsPerBeat(style);
  const beat = Math.floor(col / sub) + 1;
  const within = col % sub;
  if (within === 0) return String(beat);
  if (sub === 4) return `${beat}${['', 'e', '&', 'a'][within]}`;
  return `${beat}${['', 't', 'l'][within]}`;
}

// ─── Строки таблицы: подписи и порядок звуков ────────────────────────────────

export interface SoundRow {
  sound: DrumSound;
  label: string;
}

/**
 * Подписи звуков. Покрывают И абстрактные имена (swing/bossa/latin),
 * И конкретные артикуляции (funk/ballad авторят атомы прямо в них:
 * snare_rimshot, snare_buzz, crash_sizzle, hihat_closed…).
 */
export const SOUND_LABELS: Record<string, string> = {
  crash: 'Crash',
  crash_sizzle: 'Crash sizzle',
  splash: 'Splash',
  ride: 'Ride',
  ride_bow: 'Ride',
  ride_bell: 'Ride bell',
  hihat: 'HH',
  hihat_closed: 'HH закр.',
  hihat_open: 'HH откр.',
  hihatHalf: 'HH half',
  hihatOpen: 'HH откр.',
  hihat_foot: 'HH нога',
  hihat_stir: 'Stir',
  snare: 'Snare',
  snare_center: 'Snare',
  snare_edge: 'Snare edge',
  snare_dig: 'Snare dig',
  snare_buzz: 'Snare buzz',
  snare_flam: 'Snare flam',
  snare_rimshot: 'Rimshot',
  snare_crossstick: 'Cross-stick',
  snare_muted: 'Snare muted',
  rim: 'Rim',
  highTom: 'Том выс.',
  lowTom: 'Том низ.',
  tom_hi: 'Том выс.',
  tom_lo: 'Том низ.',
  tom_mhi: 'Том ср.-в.',
  tom_mlow: 'Том ср.-н.',
  bassDrum: 'BD',
  kick: 'BD',
};

export function soundLabel(sound: string): string {
  return SOUND_LABELS[sound] ?? sound;
}

/** Порядок строк сверху вниз: тарелки → райд → хэт → малый → томы → бочка. */
export function soundOrder(sound: string): number {
  if (sound.startsWith('crash') || sound === 'splash') return 0;
  if (sound.startsWith('ride')) return 1;
  if (sound.startsWith('hihat')) return 2;
  if (sound.startsWith('snare') || sound === 'rim') return 3;
  if (sound.startsWith('tom') || sound === 'highTom' || sound === 'lowTom') return 4;
  if (sound === 'bassDrum' || sound === 'kick') return 5;
  return 6;
}

/** Строки таблицы для конкретной молекулы: по фактически используемым звукам. */
export function moleculeRows(sounds: Iterable<DrumSound>): SoundRow[] {
  const uniq = Array.from(new Set(sounds));
  return uniq
    .map((sound) => ({ sound, label: soundLabel(sound) }))
    .sort((a, b) => soundOrder(a.sound) - soundOrder(b.sound));
}

// ─── Глубокие копии (правим локально, глобальный реестр не трогаем) ───────────

export function cloneMolecule(m: DrumMolecule): DrumMolecule {
  return {
    ...m,
    atoms: m.atoms.map((a) => ({ ...a })),
    tags: [...m.tags],
    complexity: { ...m.complexity },
    conditions: m.conditions ? { ...m.conditions } : undefined,
  };
}

export function cloneCell(c: DrumCell): DrumCell {
  return {
    ...c,
    timeSignature: [...c.timeSignature] as DrumCell['timeSignature'],
    dynamics: { ...c.dynamics },
    lanes: c.lanes.map((l) => ({
      ...l,
      clips: l.clips.map((cl) => ({ ...cl, pool: [...cl.pool] })),
    })),
  };
}

export function cloneOrganism(o: DrumOrganism): DrumOrganism {
  const sectionMap: DrumOrganism['sectionMap'] = {};
  for (const [key, pool] of Object.entries(o.sectionMap)) {
    sectionMap[key as keyof typeof sectionMap] = [...pool];
  }
  const overrides: Record<string, Record<string, string[]>> = {};
  if (o.timeSignatureOverrides) {
    for (const [ts, map] of Object.entries(o.timeSignatureOverrides)) {
      const tsMap: Record<string, string[]> = {};
      for (const [sec, pool] of Object.entries(map)) {
        tsMap[sec] = [...pool];
      }
      overrides[ts] = tsMap;
    }
  }
  return {
    ...o,
    sectionMap,
    ...(Object.keys(overrides).length > 0 ? { timeSignatureOverrides: overrides } : {}),
    defaultForm: o.defaultForm?.map((s) => ({ ...s, cellPool: [...s.cellPool] })),
  };
}

/** Настройки для превью. */
export function previewSettings(): DrumInstrumentSettings {
  return { ...DEFAULT_DRUM_SETTINGS, enabled: true, volume: 0.7 };
}

/** Стандартная velocity при добавлении нового удара. */
export const DEFAULT_ATOM_VELOCITY = 0.7;
export const DEFAULT_ATOM_DURATION = PPQ;

export function makeAtom(sound: DrumSound, atTick: number): DrumAtom {
  return { sound, atTick, velocity: DEFAULT_ATOM_VELOCITY, durationTicks: DEFAULT_ATOM_DURATION };
}
