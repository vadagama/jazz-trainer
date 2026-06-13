import {
  ticksPerBeat,
  ticksPerBar,
  defaultStrongBeats,
  defaultSecondStrongBeats,
} from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { DrumSound } from './drumSampleRegistry.js';
import { DrumRandomizer, type DrumHit, type BarContext, type DrumStyle } from './drumRandomizer.js';

const PPQ = 480;

// ─── Pattern types ────────────────────────────────────────────────────────────

export type DrumsPattern = 'swing' | 'bossa' | 'funk';

/** @deprecated Use DrumsPattern instead. */
export type DrumRidePattern = 'quarters' | 'swingRide';

export type HumanizeIntensity = 'off' | 'low' | 'med' | 'high';

const HUMANIZE_PARAMS: Record<HumanizeIntensity, { timingMs: number }> = {
  off: { timingMs: 0 },
  low: { timingMs: 2 },
  med: { timingMs: 4 },
  high: { timingMs: 7 },
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

  // ── Randomization ──
  /** Randomization intensity */
  randomizationLevel: 'off' | 'subtle' | 'moderate' | 'high';
  /** Fill frequency: never, every 4/8/16 bars */
  fillFrequency: 'never' | '4bars' | '8bars' | '16bars';
  /** Fill complexity */
  fillComplexity: 'simple' | 'medium' | 'complex';
  /** Allow ride pattern variations */
  rideVariation: boolean;
  /** Add ghost notes to snare */
  snareGhosts: boolean;
  /** Vary bass drum pattern */
  bassDrumVariation: boolean;
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
  randomizationLevel: 'off',
  fillFrequency: '8bars',
  fillComplexity: 'medium',
  rideVariation: true,
  snareGhosts: true,
  bassDrumVariation: true,
};

// ─── Helper: bar-based groove offset ──────────────────────────────────────────

/**
 * Deterministic pseudo-random offset for a given bar.
 * All hits in the same bar shift together (like a drummer rushing/dragging).
 * Uses multiplicative hash of bar number → consistent across replays.
 */
function barGrooveOffset(bar: number, maxTicks: number): number {
  if (maxTicks <= 0) return 0;
  let h = bar * 0x9e3779b9;
  h = (h ^ (h >>> 16)) >>> 0;
  const r = (h % 1000) / 1000;
  return Math.round((r - 0.5) * 2 * maxTicks);
}

// ─── Helper: hihat openness → sound ───────────────────────────────────────────

function hihatSoundForOpenness(openness: number): DrumSound {
  if (openness <= 0) return 'hihat';
  if (openness <= 2) return 'hihatHalf';
  return 'hihatOpen';
}

// ─── Helper: schedule hits array ──────────────────────────────────────────────

function scheduleHits(
  hits: DrumHit[],
  barStart: number,
  groove: number,
  window: ScheduleWindow,
  ctx: ScheduleContext,
  maxJitter: number,
): void {
  for (const hit of hits) {
    const raw = barStart + hit.atTick + groove;
    // Allow small negative offset due to groove (≤ maxJitter ticks),
    // but skip hits that are far behind — they were already scheduled
    // in a previous window.
    if (raw < window.fromTicks - maxJitter || raw >= window.toTicks) continue;
    const t = Math.max(window.fromTicks, raw);
    ctx.scheduleEvent('drums', { sound: hit.sound }, t, hit.velocity, hit.durationTicks);
  }
}

// ─── Class ────────────────────────────────────────────────────────────────────

export class DrumInstrument implements Instrument {
  private settings: DrumInstrumentSettings = { ...DEFAULT_DRUM_SETTINGS };
  private randomizer: DrumRandomizer = new DrumRandomizer();

  /* ── Setters ─────────────────────────────────────────────────────────────── */

  updateSettings(patch: Partial<DrumInstrumentSettings>): void {
    Object.assign(this.settings, patch);
    this.randomizer.updateSettings({
      randomizationLevel: this.settings.randomizationLevel,
      fillFrequency: this.settings.fillFrequency,
      fillComplexity: this.settings.fillComplexity,
      rideVariation: this.settings.rideVariation,
      snareGhosts: this.settings.snareGhosts,
      bassDrumVariation: this.settings.bassDrumVariation,
    });
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
    else if (pattern === 'quarters') this.settings.pattern = 'swing';
  }

  /** @deprecated Use setHumanizeIntensity() instead. */
  setHumanize(enabled: boolean): void {
    this.settings.humanizeIntensity = enabled ? 'med' : 'off';
  }

  reset(): void {
    this.settings = { ...DEFAULT_DRUM_SETTINGS };
    this.randomizer = new DrumRandomizer();
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
    const { timingMs } = HUMANIZE_PARAMS[s.humanizeIntensity];
    const maxJitter = timingMs > 0 ? Math.round((timingMs / 1000) * (ctx.bpm / 60) * PPQ) : 0;

    const is44 = sig.beatsPerBar === 4 && sig.beatUnit === 4;

    if (!is44) {
      this.scheduleDegradedSwing(window, ctx, s);
      return;
    }

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);
    const formLength = lastBar - firstBar + 1;
    const style: DrumStyle = 'swing';

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStart = bar * tpBar;
      const groove = barGrooveOffset(bar, maxJitter);
      const hits: DrumHit[] = [];

      // Crash: first beat of crashFrequency-th bar
      if (s.crashEnabled && s.crashFrequency > 0 && bar % s.crashFrequency === 0) {
        hits.push({ sound: 'crash', atTick: 0, velocity: s.crashVolume, durationTicks: tpBeat });
      }

      // Build base hits per beat
      for (let beat = 0; beat < sig.beatsPerBar; beat++) {
        const atTicks = beat * tpBeat;
        const isFirstBeat = beat === 0;
        const isBackbeat = beat === 1 || beat === 3;

        // Bass drum: feathering + accents
        if (s.bassDrumEnabled) {
          if (isFirstBeat) {
            hits.push({
              sound: 'bassDrum',
              atTick: atTicks,
              velocity: 0.6 * s.bassDrumVolume,
              durationTicks: tpBeat,
            });
          } else if (!isBackbeat) {
            hits.push({
              sound: 'bassDrum',
              atTick: atTicks,
              velocity: 0.5 * s.bassDrumVolume,
              durationTicks: tpBeat,
            });
          } else {
            hits.push({
              sound: 'bassDrum',
              atTick: atTicks,
              velocity: 0.3 * s.bassDrumVolume,
              durationTicks: tpBeat,
            });
          }
        }

        // Snare — backbeat (2 & 4)
        if (s.snareEnabled && isBackbeat) {
          hits.push({
            sound: 'snare',
            atTick: atTicks,
            velocity: 0.8 * s.snareVolume,
            durationTicks: tpBeat,
          });
        }

        // Hihat — closed foot chick on backbeats (2 & 4)
        if (s.hihatEnabled && isBackbeat) {
          hits.push({
            sound: hihatSoundForOpenness(0), // tight closed
            atTick: atTicks,
            velocity: 0.8 * s.hihatVolume,
            durationTicks: tpBeat,
          });
        }

        // Ride — classic swing pattern (ding ding-a-ding)
        if (s.rideEnabled) {
          const baseVel = isFirstBeat ? 0.75 : isBackbeat ? 0.65 : 0.7;
          hits.push({
            sound: 'ride',
            atTick: atTicks,
            velocity: baseVel * s.rideVolume,
            durationTicks: 20,
          });

          if (beat === 0 || beat === 2) {
            const offTick = atTicks + Math.round(ctx.swingRatio * tpBeat);
            hits.push({
              sound: 'ride',
              atTick: offTick,
              velocity: 0.55 * s.rideVolume,
              durationTicks: 20,
            });
          }
        }

        // Rim — optional click on backbeat
        if (s.rimEnabled && isBackbeat) {
          hits.push({
            sound: 'rim',
            atTick: atTicks,
            velocity: 0.5 * s.rimVolume,
            durationTicks: tpBeat,
          });
        }
      }

      // Apply randomization
      const barCtx: BarContext = {
        barIndex: bar - firstBar,
        formLength,
        style,
        beatsPerBar: sig.beatsPerBar,
        beatUnit: sig.beatUnit,
      };
      this.randomizer.apply(hits, barCtx);

      scheduleHits(hits, barStart, groove, window, ctx, maxJitter);
    }
  }

  /* ── Bossa nova pattern ──────────────────────────────────────────────────── */

  private scheduleBossa(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    s: DrumInstrumentSettings,
  ): void {
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);
    const tpBar = ticksPerBar(sig);
    const { timingMs } = HUMANIZE_PARAMS[s.humanizeIntensity];
    const maxJitter = timingMs > 0 ? Math.round((timingMs / 1000) * (ctx.bpm / 60) * PPQ) : 0;

    const is44 = sig.beatsPerBar === 4 && sig.beatUnit === 4;
    if (!is44) {
      this.scheduleDegradedSwing(window, ctx, s);
      return;
    }

    const swingOffset = Math.round(ctx.swingRatio * tpBeat);
    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);
    const formLength = lastBar - firstBar + 1;
    const style: DrumStyle = 'bossa';

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStart = bar * tpBar;
      const groove = barGrooveOffset(bar, maxJitter);
      const hits: DrumHit[] = [];

      // Crash: first beat of crashFrequency-th bar
      if (s.crashEnabled && s.crashFrequency > 0 && bar % s.crashFrequency === 0) {
        hits.push({ sound: 'crash', atTick: 0, velocity: s.crashVolume, durationTicks: tpBeat });
      }

      for (let beat = 0; beat < 4; beat++) {
        const atTicks = beat * tpBeat;
        const isFirstBeat = beat === 0;
        const isBeatTwo = beat === 1;
        const isBeatThree = beat === 2;
        const isBeatFour = beat === 3;

        // Rim cross-stick: clave pattern X . X . X . . .
        if (s.rimEnabled) {
          if (isFirstBeat || isBeatTwo || isBeatThree) {
            const baseVel = isFirstBeat ? 0.8 : 0.7;
            hits.push({
              sound: 'rim',
              atTick: atTicks,
              velocity: baseVel * s.rimVolume,
              durationTicks: tpBeat,
            });
          }
        }

        // Bass drum: beat 1 downbeat + syncopated 3& (offbeat of beat 2)
        if (s.bassDrumEnabled) {
          if (isFirstBeat) {
            hits.push({
              sound: 'bassDrum',
              atTick: atTicks,
              velocity: 0.8 * s.bassDrumVolume,
              durationTicks: tpBeat,
            });
          }
          if (isBeatTwo) {
            const offTick = atTicks + swingOffset;
            hits.push({
              sound: 'bassDrum',
              atTick: offTick,
              velocity: 0.65 * s.bassDrumVolume,
              durationTicks: tpBeat,
            });
          }
        }

        // Hihat: chick on 2 & 4 (closed), soft eighths elsewhere
        if (s.hihatEnabled) {
          for (let sub = 0; sub < 2; sub++) {
            const subTicks = sub === 0 ? 0 : swingOffset;
            const isChick = (isBeatTwo || isBeatFour) && sub === 0;
            const sound = isChick ? hihatSoundForOpenness(0) : hihatSoundForOpenness(1);
            const baseVel = isChick ? 0.8 : 0.45;
            hits.push({
              sound,
              atTick: atTicks + subTicks,
              velocity: baseVel * s.hihatVolume,
              durationTicks: tpBeat,
            });
          }
        }
      }

      // Apply randomization
      const barCtx: BarContext = {
        barIndex: bar - firstBar,
        formLength,
        style,
        beatsPerBar: sig.beatsPerBar,
        beatUnit: sig.beatUnit,
      };
      this.randomizer.apply(hits, barCtx);

      scheduleHits(hits, barStart, groove, window, ctx, maxJitter);
    }
  }

  /* ── Funk pattern ────────────────────────────────────────────────────────── */

  private scheduleFunk(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    s: DrumInstrumentSettings,
  ): void {
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);
    const tpBar = ticksPerBar(sig);
    const { timingMs } = HUMANIZE_PARAMS[s.humanizeIntensity];
    const maxJitter = timingMs > 0 ? Math.round((timingMs / 1000) * (ctx.bpm / 60) * PPQ) : 0;

    const is44 = sig.beatsPerBar === 4 && sig.beatUnit === 4;
    if (!is44) {
      this.scheduleDegradedSwing(window, ctx, s);
      return;
    }

    const sub16th = tpBeat / 4;
    const swingOffset = Math.round(ctx.swingRatio * tpBeat);

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);
    const formLength = lastBar - firstBar + 1;
    const style: DrumStyle = 'funk';
    const complexity = s.funkComplexity;

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStart = bar * tpBar;
      const groove = barGrooveOffset(bar, maxJitter);
      const hits: DrumHit[] = [];

      // Crash: first beat of crashFrequency-th bar
      if (s.crashEnabled && s.crashFrequency > 0 && bar % s.crashFrequency === 0) {
        hits.push({ sound: 'crash', atTick: 0, velocity: s.crashVolume, durationTicks: tpBeat });
      }

      for (let beat = 0; beat < 4; beat++) {
        const atTicks = beat * tpBeat;
        const isBeatTwo = beat === 1;
        const isBeatFour = beat === 3;

        // Hihat: straight 16th notes
        if (s.hihatEnabled) {
          for (let sub = 0; sub < 4; sub++) {
            let subTick: number;
            if (sub === 0) subTick = 0;
            else if (sub === 2) subTick = swingOffset;
            else if (sub === 1) subTick = sub16th;
            else subTick = sub16th * 3;

            const baseVel = sub === 0 ? 0.7 : 0.45;
            hits.push({
              sound: hihatSoundForOpenness(0),
              atTick: atTicks + subTick,
              velocity: baseVel * s.hihatVolume,
              durationTicks: tpBeat,
            });
          }
        }

        // Bass drum: syncopated based on complexity
        if (s.bassDrumEnabled) {
          const bd = (subIdx: number, vel: number): void => {
            let tickOffset: number;
            if (subIdx === 0) tickOffset = 0;
            else if (subIdx === 1) tickOffset = sub16th;
            else if (subIdx === 2) tickOffset = swingOffset;
            else tickOffset = sub16th * 3;

            hits.push({
              sound: 'bassDrum',
              atTick: atTicks + tickOffset,
              velocity: vel * s.bassDrumVolume,
              durationTicks: tpBeat,
            });
          };

          if (beat === 0) {
            bd(0, 0.8);
            if (complexity === 'complex') bd(1, 0.5);
            if (complexity === 'medium') bd(2, 0.65);
          }
          if (beat === 1) {
            if (complexity === 'complex') bd(2, 0.65);
          }
          if (beat === 2) {
            if (complexity === 'simple') bd(0, 0.8);
            if (complexity === 'complex') bd(2, 0.65);
          }
          if (beat === 3) {
            if (complexity === 'medium' || complexity === 'complex') bd(0, 0.7);
          }
        }

        // Snare: backbeat on 2 & 4 (fills are handled by randomizer)
        if (s.snareEnabled) {
          const isBackbeat = isBeatTwo || isBeatFour;
          if (isBackbeat) {
            hits.push({
              sound: 'snare',
              atTick: atTicks,
              velocity: 0.85 * s.snareVolume,
              durationTicks: tpBeat,
            });
          }
        }
      }

      // Apply randomization (handles fills, ghost notes, variations)
      const barCtx: BarContext = {
        barIndex: bar - firstBar,
        formLength,
        style,
        beatsPerBar: sig.beatsPerBar,
        beatUnit: sig.beatUnit,
      };
      this.randomizer.apply(hits, barCtx);

      scheduleHits(hits, barStart, groove, window, ctx, maxJitter);
    }
  }

  /* ── Degraded swing for non-4/4 meters ───────────────────────────────────── */

  private scheduleDegradedSwing(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    s: DrumInstrumentSettings,
  ): void {
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);
    const tpBar = ticksPerBar(sig);
    const { timingMs } = HUMANIZE_PARAMS[s.humanizeIntensity];
    const maxJitter = timingMs > 0 ? Math.round((timingMs / 1000) * (ctx.bpm / 60) * PPQ) : 0;

    const strongBeats = new Set([...defaultStrongBeats(sig), ...defaultSecondStrongBeats(sig)]);

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStart = bar * tpBar;
      const groove = barGrooveOffset(bar, maxJitter);

      for (let beat = 0; beat < sig.beatsPerBar; beat++) {
        const atTicks = barStart + beat * tpBeat;
        if (atTicks >= window.toTicks) break;

        const t = Math.max(window.fromTicks, atTicks + groove);
        const isFirstBeat = beat === 0;
        const isStrong = strongBeats.has(beat);

        // Bass drum on strong beats
        if (s.bassDrumEnabled && isStrong && atTicks >= window.fromTicks) {
          ctx.scheduleEvent('drums', { sound: 'bassDrum' }, t, 0.55 * s.bassDrumVolume, tpBeat);
        }

        // Snare on backbeats (non-strong, non-first)
        if (s.snareEnabled && !isStrong && !isFirstBeat && atTicks >= window.fromTicks) {
          ctx.scheduleEvent('drums', { sound: 'snare' }, t, 0.7 * s.snareVolume, tpBeat);
        }

        // Hihat: eighth note feel
        if (s.hihatEnabled) {
          const isBackbeat = !isFirstBeat && !isStrong;
          for (let sub = 0; sub < 2; sub++) {
            const subTicks = sub === 1 ? Math.round(ctx.swingRatio * tpBeat) : 0;
            const subAt = atTicks + subTicks;
            if (subAt < window.fromTicks || subAt >= window.toTicks) continue;

            const ht = Math.max(window.fromTicks, subAt + groove);

            const sound = isBackbeat
              ? hihatSoundForOpenness(Math.min(s.hihatOpenness, 2))
              : hihatSoundForOpenness(s.hihatOpenness);
            ctx.scheduleEvent('drums', { sound }, ht, 0.55 * s.hihatVolume, tpBeat);
          }
        }

        // Ride on all beats
        if (s.rideEnabled && atTicks >= window.fromTicks) {
          ctx.scheduleEvent('drums', { sound: 'ride' }, t, 0.65 * s.rideVolume, 20);
        }

        // Crash on first beat
        if (s.crashEnabled && s.crashFrequency > 0 && bar % s.crashFrequency === 0 && isFirstBeat) {
          if (atTicks >= window.fromTicks) {
            ctx.scheduleEvent('drums', { sound: 'crash' }, t, s.crashVolume, tpBeat);
          }
        }
      }
    }
  }

  dispose(): void {}
}
