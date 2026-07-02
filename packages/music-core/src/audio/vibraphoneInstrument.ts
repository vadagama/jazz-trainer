import { ticksPerBar, ticksPerBeat } from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { ChordTimeline } from './chordTimeline.js';
import { buildPianoVoicing, type PianoVoicingDensity } from './pianoVoicing.js';
import type { Style } from '@jazz/shared';
import { getStyleProfile, type StyleProfile } from '../styleProfile.js';

const PPQ = 480;

export type VibraphonePattern = 'pads' | 'inserts';

/** Style → default pattern. */
const STYLE_DEFAULT_PATTERN: Record<Style, VibraphonePattern> = {
  swing: 'pads',
  bossa: 'pads',
  funk: 'pads',
  latin: 'inserts',
  ballad: 'pads',
};

/**
 * Vibraphone — polyphonic pitched instrument for chord pads and arpeggiated inserts.
 *
 * Characteristic vibrato (LFO on amplitude) and soft attack (~0.15–0.3s)
 * are applied at the audio-engine level (Tone.js Vibrato + Sampler envelope).
 *
 * Voicing reused from {@link buildPianoVoicing} (rootless3/rootless4).
 */
export class VibraphoneInstrument implements Instrument {
  private timeline: ChordTimeline;
  private pattern: VibraphonePattern = 'pads';
  private density: PianoVoicingDensity = 'rootless3';
  private baseVelocity = 1.0;
  private humanize = true;
  private prevVoicing: readonly string[] | null = null;
  private lastScheduledTick = -1;
  private style: Style = 'swing';
  /** Insert mode: current note index within the voicing for arpeggio cycling. */
  private insertNoteIndex = 0;

  constructor(timeline: ChordTimeline) {
    this.timeline = timeline;
  }

  setTimeline(timeline: ChordTimeline): void {
    this.timeline = timeline;
  }

  setPattern(pattern: VibraphonePattern): void {
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
    const pat = profile.instrumentDefaults.vibraphone.pattern as VibraphonePattern | undefined;
    this.pattern = pat ?? STYLE_DEFAULT_PATTERN[profile.id] ?? 'pads';
  }

  /** @deprecated Use {@link setStyleProfile}(getStyleProfile(style)) instead. */
  setStyle(style: Style): void {
    this.setStyleProfile(getStyleProfile(style));
  }

  reset(): void {
    this.prevVoicing = null;
    this.lastScheduledTick = -1;
    this.insertNoteIndex = 0;
  }

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    const sig = ctx.timeSignature;
    const tpBar = ticksPerBar(sig);
    const tpBeat = ticksPerBeat(sig);

    // Backward seek: reset voice leading state
    if (this.lastScheduledTick >= 0 && window.fromTicks < this.lastScheduledTick - tpBeat) {
      this.prevVoicing = null;
      this.insertNoteIndex = 0;
    }

    // Max jitter in ticks at the current tempo (±6 ms)
    const maxJitterTicks = this.humanize ? Math.round(0.006 * (ctx.bpm / 60) * PPQ) : 0;

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStartTicks = bar * tpBar;

      if (this.pattern === 'pads') {
        this.schedulePad(barStartTicks, tpBeat, tpBar, window, ctx, maxJitterTicks);
      } else {
        this.scheduleInserts(bar, barStartTicks, tpBeat, tpBar, window, ctx, maxJitterTicks);
      }
    }
  }

  // ─── Pads: whole-note chord on beat 1 ──────────────────────────────────────

  private schedulePad(
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

    // Whole-note pad on beat 1
    const eventTicks = barStartTicks;
    if (eventTicks < window.fromTicks || eventTicks >= window.toTicks) return;

    const voicing = buildPianoVoicing(chord, this.density, this.prevVoicing);
    this.prevVoicing = voicing;

    // Long duration: almost a full bar, gated slightly for articulation
    const durationTicks = Math.round(0.9 * tpBar);

    let atTicks = eventTicks;
    let velocity = 0.5 * this.baseVelocity;

    if (this.humanize) {
      atTicks = Math.max(
        window.fromTicks,
        atTicks + Math.round((Math.random() * 2 - 1) * maxJitterTicks),
      );
      velocity = Math.max(0.01, Math.min(1, velocity + (Math.random() * 2 - 1) * 0.05));
    }

    ctx.scheduleEvent('vibraphone', { notes: voicing }, atTicks, velocity, durationTicks);
    this.lastScheduledTick = eventTicks;
  }

  // ─── Inserts: arpeggiated notes cycling through the voicing ────────────────

  private scheduleInserts(
    bar: number,
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

    // Arpeggio: one note per beat, cycling through the voicing
    for (let beatIdx = 0; beatIdx < sig.beatsPerBar; beatIdx++) {
      const eventTicks = barStartTicks + beatIdx * tpBeat;
      if (eventTicks < window.fromTicks || eventTicks >= window.toTicks) continue;

      const noteIdx = (this.insertNoteIndex + beatIdx) % voicing.length;
      const note = voicing[noteIdx]!;

      // Shorter staccato-like duration for arpeggiated notes
      const durationTicks = Math.round(0.6 * tpBeat);

      let atTicks = eventTicks;
      let velocity = 0.45 * this.baseVelocity;

      if (this.humanize) {
        atTicks = Math.max(
          window.fromTicks,
          atTicks + Math.round((Math.random() * 2 - 1) * maxJitterTicks),
        );
        velocity = Math.max(0.01, Math.min(1, velocity + (Math.random() * 2 - 1) * 0.04));
      }

      ctx.scheduleEvent('vibraphone', { notes: [note] }, atTicks, velocity, durationTicks);
      this.lastScheduledTick = eventTicks;
    }

    // Advance note index for next bar's cycling
    this.insertNoteIndex = (this.insertNoteIndex + sig.beatsPerBar) % voicing.length;
  }

  dispose(): void {
    this.prevVoicing = null;
    this.lastScheduledTick = -1;
    this.insertNoteIndex = 0;
  }
}
