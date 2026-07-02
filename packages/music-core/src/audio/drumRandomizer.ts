import type { DrumSound } from './drumSampleRegistry.js';
import type { DrumInstrumentSettings } from './drumInstrument.js';

// ─── Hit descriptor (internal, with timing) ─────────────────────────────────────

export interface DrumHit {
  sound: DrumSound;
  /** Tick offset from bar start */
  atTick: number;
  velocity: number;
  durationTicks: number;
}

// ─── Randomizer settings ───────────────────────────────────────────────────────

export type RandomizationLevel = 'off' | 'subtle' | 'moderate' | 'high';
export type FillFrequency = 'never' | '4bars' | '8bars' | '16bars';
export type FillComplexity = 'simple' | 'medium' | 'complex';
export type DrumStyle = 'swing' | 'bossa' | 'funk';

export interface DrumRandomizerSettings {
  randomizationLevel: RandomizationLevel;
  fillFrequency: FillFrequency;
  fillComplexity: FillComplexity;
  rideVariation: boolean;
  snareGhosts: boolean;
  bassDrumVariation: boolean;
  tomEnabled: boolean;
  tomVolume: number;
}

export const DEFAULT_RANDOMIZER_SETTINGS: DrumRandomizerSettings = {
  randomizationLevel: 'off',
  fillFrequency: '8bars',
  fillComplexity: 'medium',
  rideVariation: true,
  snareGhosts: true,
  bassDrumVariation: true,
  tomEnabled: true,
  tomVolume: 0.7,
};

// ─── Bar context ───────────────────────────────────────────────────────────────

export interface BarContext {
  barIndex: number;
  /** Total number of bars in the form (0 = unknown / single bar) */
  formLength: number;
  style: DrumStyle;
  beatsPerBar: number;
  beatUnit: number;
}

// ─── Probability tables ────────────────────────────────────────────────────────

const PROBABILITY: Record<RandomizationLevel, number> = {
  off: 0,
  subtle: 0.1,
  moderate: 0.25,
  high: 0.4,
};

const FILL_INTERVAL: Record<FillFrequency, number> = {
  never: 0,
  '4bars': 4,
  '8bars': 8,
  '16bars': 16,
};

// ─── Ghost note generators ─────────────────────────────────────────────────────

interface GhostNote {
  /** Subdivision index within the beat (0 = downbeat, 1 = e, 2 = &, 3 = a) */
  sub: number;
  velocity: number;
}

function ghostNotesForStyle(
  style: DrumStyle,
  complexity: FillComplexity,
  beat: number,
  barIndex: number,
  _beatsPerBar: number,
): GhostNote[] {
  // Ghost notes only on weak subdivisions: 'e' (1) and 'a' (3)
  const candidates: { sub: number; weight: number }[] = [
    { sub: 1, weight: 0.4 }, // e
    { sub: 3, weight: 0.3 }, // a
  ];

  if (style === 'funk' && complexity === 'complex') {
    candidates.push({ sub: 2, weight: 0.15 }); // & — rare in complex funk
  }

  const seed = barIndex * 17 + beat * 31 + 1;
  const rand = pseudoRandom(seed);

  return candidates
    .filter((c) => rand() < c.weight * (style === 'funk' ? 1.3 : 1.0))
    .map((c) => ({
      sub: c.sub,
      velocity: 0.25 + rand() * 0.2,
    }));
}

// ─── Fill generators ───────────────────────────────────────────────────────────

function generateSwingFill(
  fillsPerBar: number,
  complexity: FillComplexity,
  barIndex: number,
  tomEnabled: boolean,
  _tomVolume: number,
): DrumHit[] {
  const hits: DrumHit[] = [];
  const seed = barIndex * 41 + 7;
  const rand = pseudoRandom(seed);
  const count = complexity === 'simple' ? 3 : complexity === 'medium' ? 5 : 8;

  // Snare + bass drum triplet bursts, with tom substitutions
  const hasToms = tomEnabled && complexity !== 'simple';
  const sounds: DrumSound[] = hasToms
    ? ['snare', 'bassDrum', 'highTom', 'lowTom']
    : ['snare', 'bassDrum'];
  for (let i = 0; i < count; i++) {
    const pos = Math.floor(rand() * fillsPerBar);
    const subTick = pos * (fillsPerBar / 4);
    const sound: DrumSound = sounds[Math.floor(rand() * sounds.length)]!;
    hits.push({
      sound,
      atTick: Math.round(subTick),
      velocity: 0.5 + rand() * 0.4,
      durationTicks: 120,
    });
  }
  return hits;
}

function generateBossaFill(
  fillsPerBar: number,
  complexity: FillComplexity,
  barIndex: number,
  tomEnabled: boolean,
  _tomVolume: number,
): DrumHit[] {
  const hits: DrumHit[] = [];
  const seed = barIndex * 53 + 11;
  const rand = pseudoRandom(seed);

  // Rim clave variations
  const rimTicks = [0, fillsPerBar / 4, fillsPerBar / 2]; // beats 1, 2, 3
  for (const tick of rimTicks) {
    if (rand() < 0.7) {
      hits.push({
        sound: 'rim',
        atTick: Math.round(tick),
        velocity: 0.6 + rand() * 0.3,
        durationTicks: 240,
      });
    }
  }

  if (complexity !== 'simple') {
    // Add syncopated bass drum
    hits.push({
      sound: 'bassDrum',
      atTick: Math.round((fillsPerBar / 4) * 1.5), // offbeat of beat 2
      velocity: 0.5 + rand() * 0.3,
      durationTicks: 240,
    });
    // Tom accents on complex fills
    if (tomEnabled && complexity === 'complex') {
      hits.push({
        sound: 'highTom',
        atTick: Math.round((fillsPerBar / 8) * 11), // late offbeat
        velocity: 0.6,
        durationTicks: 200,
      });
      hits.push({
        sound: 'lowTom',
        atTick: Math.round((fillsPerBar * 7) / 8), // beat 4&
        velocity: 0.65,
        durationTicks: 200,
      });
    }
  }
  return hits;
}

function generateFunkFill(
  fillsPerBar: number,
  complexity: FillComplexity,
  barIndex: number,
  tomEnabled: boolean,
  _tomVolume: number,
): DrumHit[] {
  const hits: DrumHit[] = [];
  const seed = barIndex * 67 + 13;
  const rand = pseudoRandom(seed);

  // 16th-note snare fill + crash accent
  hits.push({
    sound: 'crash',
    atTick: 0,
    velocity: 0.8 + rand() * 0.2,
    durationTicks: fillsPerBar,
  });

  const count = complexity === 'simple' ? 4 : complexity === 'medium' ? 7 : 12;

  // Tom run on medium+ fills when toms are enabled
  const useToms = tomEnabled && complexity !== 'simple';
  if (useToms) {
    // Descending tom run: highTom → lowTom with snare ghosting
    const tomSteps = complexity === 'complex' ? 4 : 2;
    for (let i = 0; i < tomSteps; i++) {
      const pos = (fillsPerBar / (tomSteps + 1)) * (i + 1);
      hits.push({
        sound: i % 2 === 0 ? 'highTom' : 'lowTom',
        atTick: Math.round(pos),
        velocity: 0.5 + rand() * 0.35,
        durationTicks: 120,
      });
    }
  }

  // Fill remaining slots with snare hits
  const remaining = useToms ? Math.max(0, count - (complexity === 'complex' ? 4 : 2)) : count;
  for (let i = 0; i < remaining; i++) {
    const pos = Math.floor(rand() * fillsPerBar);
    hits.push({
      sound: 'snare',
      atTick: Math.round(pos),
      velocity: 0.4 + rand() * 0.4,
      durationTicks: 80,
    });
  }
  return hits;
}

// ─── Pseudo-random number generator (deterministic per bar, for tests) ──────────

function pseudoRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════
// DrumRandomizer
// ═══════════════════════════════════════════════════════════════════════════════════

export class DrumRandomizer {
  private settings: DrumRandomizerSettings = { ...DEFAULT_RANDOMIZER_SETTINGS };
  private mathRandom: () => number;

  constructor(settings?: Partial<DrumRandomizerSettings>, rng: () => number = Math.random) {
    if (settings) this.updateSettings(settings);
    this.mathRandom = rng;
  }

  updateSettings(patch: Partial<DrumRandomizerSettings>): void {
    Object.assign(this.settings, patch);
  }

  // ── Public query methods ───────────────────────────────────────────────────

  shouldVaryRide(barIndex: number, formLength: number): boolean {
    if (this.settings.randomizationLevel === 'off' || !this.settings.rideVariation) return false;
    // Don't vary ride on the last bar (resolution)
    if (formLength > 0 && barIndex === formLength - 1) return false;
    return this.mathRandom() < PROBABILITY[this.settings.randomizationLevel];
  }

  shouldVaryBassDrum(_barIndex: number): boolean {
    if (this.settings.randomizationLevel === 'off' || !this.settings.bassDrumVariation)
      return false;
    return this.mathRandom() < PROBABILITY[this.settings.randomizationLevel];
  }

  shouldFill(barIndex: number): boolean {
    const interval = FILL_INTERVAL[this.settings.fillFrequency];
    if (interval <= 0) return false;
    return barIndex % interval === interval - 1;
  }

  shouldAddGhostNotes(_barIndex: number, _beat: number, _beatsPerBar: number): boolean {
    if (this.settings.randomizationLevel === 'off' || !this.settings.snareGhosts) return false;
    // Ghost notes probability scales with level
    return this.mathRandom() < PROBABILITY[this.settings.randomizationLevel] * 1.5;
  }

  // ── Main apply method ──────────────────────────────────────────────────────

  /**
   * Apply randomization to a set of drum hits for a given bar.
   * Modifies the array in place and returns it.
   */
  apply(hits: DrumHit[], ctx: BarContext): DrumHit[] {
    if (this.settings.randomizationLevel === 'off') return hits;

    const prob = PROBABILITY[this.settings.randomizationLevel];
    const fillsPerBar = ctx.beatsPerBar * 480; // PPQ per bar

    // ── Ride variation: vary velocity, occasionally omit ──
    if (this.settings.rideVariation) {
      // Iterate in reverse so splice doesn't invalidate remaining indices
      for (let i = hits.length - 1; i >= 0; i--) {
        if (hits[i]!.sound !== 'ride') continue;
        const hit = hits[i]!;
        if (this.mathRandom() < prob * 0.8) {
          hit.velocity *= 0.85 + this.mathRandom() * 0.3;
        }
        if (this.mathRandom() < prob * 0.3) {
          hits.splice(i, 1);
        }
      }
    }

    // ── Bass drum variation: velocity changes, occasional ghost kick ──
    if (this.settings.bassDrumVariation) {
      for (const hit of hits) {
        if (hit.sound === 'bassDrum') {
          if (this.mathRandom() < prob * 0.5) {
            hit.velocity *= 0.7 + this.mathRandom() * 0.6;
          }
        }
      }
      // Occasional extra ghost kick on weak beat
      if (this.mathRandom() < prob * 0.2) {
        const weakPositions = [
          fillsPerBar / 8, // 1&
          (fillsPerBar * 3) / 8, // 2&
          (fillsPerBar * 5) / 8, // 3&
          (fillsPerBar * 7) / 8, // 4&
        ];
        const pos = weakPositions[Math.floor(this.mathRandom() * weakPositions.length)]!;
        hits.push({
          sound: 'bassDrum',
          atTick: Math.round(pos),
          velocity: 0.2 + this.mathRandom() * 0.15,
          durationTicks: 240,
        });
      }
    }

    // ── Snare ghost notes (only when randomization is active) ──
    if (this.settings.snareGhosts) {
      for (let beat = 0; beat < ctx.beatsPerBar; beat++) {
        if (ctx.style === 'bossa') continue; // No snare in bossa
        // Ghosts only on weak beats (e, a), not on strong beats (2, 4 in 4/4)
        const isStrongBackbeat = ctx.beatsPerBar === 4 && (beat === 1 || beat === 3);
        if (isStrongBackbeat) continue;

        const ghosts = ghostNotesForStyle(
          ctx.style,
          this.settings.fillComplexity,
          beat,
          ctx.barIndex,
          ctx.beatsPerBar,
        );
        for (const g of ghosts) {
          const subTick =
            g.sub === 0
              ? 0
              : g.sub === 1
                ? Math.round(fillsPerBar / ctx.beatsPerBar / 4)
                : g.sub === 2
                  ? Math.round(fillsPerBar / ctx.beatsPerBar / 2)
                  : Math.round(((fillsPerBar / ctx.beatsPerBar) * 3) / 4);
          hits.push({
            sound: 'snare',
            atTick: beat * (fillsPerBar / ctx.beatsPerBar) + subTick,
            velocity: g.velocity,
            durationTicks: 60,
          });
        }
      }
    }

    // ── Fills ──
    if (this.shouldFill(ctx.barIndex)) {
      let fillHits: DrumHit[];
      const { fillComplexity, tomEnabled, tomVolume } = this.settings;
      switch (ctx.style) {
        case 'bossa':
          fillHits = generateBossaFill(
            fillsPerBar,
            fillComplexity,
            ctx.barIndex,
            tomEnabled,
            tomVolume,
          );
          break;
        case 'funk':
          fillHits = generateFunkFill(
            fillsPerBar,
            fillComplexity,
            ctx.barIndex,
            tomEnabled,
            tomVolume,
          );
          break;
        default:
          fillHits = generateSwingFill(
            fillsPerBar,
            fillComplexity,
            ctx.barIndex,
            tomEnabled,
            tomVolume,
          );
      }

      // Remove existing snare/rim/bassDrum hits on beat 4 to avoid clashes
      const fillStart = Math.round((fillsPerBar * 3) / 4); // beat 4
      for (let i = hits.length - 1; i >= 0; i--) {
        if (
          hits[i]!.atTick >= fillStart &&
          (hits[i]!.sound === 'snare' || hits[i]!.sound === 'rim' || hits[i]!.sound === 'bassDrum')
        ) {
          hits.splice(i, 1);
        }
      }

      // Offset fill hits to start from beat 4
      for (const fh of fillHits) {
        hits.push({
          ...fh,
          atTick: fillStart + fh.atTick,
        });
      }
    }

    return hits;
  }
}

// ─── Quick integration helper ──────────────────────────────────────────────────

/** Map from instrument settings to randomizer settings */
export function randomizerSettingsFrom(
  drums: Partial<DrumInstrumentSettings> & {
    randomizationLevel?: RandomizationLevel;
    fillFrequency?: FillFrequency;
    fillComplexity?: FillComplexity;
    rideVariation?: boolean;
    snareGhosts?: boolean;
    bassDrumVariation?: boolean;
    tomEnabled?: boolean;
    tomVolume?: number;
  },
): DrumRandomizerSettings {
  return {
    randomizationLevel: drums.randomizationLevel ?? 'off',
    fillFrequency: drums.fillFrequency ?? '8bars',
    fillComplexity: drums.fillComplexity ?? 'medium',
    rideVariation: drums.rideVariation ?? true,
    snareGhosts: drums.snareGhosts ?? true,
    bassDrumVariation: drums.bassDrumVariation ?? true,
    tomEnabled: drums.tomEnabled ?? true,
    tomVolume: drums.tomVolume ?? 0.7,
  };
}
