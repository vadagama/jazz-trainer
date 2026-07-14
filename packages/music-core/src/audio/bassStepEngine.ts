/**
 * Bass step engine — decides *which* chord step each bass atom plays.
 *
 * Mirrors {@link buildPianoVoicing} / {@link selectVoicingRole} for piano:
 * molecules carry only an articulation (the "how"), and this module supplies
 * the "what" (the chord degree) at runtime from the current style, tension,
 * phrasing, and beat position. A single molecule therefore sounds correct
 * over any chord, key, and tension setting.
 *
 * The decision is **deterministic** for a given (bar, beat, beat-fraction)
 * so playback is repeatable across runs — no unseeded randomness. A
 * {@link BassRandomizer} can still add variety to `approach` notes upstream.
 */
import type { ChordSymbol } from '@jazz/shared';
import type { BassPatternStyle, BassStep, BassTensionLevel } from './bassPatternTypes.js';
import type { BassPattern } from './bassInstrument.js';

/**
 * Per-style tension gate: which tension levels introduce each "color" step
 * family beyond root/fifth. The thresholds are cumulative — `altered`
 * inherits everything from `moderate`, `max` inherits from `altered`.
 */
const TENSION_THRESHOLD: Record<
  /** color family */
  'third' | 'seventh' | 'approach' | 'chromatic' | 'octave',
  BassTensionLevel[]
> = {
  third: ['moderate', 'altered', 'max'],
  seventh: ['altered', 'max'],
  approach: ['moderate', 'altered', 'max'],
  chromatic: ['max'],
  octave: ['altered', 'max'],
};

function tensionAllows(family: keyof typeof TENSION_THRESHOLD, t: BassTensionLevel): boolean {
  return TENSION_THRESHOLD[family].includes(t);
}

export interface ResolveBassStepOptions {
  /** Current pattern family (walking / root-5th / montuno / syncopated / two-feel). */
  pattern: BassPattern;
  /** Harmonic tension level (the user-facing "color" knob). */
  tension: BassTensionLevel;
  /**
   * Optional override: when the engine knows the `approach` step should resolve
   * a specific way (e.g. a molecule-encoded last-beat anticipation), it passes
   * the next chord; the engine then yields `approach`. The actual pitch is
   * resolved upstream by {@link resolveBassStepPitch}.
   */
  nextChord?: ChordSymbol | null;
}

/**
 * Resolve the {@link BassStep} for an atom landing at `atTick` within a bar of
 * `tpBar` ticks, given the current pattern family and tension.
 *
 * The function encodes idiomatic bass-line voice-leading per pattern family,
 * progressively unlocking higher color steps as tension rises:
 *
 *  - **walking** (swing): beats 1→root, 2→fifth/third, 3→root/color,
 *    4→approach. Tension widens the inner-beat choices.
 *  - **root-5th** (bossa): beat 1→root, beat 3→fifth (octave at higher tension).
 *  - **two-feel** (ballad): beats 1/3 → root/fifth (half-note slots).
 *  - **syncopated** (funk): downbeats → root; offbeats → fifth/octave; the
 *    step chosen for a syncopation depends on its beat-fraction.
 *  - **montuno** (latin): beat 1 → root; the "& of 2" → fifth; beat 4 → octave.
 *
 * `atTick` is the atom's tick offset within the bar (straight, pre-swing).
 * `tpBeat` is ticks per beat (PPQ in 4/4). When `atTick` is in the last beat of
 * the bar and `nextChord` differs from the current chord, an `approach` step is
 * yielded (chromatic/diatonic motion into the next root).
 */
export function resolveBassStep(
  atTick: number,
  tpBeat: number,
  tpBar: number,
  chord: ChordSymbol,
  opts: ResolveBassStepOptions,
): BassStep {
  const { pattern, tension } = opts;
  const beat = Math.floor(atTick / tpBeat) % 4; // 0..3
  const within = (atTick % tpBeat) / tpBeat; // 0..<1 within the beat

  // ── Last-beat anticipation → approach into next chord (all walking-ish
  //    patterns). Only when a distinct next chord exists AND tension allows.
  const inLastBeat = atTick >= tpBar - tpBeat;
  if (
    inLastBeat &&
    opts.nextChord &&
    opts.nextChord.raw !== chord.raw &&
    tensionAllows('approach', tension)
  ) {
    return 'approach';
  }

  switch (pattern) {
    case 'walking':
      return walkingStep(beat, within, tension);
    case 'root-5th':
      return rootFifthStep(beat, within, tension);
    case 'two-feel':
      return twoFeelStep(beat, within, tension);
    case 'syncopated':
      return syncopatedStep(beat, within, tension);
    case 'montuno':
      return montunoStep(beat, within, tension);
    default:
      return 'root';
  }
}

// ─── Per-pattern step tables ─────────────────────────────────────────────────

function walkingStep(beat: number, within: number, t: BassTensionLevel): BassStep {
  // Downbeats anchor the root; inner beats walk through chord tones; beat 4
  // leads into the next bar (approach handled above, but we still pick a
  // colorful step when there is no chord change).
  if (beat === 0) return 'root';
  if (beat === 2) {
    // Mid-bar: fifth by default (so half-note patterns get root→fifth).
    // At higher tension: octave/seventh on offbeats; max adds on-beat seventh.
    if (within > 0.5 && tensionAllows('octave', t)) return 'octave';
    if (within > 0.3 && tensionAllows('seventh', t)) return 'seventh';
    if (tensionAllows('chromatic', t) && within < 0.1) return 'seventh';
    if (within > 0.5 && tensionAllows('third', t)) return 'third';
    return 'fifth';
  }
  if (beat === 1) {
    // Second quarter: third at moderate+; chromatic passing at max (bebop pickup).
    if (tensionAllows('chromatic', t) && within > 0.3) return 'approach';
    if (tensionAllows('third', t)) return 'third';
    return 'fifth';
  }
  // beat === 3 (last beat): chromatic lead-in at max (even without chord change);
  // otherwise leading color tone.
  if (tensionAllows('chromatic', t)) return 'approach';
  if (tensionAllows('seventh', t)) return 'seventh';
  if (tensionAllows('third', t)) return 'third';
  return 'fifth';
}

function rootFifthStep(beat: number, within: number, t: BassTensionLevel): BassStep {
  // Bossa: root on 1, fifth on 3 (half-notes). Octave lift at altered+.
  if (beat === 0) return 'root';
  if (beat === 2) {
    if (tensionAllows('octave', t) && within > 0.4) return 'octave';
    return 'fifth';
  }
  // Off-grid hits in a root-5th pattern are sparse; default to root.
  if (beat === 3 && within > 0.5 && tensionAllows('approach', t)) return 'approach';
  return 'root';
}

function twoFeelStep(beat: number, _within: number, t: BassTensionLevel): BassStep {
  // Ballad two-feel: root on 1, root/fifth on 3.
  if (beat === 0) return 'root';
  if (beat === 2) return tensionAllows('third', t) ? 'fifth' : 'root';
  if (beat === 3 && tensionAllows('approach', t)) return 'approach';
  return 'root';
}

function syncopatedStep(beat: number, within: number, t: BassTensionLevel): BassStep {
  // Funk: downbeats → root; "&" offbeats → fifth/octave/seventh by tension;
  // 16th/32nd chatter → chord color. The articulation (muted/stac/rel) is
  // already encoded in the molecule; here we only pick the step.
  if (beat === 0 && within < 0.5) return 'root';
  if (within >= 0.5) {
    // Offbeat / syncopation
    if (tensionAllows('seventh', t)) return 'seventh';
    if (tensionAllows('octave', t)) return 'octave';
    return 'fifth';
  }
  // Downbeat-side 16ths
  if (tensionAllows('third', t)) return 'third';
  return 'root';
}

function montunoStep(beat: number, within: number, t: BassTensionLevel): BassStep {
  // Latin tumbão: root on 1, fifth on the "& of 2", root on 3, octave on 4.
  if (beat === 0) return 'root';
  if (beat === 1 && within >= 0.5) return 'fifth';
  if (beat === 2) return 'root';
  if (beat === 3) {
    if (tensionAllows('octave', t)) return 'octave';
    if (tensionAllows('seventh', t)) return 'seventh';
    return 'fifth';
  }
  if (beat === 1 && within < 0.5) return 'root';
  return 'root';
}
