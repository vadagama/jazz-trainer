/**
 * Rhodes sampler URL builders + role labels (Rhodes-специфичные).
 *
 * Reuses the jRhodes3c anchor-note map (15 notes F1–C7) from music-core's
 * sample registry. Provides `selectRhodesVoicingRole` resolution labels for
 * the 9 voicing roles (chord/shell/top/bass/upper + arp1..arp4).
 */
import type { RhodesVoicingRole } from '@jazz/music-core';

/** Rhodes comping register: C3 (48) to C6 (84) — same as piano. */
export const NOTE_MIN = 48;
export const NOTE_MAX = 84;

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * All Rhodes voicing roles available for adding new atoms in the molecule
 * editor. Extends piano's VoiceRole with `arp1..arp4` (positional voicing
 * notes for arpeggio lines). See docs/RHODES.md.
 */
export const RHODES_ROLES: readonly RhodesVoicingRole[] = [
  'arp4',
  'arp3',
  'arp2',
  'arp1',
  'upper',
  'top',
  'shell',
  'chord',
  'bass',
];

/** Short labels — must fit the narrow piano-roll row-label column. */
const ROLE_LABELS: Record<string, string> = {
  chord: 'Аккорд',
  shell: 'Shell',
  top: 'Верх',
  bass: 'Бас',
  upper: 'Надстр.',
  arp1: 'Арп 1',
  arp2: 'Арп 2',
  arp3: 'Арп 3',
  arp4: 'Арп 4',
};

/** Full description for tooltips. */
const ROLE_DESCRIPTIONS: Record<string, string> = {
  chord: 'Аккорд — весь текущий voicing (пад/блок)',
  shell: 'Shell — 3 + 7 (нижние 2 ноты)',
  top: 'Верхний голос voicing’а (мелодия/педаль)',
  bass: 'Бас — самый нижний голос',
  upper: 'Надстройка / цветные тона выше shell',
  arp1: 'Арпеджио 1 — нижняя нота voicing’а',
  arp2: 'Арпеджио 2 — вторая нота voicing’а',
  arp3: 'Арпеджио 3 — третья нота voicing’а',
  arp4: 'Арпеджио 4 — верхняя нота voicing’а',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function roleDescription(role: string): string {
  return ROLE_DESCRIPTIONS[role] ?? role;
}

export function midiToName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  return `${NOTE_NAMES[pc]}${Math.floor(midi / 12) - 1}`;
}

// ─── Sampler anchors (jRhodes3c, medium layer) ───────────────────────────────

/** Anchor notes from the jRhodes3c medium velocity layer (see rhodesSampleRegistry). */
const RHODES_ANCHORS: Record<string, string> = {
  F1: 'As_029__F1_279-mono.m4a',
  B1: 'As_035__B1_281-mono.m4a',
  E2: 'As_040__E2_283-mono.m4a',
  A2: 'As_045__A2_285-mono.m4a',
  D3: 'As_050__D3_287-mono.m4a',
  G3: 'As_055__G3_289-mono.m4a',
  B3: 'As_059__B3_291-mono.m4a',
  D4: 'As_062__D4_293-mono.m4a',
  F4: 'As_065__F4_295-mono.m4a',
  B4: 'As_071__B4_297-mono.m4a',
  E5: 'As_076__E5_299-mono.m4a',
};

const ANCHOR_NOTE_NAMES: Record<string, number> = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11,
};

function nearestAnchor(midi: number, anchors: Record<string, string>): string | undefined {
  let bestDist = Infinity;
  let bestNote: string | undefined;
  for (const key of Object.keys(anchors)) {
    const m = /^([A-G]#?)(\d+)$/.exec(key);
    if (!m) continue;
    const octave = parseInt(m[2]!, 10);
    const anchorMidi = (octave + 1) * 12 + (ANCHOR_NOTE_NAMES[m[1]!] ?? 0);
    const dist = Math.abs(midi - anchorMidi);
    if (dist < bestDist) {
      bestDist = dist;
      bestNote = key;
    }
  }
  return bestNote;
}

/** Build sampler URLs for the jRhodes3c (medium velocity layer). */
export function buildRhodesSamplerUrls(): Record<string, string> {
  const urls: Record<string, string> = {};
  const base = '/samples/aac/rhodes/';
  for (let midi = NOTE_MIN; midi <= NOTE_MAX; midi++) {
    const anchor = nearestAnchor(midi, RHODES_ANCHORS);
    if (anchor && RHODES_ANCHORS[anchor]) {
      urls[midiToName(midi)] = base + RHODES_ANCHORS[anchor];
    }
  }
  return urls;
}
