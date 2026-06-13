import {
  ticksPerBeat,
  ticksPerBar,
  defaultStrongBeats,
  defaultSecondStrongBeats,
} from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { DrumSound } from './drumSampleRegistry.js';

const PPQ = 480;

// ─── Pattern types ────────────────────────────────────────────────────────────

export type DrumsPattern = 'swing' | 'bossa' | 'funk';

/** @deprecated Use DrumsPattern instead. */
export type DrumRidePattern = 'quarters' | 'swingRide';

export type HumanizeIntensity = 'off' | 'low' | 'med' | 'high';

const HUMANIZE_PARAMS: Record<HumanizeIntensity, { timingMs: number; velocity: number }> = {
  off: { timingMs: 0, velocity: 0 },
  low: { timingMs: 3, velocity: 0.03 },
  med: { timingMs: 5, velocity: 0.05 },
  high: { timingMs: 8, velocity: 0.08 },
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface DrumInstrumentSettings {
  /** Master on/off */
  enabled: boolean;
  /** Master volume 0–1 */
  volume: number;
  /** Pattern: swing, bossa, funk */
  pattern: DrumsPattern;

  // Per-sound
  bassDrumEnabled: boolean;
  bassDrumVolume: number;
  snareEnabled: boolean;
  snareVolume: number;
  hihatEnabled: boolean;
  hihatVolume: number;
  /** 0 (tight closed) – 5 (wide open) */
  hihatOpenness: number;
  rideEnabled: boolean;
  rideVolume: number;
  crashEnabled: boolean;
  crashVolume: number;
  /** Crash accent every N bars (0 = never) */
  crashFrequency: number;
  rimEnabled: boolean;
  rimVolume: number;

  humanizeIntensity: HumanizeIntensity;

  /** Bass drum pattern density for funk (other patterns ignore this) */
  funkComplexity: 'simple' | 'medium' | 'complex';
  /** Fill frequency for funk (other patterns ignore this) */
  fillFrequency: 'none' | 'rare' | 'often';
}

export const DEFAULT_DRUM_SETTINGS: DrumInstrumentSettings = {
  enabled: true,
  volume: 0.7,
  pattern: 'swing',
  bassDrumEnabled: true,
  bassDrumVolume: 0.7,
  snareEnabled: true,
  snareVolume: 0.8,
  hihatEnabled: true,
  hihatVolume: 0.65,
  hihatOpenness: 0,
  rideEnabled: true,
  rideVolume: 0.7,
  crashEnabled: true,
  crashVolume: 0.8,
  crashFrequency: 4,
  rimEnabled: false,
  rimVolume: 0.6,
  humanizeIntensity: 'med',
  funkComplexity: 'medium',
  fillFrequency: 'rare',
};

// ─── Helper: jitter ───────────────────────────────────────────────────────────

function jitterTicks(maxTicks: number): number {
  if (maxTicks <= 0) return 0;
  return (Math.random() - 0.5) * 2 * maxTicks;
}

function jitterVelocity(baseVel: number, maxDelta: number): number {
  if (maxDelta <= 0) return baseVel;
  return baseVel + (Math.random() - 0.5) * 2 * maxDelta;
}

// ─── Helper: hihat openness → sound ───────────────────────────────────────────

function hihatSoundForOpenness(openness: number): DrumSound {
  if (openness <= 0) return 'hihat';
  if (openness <= 2) return 'hihatHalf';
  return 'hihatOpen';
}

// ─── Class ────────────────────────────────────────────────────────────────────

export class DrumInstrument implements Instrument {
  private settings: DrumInstrumentSettings = { ...DEFAULT_DRUM_SETTINGS };

  /* ── Setters ─────────────────────────────────────────────────────────────── */

  updateSettings(patch: Partial<DrumInstrumentSettings>): void {
    Object.assign(this.settings, patch);
  }

  setPattern(pattern: DrumsPattern): void {
    this.settings.pattern = pattern;
  }

  setHumanizeIntensity(intensity: HumanizeIntensity): void {
    this.settings.humanizeIntensity = intensity;
  }

  /** @deprecated Use setPattern('swing') or setPattern('bossa') instead. */
  setRidePattern(pattern: DrumRidePattern): void {
    if (pattern === 'swingRide') this.settings.pattern = 'swing';
    else if (pattern === 'quarters') this.settings.pattern = 'swing'; // fallback: quarters ride
  }

  /** @deprecated Use setHumanizeIntensity() instead. */
  setHumanize(enabled: boolean): void {
    this.settings.humanizeIntensity = enabled ? 'med' : 'off';
  }

  reset(): void {
    this.settings = { ...DEFAULT_DRUM_SETTINGS };
  }

  /* ── Scheduling ──────────────────────────────────────────────────────────── */

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    const s = this.settings;
    if (!s.enabled) return;

    switch (s.pattern) {
      case 'swing':
        this.scheduleSwing(window, ctx, s);
        break;
      case 'bossa':
        this.scheduleBossa(window, ctx, s);
        break;
      case 'funk':
        this.scheduleFunk(window, ctx, s);
        break;
      default:
        this.scheduleSwing(window, ctx, s);
    }
  }

  /* ── Swing pattern ───────────────────────────────────────────────────────── */

  private scheduleSwing(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    s: DrumInstrumentSettings,
  ): void {
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);
    const tpBar = ticksPerBar(sig);
    const { timingMs, velocity: velDelta } = HUMANIZE_PARAMS[s.humanizeIntensity];
    const maxJitter = timingMs > 0 ? Math.round((timingMs / 1000) * (ctx.bpm / 60) * PPQ) : 0;

    const is44 = sig.beatsPerBar === 4 && sig.beatUnit === 4;

    if (!is44) {
      this.scheduleDegradedSwing(window, ctx, s);
      return;
    }

    // ── HH: which beats get closed hihat (2 & 4 backbeat) ──
    const hhClosedBeats = new Set<number>();
    hhClosedBeats.add(1); // beat 2
    hhClosedBeats.add(3); // beat 4

    // ── Iterate over bars ──
    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStart = bar * tpBar;

      // Crash: first beat of crashFrequency-th bar
      if (s.crashEnabled && s.crashFrequency > 0 && bar % s.crashFrequency === 0) {
        const atTicks = barStart;
        if (atTicks >= window.fromTicks && atTicks < window.toTicks) {
          const jit = jitterTicks(maxJitter);
          const t = Math.max(window.fromTicks, atTicks + jit);
          ctx.scheduleEvent('drums', { sound: 'crash' }, t, s.crashVolume, tpBeat);
        }
      }

      // ── Per-beat scheduling ──
      for (let beat = 0; beat < sig.beatsPerBar; beat++) {
        const atTicks = barStart + beat * tpBeat;
        if (atTicks >= window.toTicks) break;

        const isFirstBeat = beat === 0;
        const isBackbeat = beat === 1 || beat === 3; // beats 2 & 4

        // Bass drum
        if (s.bassDrumEnabled && atTicks >= window.fromTicks) {
          if (isFirstBeat) {
            // Strong accent on beat 1
            const jit = jitterTicks(maxJitter);
            const t = Math.max(window.fromTicks, atTicks + jit);
            const vel = jitterVelocity(0.6, velDelta);
            ctx.scheduleEvent('drums', { sound: 'bassDrum' }, t, vel * s.bassDrumVolume, tpBeat);
          } else if (!isBackbeat) {
            // Medium accent on beat 3
            const jit = jitterTicks(maxJitter);
            const t = Math.max(window.fromTicks, atTicks + jit);
            const vel = jitterVelocity(0.5, velDelta);
            ctx.scheduleEvent('drums', { sound: 'bassDrum' }, t, vel * s.bassDrumVolume, tpBeat);
          } else {
            // Feathering on beat 2 and 4 (quiet)
            const jit = jitterTicks(maxJitter);
            const t = Math.max(window.fromTicks, atTicks + jit);
            const vel = jitterVelocity(0.3, velDelta);
            ctx.scheduleEvent('drums', { sound: 'bassDrum' }, t, vel * s.bassDrumVolume, tpBeat);
          }
        }

        // Snare — backbeat (2 & 4)
        if (s.snareEnabled && isBackbeat && atTicks >= window.fromTicks) {
          const jit = jitterTicks(maxJitter);
          const t = Math.max(window.fromTicks, atTicks + jit);
          const vel = jitterVelocity(0.8, velDelta);
          ctx.scheduleEvent('drums', { sound: 'snare' }, t, vel * s.snareVolume, tpBeat);
        }

        // Hihat — eighth notes with variable openness
        if (s.hihatEnabled) {
          for (let sub = 0; sub < 2; sub++) {
            const subTicks = sub === 0 ? 0 : Math.round(ctx.swingRatio * tpBeat);
            const subAt = atTicks + subTicks;
            if (subAt < window.fromTicks || subAt >= window.toTicks) continue;

            const jit = jitterTicks(maxJitter);
            const t = Math.max(window.fromTicks, subAt + jit);

            let sound: DrumSound;
            let baseVel: number;

            if (sub === 0 && isBackbeat) {
              // Closed on 2 & 4 downbeat
              sound = hihatSoundForOpenness(Math.min(s.hihatOpenness, 1));
              baseVel = 0.8;
            } else if (sub === 1 && (beat === 0 || beat === 2)) {
              // Half-open on offbeats 1& and 3&
              sound = hihatSoundForOpenness(Math.max(s.hihatOpenness, 2));
              baseVel = 0.65;
            } else {
              // Slightly open on remaining eighths
              sound = hihatSoundForOpenness(Math.max(s.hihatOpenness, 0));
              baseVel = 0.55;
            }

            const vel = jitterVelocity(baseVel, velDelta);
            ctx.scheduleEvent('drums', { sound }, t, vel * s.hihatVolume, tpBeat);
          }
        }

        // Ride — classic swing pattern (ding ding-a-ding)
        if (s.rideEnabled) {
          // On-beat ride
          if (atTicks >= window.fromTicks) {
            const jit = jitterTicks(maxJitter);
            const t = Math.max(window.fromTicks, atTicks + jit);
            const baseVel = isFirstBeat ? 0.75 : isBackbeat ? 0.65 : 0.7;
            const vel = jitterVelocity(baseVel, velDelta);
            ctx.scheduleEvent('drums', { sound: 'ride' }, t, vel * s.rideVolume, 20);
          }

          // Skip beat (ding-a-ding): offbeat on beats 1 and 3
          if (beat === 0 || beat === 2) {
            const offTick = atTicks + Math.round(ctx.swingRatio * tpBeat);
            if (offTick >= window.fromTicks && offTick < window.toTicks) {
              const jit = jitterTicks(maxJitter);
              const t = Math.max(window.fromTicks, offTick + jit);
              const vel = jitterVelocity(0.55, velDelta);
              ctx.scheduleEvent('drums', { sound: 'ride' }, t, vel * s.rideVolume, 20);
            }
          }
        }

        // Rim — optional click
        if (s.rimEnabled && isBackbeat && atTicks >= window.fromTicks) {
          const jit = jitterTicks(maxJitter);
          const t = Math.max(window.fromTicks, atTicks + jit);
          const vel = jitterVelocity(0.5, velDelta);
          ctx.scheduleEvent('drums', { sound: 'rim' }, t, vel * s.rimVolume, tpBeat);
        }
      }
    }
  }

  /* ── Bossa nova pattern ──────────────────────────────────────────────────── */

  /**
   * Authentic bossa nova drum pattern (4/4 only).
   * - Rim: clave-like pattern X . X . X . . . (beats 1, 2, 3)
   * - Bass drum: downbeat on 1 + syncopated 3& (offbeat of beat 2)
   * - Hihat: closed chick on 2 & 4, soft eighths with slight openness elsewhere
   * - Ride: not used in traditional bossa nova
   * - Snare: not used in traditional bossa nova
   */
  private scheduleBossa(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    s: DrumInstrumentSettings,
  ): void {
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);
    const tpBar = ticksPerBar(sig);
    const { timingMs, velocity: velDelta } = HUMANIZE_PARAMS[s.humanizeIntensity];
    const maxJitter = timingMs > 0 ? Math.round((timingMs / 1000) * (ctx.bpm / 60) * PPQ) : 0;

    // Traditional bossa nova is in 4/4; degrade for other meters.
    const is44 = sig.beatsPerBar === 4 && sig.beatUnit === 4;
    if (!is44) {
      this.scheduleDegradedSwing(window, ctx, s);
      return;
    }

    const swingOffset = Math.round(ctx.swingRatio * tpBeat);

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStart = bar * tpBar;

      // Crash: first beat of crashFrequency-th bar
      if (s.crashEnabled && s.crashFrequency > 0 && bar % s.crashFrequency === 0) {
        const atTicks = barStart;
        if (atTicks >= window.fromTicks && atTicks < window.toTicks) {
          ctx.scheduleEvent('drums', { sound: 'crash' }, atTicks, s.crashVolume, tpBeat);
        }
      }

      for (let beat = 0; beat < 4; beat++) {
        const atTicks = barStart + beat * tpBeat;
        if (atTicks >= window.toTicks) break;

        const isFirstBeat = beat === 0;
        const isBeatTwo = beat === 1;
        const isBeatThree = beat === 2;
        const isBeatFour = beat === 3;

        // ── Rim cross-stick: clave pattern X . X . X . . . ──
        // Hits on beats 1 (idx 0), 2 (idx 1), 3 (idx 2). Skip beat 4.
        if (s.rimEnabled && atTicks >= window.fromTicks) {
          if (isFirstBeat || isBeatTwo || isBeatThree) {
            const jit = jitterTicks(maxJitter);
            const t = Math.max(window.fromTicks, atTicks + jit);
            const baseVel = isFirstBeat ? 0.8 : 0.7;
            const vel = jitterVelocity(baseVel, velDelta);
            ctx.scheduleEvent('drums', { sound: 'rim' }, t, vel * s.rimVolume, tpBeat);
          }
        }

        // ── Bass drum: beat 1 downbeat + syncopated 3& (offbeat of beat 2) ──
        if (s.bassDrumEnabled) {
          // Strong downbeat on beat 1
          if (isFirstBeat && atTicks >= window.fromTicks) {
            const jit = jitterTicks(maxJitter);
            const t = Math.max(window.fromTicks, atTicks + jit);
            const vel = jitterVelocity(0.8, velDelta);
            ctx.scheduleEvent('drums', { sound: 'bassDrum' }, t, vel * s.bassDrumVolume, tpBeat);
          }
          // Syncopated hit on 3& (offbeat of beat 2)
          if (isBeatTwo) {
            const offTick = atTicks + swingOffset;
            if (offTick >= window.fromTicks && offTick < window.toTicks) {
              const jit = jitterTicks(maxJitter);
              const t = Math.max(window.fromTicks, offTick + jit);
              const vel = jitterVelocity(0.65, velDelta);
              ctx.scheduleEvent('drums', { sound: 'bassDrum' }, t, vel * s.bassDrumVolume, tpBeat);
            }
          }
        }

        // ── Hihat: chick on 2 & 4 (closed), soft eighths elsewhere ──
        if (s.hihatEnabled) {
          for (let sub = 0; sub < 2; sub++) {
            const subTicks = sub === 0 ? 0 : swingOffset;
            const subAt = atTicks + subTicks;
            if (subAt < window.fromTicks || subAt >= window.toTicks) continue;

            const jit = jitterTicks(maxJitter);
            const t = Math.max(window.fromTicks, subAt + jit);

            // Chick on beats 2 and 4 downbeats: forced closed, louder
            const isChick = (isBeatTwo || isBeatFour) && sub === 0;
            const sound = isChick
              ? hihatSoundForOpenness(0) // forced closed
              : hihatSoundForOpenness(1); // slight openness
            const baseVel = isChick ? 0.8 : 0.45;
            const vel = jitterVelocity(baseVel, velDelta);
            ctx.scheduleEvent('drums', { sound }, t, vel * s.hihatVolume, tpBeat);
          }
        }

        // Ride: not used in traditional bossa nova
        // Snare: not used in traditional bossa nova
      }
    }
  }

  /* ── Funk pattern ────────────────────────────────────────────────────────── */

  /**
   * Funk drum pattern (4/4 only).
   * - Hihat: straight 16th notes, accented on downbeats, tight closed
   * - Bass drum: syncopated with configurable density (simple/medium/complex)
   * - Snare: backbeat on 2 & 4 + configurable fills
   * - Ride: not used
   * - Crash: on first beat of crashFrequency-th bar
   */
  private scheduleFunk(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    s: DrumInstrumentSettings,
  ): void {
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);
    const tpBar = ticksPerBar(sig);
    const { timingMs, velocity: velDelta } = HUMANIZE_PARAMS[s.humanizeIntensity];
    const maxJitter = timingMs > 0 ? Math.round((timingMs / 1000) * (ctx.bpm / 60) * PPQ) : 0;

    // Funk is a 4/4 pattern; degrade for other meters
    const is44 = sig.beatsPerBar === 4 && sig.beatUnit === 4;
    if (!is44) {
      this.scheduleDegradedSwing(window, ctx, s);
      return;
    }

    // 16th-note sub-beat tick offsets (4 per beat)
    const sub16th = tpBeat / 4; // straight 16th duration in ticks
    // Swing offset for eighth-note offbeats (subIdx 2); funk is straight so this ≈ tpBeat/2
    const swingOffset = Math.round(ctx.swingRatio * tpBeat);

    // Fill interval: determine whether fills fire on this bar
    const fillInterval = s.fillFrequency === 'often' ? 4 : s.fillFrequency === 'rare' ? 8 : 0;

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStart = bar * tpBar;

      // Is this a fill bar?
      const isFillBar = fillInterval > 0 && bar % fillInterval === fillInterval - 1;

      // ── Crash: first beat of crashFrequency-th bar ──
      if (s.crashEnabled && s.crashFrequency > 0 && bar % s.crashFrequency === 0) {
        const atTicks = barStart;
        if (atTicks >= window.fromTicks && atTicks < window.toTicks) {
          ctx.scheduleEvent('drums', { sound: 'crash' }, atTicks, s.crashVolume, tpBeat);
        }
      }

      // ── Per-beat scheduling ──
      for (let beat = 0; beat < 4; beat++) {
        const atTicks = barStart + beat * tpBeat;
        if (atTicks >= window.toTicks) break;

        const isBeatTwo = beat === 1;
        const isBeatFour = beat === 3;

        // ── Hihat: straight 16th notes (4 sub-beats per beat) ──
        if (s.hihatEnabled) {
          for (let sub = 0; sub < 4; sub++) {
            // sub 0 = downbeat, sub 2 = eighth offbeat (swung), sub 1 & 3 = 16th offbeats (straight)
            let subTick: number;
            if (sub === 0) {
              subTick = 0;
            } else if (sub === 2) {
              subTick = swingOffset; // eighth-note offbeat, may be swung
            } else if (sub === 1) {
              subTick = sub16th; // 16th offbeat, straight
            } else {
              subTick = sub16th * 3; // sub 3, straight
            }

            const subAt = atTicks + subTick;
            if (subAt < window.fromTicks || subAt >= window.toTicks) continue;

            const jit = jitterTicks(maxJitter);
            const t = Math.max(window.fromTicks, subAt + jit);

            // Accent downbeats, lighter on offbeat 16ths
            const baseVel = sub === 0 ? 0.7 : 0.45;
            const vel = jitterVelocity(baseVel, velDelta);

            // Tight closed hihat throughout
            const sound = hihatSoundForOpenness(0);
            ctx.scheduleEvent('drums', { sound }, t, vel * s.hihatVolume, tpBeat);
          }
        }

        // ── Bass drum: syncopated pattern based on complexity ──
        if (s.bassDrumEnabled) {
          const complexity = s.funkComplexity;

          // Helper: schedule a bass drum hit at given beat + sub position
          const scheduleBD = (subIdx: number, baseVel: number): void => {
            let tickOffset: number;
            if (subIdx === 0) {
              tickOffset = 0;
            } else if (subIdx === 1) {
              tickOffset = sub16th;
            } else if (subIdx === 2) {
              tickOffset = swingOffset;
            } else {
              tickOffset = sub16th * 3;
            }
            const bdAt = atTicks + tickOffset;
            if (bdAt < window.fromTicks || bdAt >= window.toTicks) return;

            const jit = jitterTicks(maxJitter);
            const t = Math.max(window.fromTicks, bdAt + jit);
            const vel = jitterVelocity(baseVel, velDelta);
            ctx.scheduleEvent('drums', { sound: 'bassDrum' }, t, vel * s.bassDrumVolume, tpBeat);
          };

          if (beat === 0) {
            // Beat 1: always present
            scheduleBD(0, 0.8);
            // complex: 1a (16th after beat 1)
            if (complexity === 'complex') {
              scheduleBD(1, 0.5);
            }
            // medium: 2& = offbeat of beat 1 (sub 2)
            if (complexity === 'medium') {
              scheduleBD(2, 0.65);
            }
          }

          if (beat === 1) {
            // complex: 2& = offbeat of beat 2
            if (complexity === 'complex') {
              scheduleBD(2, 0.65);
            }
          }

          if (beat === 2) {
            // simple: beat 3 on-beat
            if (complexity === 'simple') {
              scheduleBD(0, 0.8);
            }
            // complex: 3& = offbeat of beat 3
            if (complexity === 'complex') {
              scheduleBD(2, 0.65);
            }
          }

          if (beat === 3) {
            // Beat 4: medium and complex
            if (complexity === 'medium' || complexity === 'complex') {
              scheduleBD(0, 0.7);
            }
          }
        }

        // ── Snare: backbeat on 2 & 4 + fills ──
        if (s.snareEnabled) {
          const isBackbeat = isBeatTwo || isBeatFour;

          if (isBeatFour && isFillBar) {
            // Fill bar: replace beat 4 with a 4-hit 16th-note fill
            const fillVels = [0.85, 0.7, 0.6, 0.5];
            for (let sub = 0; sub < 4; sub++) {
              const fillTick =
                sub === 0 ? 0 : sub === 1 ? sub16th : sub === 2 ? swingOffset : sub16th * 3;
              const fillAt = atTicks + fillTick;
              if (fillAt < window.fromTicks || fillAt >= window.toTicks) continue;

              const jit = jitterTicks(maxJitter);
              const t = Math.max(window.fromTicks, fillAt + jit);
              const vel = jitterVelocity(fillVels[sub] ?? 0.6, velDelta);
              ctx.scheduleEvent('drums', { sound: 'snare' }, t, vel * s.snareVolume, tpBeat);
            }
          } else if (isBackbeat && atTicks >= window.fromTicks) {
            // Standard backbeat on 2 & 4 (skip beat 4 if it was a fill bar)
            const jit = jitterTicks(maxJitter);
            const t = Math.max(window.fromTicks, atTicks + jit);
            const vel = jitterVelocity(0.85, velDelta);
            ctx.scheduleEvent('drums', { sound: 'snare' }, t, vel * s.snareVolume, tpBeat);
          }
        }

        // Ride: not used in funk
      }
    }
  }

  /* ── Degraded swing for non-4/4 meters ───────────────────────────────────── */

  /** Simple quarters ride + hihat backbeat for non-swing meters (3/4, 5/4, 6/8 etc.). */
  private scheduleDegradedSwing(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    s: DrumInstrumentSettings,
  ): void {
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);
    const tpBar = ticksPerBar(sig);
    const { timingMs, velocity: velDelta } = HUMANIZE_PARAMS[s.humanizeIntensity];
    const maxJitter = timingMs > 0 ? Math.round((timingMs / 1000) * (ctx.bpm / 60) * PPQ) : 0;

    // Strong beats for bass drum
    const strongBeats = new Set([...defaultStrongBeats(sig), ...defaultSecondStrongBeats(sig)]);

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStart = bar * tpBar;

      for (let beat = 0; beat < sig.beatsPerBar; beat++) {
        const atTicks = barStart + beat * tpBeat;
        if (atTicks >= window.toTicks) break;

        const isFirstBeat = beat === 0;
        const isStrong = strongBeats.has(beat);

        // Bass drum on strong beats
        if (s.bassDrumEnabled && isStrong && atTicks >= window.fromTicks) {
          const jit = jitterTicks(maxJitter);
          const t = Math.max(window.fromTicks, atTicks + jit);
          const vel = jitterVelocity(0.55, velDelta);
          ctx.scheduleEvent('drums', { sound: 'bassDrum' }, t, vel * s.bassDrumVolume, tpBeat);
        }

        // Snare on backbeats (non-strong, non-first)
        if (s.snareEnabled && !isStrong && !isFirstBeat && atTicks >= window.fromTicks) {
          const jit = jitterTicks(maxJitter);
          const t = Math.max(window.fromTicks, atTicks + jit);
          const vel = jitterVelocity(0.7, velDelta);
          ctx.scheduleEvent('drums', { sound: 'snare' }, t, vel * s.snareVolume, tpBeat);
        }

        // Hihat: eighth note feel
        if (s.hihatEnabled) {
          const isBackbeat = !isFirstBeat && !isStrong;
          for (let sub = 0; sub < 2; sub++) {
            const subTicks = sub === 1 ? Math.round(ctx.swingRatio * tpBeat) : 0;
            const subAt = atTicks + subTicks;
            if (subAt < window.fromTicks || subAt >= window.toTicks) continue;

            const jit = jitterTicks(maxJitter);
            const t = Math.max(window.fromTicks, subAt + jit);

            const sound = isBackbeat
              ? hihatSoundForOpenness(Math.min(s.hihatOpenness, 2))
              : hihatSoundForOpenness(s.hihatOpenness);
            const baseVel = 0.55;
            const vel = jitterVelocity(baseVel, velDelta);
            ctx.scheduleEvent('drums', { sound }, t, vel * s.hihatVolume, tpBeat);
          }
        }

        // Ride on all beats
        if (s.rideEnabled && atTicks >= window.fromTicks) {
          const jit = jitterTicks(maxJitter);
          const t = Math.max(window.fromTicks, atTicks + jit);
          const vel = jitterVelocity(0.65, velDelta);
          ctx.scheduleEvent('drums', { sound: 'ride' }, t, vel * s.rideVolume, 20);
        }

        // Crash on first beat
        if (s.crashEnabled && s.crashFrequency > 0 && bar % s.crashFrequency === 0 && isFirstBeat) {
          if (atTicks >= window.fromTicks) {
            ctx.scheduleEvent('drums', { sound: 'crash' }, atTicks, s.crashVolume, tpBeat);
          }
        }
      }
    }
  }

  dispose(): void {}
}
