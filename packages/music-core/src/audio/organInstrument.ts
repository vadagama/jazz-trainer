import { ticksPerBar, ticksPerBeat } from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { ChordTimeline } from './chordTimeline.js';
import { buildPianoVoicing, type PianoVoicingDensity } from './pianoVoicing.js';
import type { Style } from '@jazz/shared';
import { getStyleProfile, type StyleProfile } from '../styleProfile.js';

const PPQ = 480;

export type OrganPattern = 'pads' | 'stabs' | 'pads-stabs';

/** Style → default pattern. */
const STYLE_DEFAULT_PATTERN: Record<Style, OrganPattern> = {
  swing: 'pads',
  bossa: 'pads',
  funk: 'pads-stabs',
  latin: 'pads',
  ballad: 'pads',
};

/**
 * Organ — Hammond-style polyphonic pitched instrument.
 *
 * Produces warm, dense chord pads and rhythmic stabs characteristic
 * of Hammond organ playing. Voicing uses {@link buildPianoVoicing}
 * with rootless4 density for thick harmonic texture.
 *
 * [assumption] First version without Leslie emulation or percussion click.
 * [assumption] CC0 samples, 2 velocity layers, C2–C7 range.
 */
export class OrganInstrument implements Instrument {
  private timeline: ChordTimeline;
  private pattern: OrganPattern = 'pads';
  private density: PianoVoicingDensity = 'rootless4';
  private baseVelocity = 1.0;
  private humanize = true;
  private prevVoicing: readonly string[] | null = null;
  private lastScheduledTick = -1;
  private style: Style = 'swing';

  constructor(timeline: ChordTimeline) {
    this.timeline = timeline;
  }

  setTimeline(timeline: ChordTimeline): void {
    this.timeline = timeline;
  }

  setPattern(pattern: OrganPattern): void {
    this.pattern = pattern;
  }

  setVoicingDensity(density: PianoVoicingDensity): void {
    this.density = density;
  }

  setBaseVelocity(velocity: number): void {
    this.baseVelocity = Math.max(0, Math.min(2, velocity));
  }

  setHumanize(enabled: boolean): void {
    this.humanize = enabled;
  }

  setStyleProfile(profile: StyleProfile): void {
    this.style = profile.id;
    const pat = profile.instrumentDefaults.organ.pattern as OrganPattern | undefined;
    this.pattern = pat ?? STYLE_DEFAULT_PATTERN[profile.id] ?? 'pads';
  }

  /** @deprecated Use {@link setStyleProfile}(getStyleProfile(style)) instead. */
  setStyle(style: Style): void {
    this.setStyleProfile(getStyleProfile(style));
  }

  reset(): void {
    this.prevVoicing = null;
    this.lastScheduledTick = -1;
  }

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    const sig = ctx.timeSignature;
    const tpBar = ticksPerBar(sig);
    const tpBeat = ticksPerBeat(sig);

    // Backward seek: reset voice leading state
    if (this.lastScheduledTick >= 0 && window.fromTicks < this.lastScheduledTick - tpBeat) {
      this.prevVoicing = null;
    }

    // Max jitter in ticks at the current tempo (±6 ms)
    const maxJitterTicks = this.humanize ? Math.round(0.006 * (ctx.bpm / 60) * PPQ) : 0;

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStartTicks = bar * tpBar;

      if (this.pattern === 'pads') {
        this.schedulePad(barStartTicks, tpBar, window, ctx, maxJitterTicks);
      } else if (this.pattern === 'stabs') {
        this.scheduleStabs(barStartTicks, tpBeat, tpBar, window, ctx, maxJitterTicks);
      } else {
        // pads-stabs: pads on beat 1 + stabs on offbeats
        this.schedulePad(barStartTicks, tpBar, window, ctx, maxJitterTicks);
        this.scheduleStabs(barStartTicks, tpBeat, tpBar, window, ctx, maxJitterTicks);
      }
    }
  }

  // ─── Pads: whole-note dense chord on beat 1 ──────────────────────────────────

  private schedulePad(
    barStartTicks: number,
    tpBar: number,
    window: ScheduleWindow,
    ctx: ScheduleContext,
    maxJitterTicks: number,
  ): void {
    const sig = ctx.timeSignature;
    const chord = this.timeline.getChordAtTick(barStartTicks, sig);
    if (!chord) return;

    const eventTicks = barStartTicks;
    if (eventTicks < window.fromTicks || eventTicks >= window.toTicks) return;

    const voicing = buildPianoVoicing(chord, this.density, this.prevVoicing);
    this.prevVoicing = voicing;

    // Sustained pad: nearly full bar, gated slightly for articulation
    const durationTicks = Math.round(0.92 * tpBar);

    let atTicks = eventTicks;
    let velocity = 0.5 * this.baseVelocity;

    if (this.humanize) {
      atTicks = Math.max(
        window.fromTicks,
        atTicks + Math.round((Math.random() * 2 - 1) * maxJitterTicks),
      );
      velocity = Math.max(0.01, Math.min(1, velocity + (Math.random() * 2 - 1) * 0.05));
    }

    ctx.scheduleEvent('organ', { notes: voicing }, atTicks, velocity, durationTicks);
    this.lastScheduledTick = eventTicks;
  }

  // ─── Stabs: short chords on eighth-note offbeats ─────────────────────────────

  private scheduleStabs(
    barStartTicks: number,
    tpBeat: number,
    tpBar: number,
    window: ScheduleWindow,
    ctx: ScheduleContext,
    maxJitterTicks: number,
  ): void {
    const sig = ctx.timeSignature;
    const chord = this.timeline.getChordAtTick(barStartTicks, sig);
    if (!chord) return;

    const voicing = buildPianoVoicing(chord, this.density, this.prevVoicing);
    this.prevVoicing = voicing;

    // Offbeat eighth notes: 8th-note positions 1,3,5,7 (the "and" of each beat)
    for (let beatIdx = 0; beatIdx < sig.beatsPerBar; beatIdx++) {
      const offbeatTicks = barStartTicks + beatIdx * tpBeat + Math.round(tpBeat / 2);
      if (offbeatTicks < window.fromTicks || offbeatTicks >= window.toTicks) continue;

      // Short stab: ~15% of a beat, sharp attack
      const durationTicks = Math.round(0.15 * tpBeat);

      let atTicks = offbeatTicks;
      let velocity = 0.55 * this.baseVelocity;

      if (this.humanize) {
        atTicks = Math.max(
          window.fromTicks,
          atTicks + Math.round((Math.random() * 2 - 1) * maxJitterTicks),
        );
        velocity = Math.max(0.01, Math.min(1, velocity + (Math.random() * 2 - 1) * 0.04));
      }

      ctx.scheduleEvent('organ', { notes: voicing }, atTicks, velocity, durationTicks);
      this.lastScheduledTick = offbeatTicks;
    }
  }

  dispose(): void {
    this.prevVoicing = null;
    this.lastScheduledTick = -1;
  }
}
