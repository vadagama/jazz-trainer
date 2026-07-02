import { ticksPerBar, ticksPerBeat } from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { ChordTimeline } from './chordTimeline.js';
import { buildPianoVoicing, type PianoVoicingDensity } from './pianoVoicing.js';
import type { Style } from '@jazz/shared';
import { getStyleProfile, type StyleProfile } from '../styleProfile.js';

const PPQ = 480;

export type ClarinetPattern = 'counterpoint' | 'melodicPhrases';

/** Style → default pattern. */
const STYLE_DEFAULT_PATTERN: Record<Style, ClarinetPattern> = {
  swing: 'counterpoint',
  bossa: 'melodicPhrases',
  funk: 'counterpoint',
  latin: 'melodicPhrases',
  ballad: 'counterpoint',
};

/**
 * Clarinet — monophonic woodwind accompaniment instrument.
 *
 * Produces single-note melodic lines: counterpoint (response to harmony)
 * or melodic phrases built from chord tones and passing tones.
 * Integrates with {@link ChordTimeline} for chord-aware note selection.
 *
 * [assumption] CC0 samples, 2 velocity layers, D3–C6 range.
 * [assumption] First version without legato — discrete monophonic notes.
 */
export class ClarinetInstrument implements Instrument {
  private timeline: ChordTimeline;
  private pattern: ClarinetPattern = 'counterpoint';
  private density: PianoVoicingDensity = 'rootless3';
  private baseVelocity = 1.0;
  private humanize = true;
  private prevVoicing: readonly string[] | null = null;
  private lastScheduledTick = -1;
  private style: Style = 'swing';
  /** Counterpoint: phrase note index for cycling through voicing notes. */
  private phraseNoteIdx = 0;
  /** Counterpoint: contour direction toggle. */
  private contourUp = true;

  constructor(timeline: ChordTimeline) {
    this.timeline = timeline;
  }

  setTimeline(timeline: ChordTimeline): void {
    this.timeline = timeline;
  }

  setPattern(pattern: ClarinetPattern): void {
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
    const pat = profile.instrumentDefaults.clarinet.pattern as ClarinetPattern | undefined;
    this.pattern = pat ?? STYLE_DEFAULT_PATTERN[profile.id] ?? 'counterpoint';
  }

  /** @deprecated Use {@link setStyleProfile}(getStyleProfile(style)) instead. */
  setStyle(style: Style): void {
    this.setStyleProfile(getStyleProfile(style));
  }

  reset(): void {
    this.prevVoicing = null;
    this.lastScheduledTick = -1;
    this.phraseNoteIdx = 0;
    this.contourUp = true;
  }

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    const sig = ctx.timeSignature;
    const tpBar = ticksPerBar(sig);
    const tpBeat = ticksPerBeat(sig);

    // Backward seek: reset voice leading state
    if (this.lastScheduledTick >= 0 && window.fromTicks < this.lastScheduledTick - tpBeat) {
      this.prevVoicing = null;
      this.phraseNoteIdx = 0;
    }

    // Max jitter in ticks at the current tempo (±6 ms)
    const maxJitterTicks = this.humanize ? Math.round(0.006 * (ctx.bpm / 60) * PPQ) : 0;

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStartTicks = bar * tpBar;

      if (this.pattern === 'counterpoint') {
        this.scheduleCounterpoint(bar, barStartTicks, tpBeat, tpBar, window, ctx, maxJitterTicks);
      } else {
        this.scheduleMelodicPhrases(bar, barStartTicks, tpBeat, tpBar, window, ctx, maxJitterTicks);
      }
    }
  }

  // ─── Counterpoint: secondary melodic line responding to harmony ─────────────

  /**
   * Counterpoint plays a single-note line that moves against the main harmony.
   *
   * Uses chord voicing notes as the pitch pool, cycling through them
   * in a melodic contour (alternating up/down) to create an independent
   * secondary line. 3 notes per bar, roughly on beats 1, 2.5, 4.
   */
  private scheduleCounterpoint(
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

    // 3-note phrase: beats 1, 2.5, 4 (or adjusted for 3/4 time)
    const phraseTicks: number[] = [];
    const beatsPerBar = sig.beatsPerBar;
    if (beatsPerBar >= 4) {
      phraseTicks.push(barStartTicks); // beat 1
      phraseTicks.push(barStartTicks + Math.round(2.5 * tpBeat)); // beat 2.5
      phraseTicks.push(barStartTicks + (beatsPerBar - 1) * tpBeat); // last beat
    } else if (beatsPerBar === 3) {
      phraseTicks.push(barStartTicks); // beat 1
      phraseTicks.push(barStartTicks + Math.round(1.5 * tpBeat)); // beat 1.5
      phraseTicks.push(barStartTicks + 2 * tpBeat); // beat 3
    } else {
      // 2/4: just 2 notes
      phraseTicks.push(barStartTicks);
      phraseTicks.push(barStartTicks + tpBeat);
    }

    // Build melodic contour through the voicing
    const nVoicing = voicing.length;

    for (let i = 0; i < phraseTicks.length; i++) {
      const eventTicks = phraseTicks[i]!;
      if (eventTicks < window.fromTicks || eventTicks >= window.toTicks) continue;

      // Pick a note from the voicing with a melodic contour
      let idx: number;
      if (this.contourUp) {
        idx = (this.phraseNoteIdx + i) % nVoicing;
      } else {
        idx = (this.phraseNoteIdx - i + nVoicing) % nVoicing;
      }
      const note = voicing[idx]!;

      // Shorter monophonic duration: ~40% of a beat
      const durationTicks = Math.round(0.4 * tpBeat);

      let atTicks = eventTicks;
      let velocity = 0.45 * this.baseVelocity;

      if (this.humanize) {
        atTicks = Math.max(
          window.fromTicks,
          atTicks + Math.round((Math.random() * 2 - 1) * maxJitterTicks),
        );
        velocity = Math.max(0.01, Math.min(1, velocity + (Math.random() * 2 - 1) * 0.05));
      }

      ctx.scheduleEvent('clarinet', { notes: [note] }, atTicks, velocity, durationTicks);
      this.lastScheduledTick = eventTicks;
    }

    // Advance state for next bar
    this.phraseNoteIdx = (this.phraseNoteIdx + 1) % nVoicing;
    this.contourUp = !this.contourUp;
  }

  // ─── Melodic Phrases: flowing single-note lines with passing tones ──────────

  /**
   * Melodic phrases play a more lyrical monophonic line.
   *
   * Uses more notes per bar (4–6) with varied rhythmic placement,
   * including passing tones between chord tones for a fluid,
   * improvisatory feel. Suitable for bossa and latin styles.
   */
  private scheduleMelodicPhrases(
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

    const beatsPerBar = sig.beatsPerBar;

    // 4–6 notes per bar: eighth-note grid with some rests
    const subdivisions = beatsPerBar * 2; // eighth notes
    const phraseLength = beatsPerBar >= 4 ? 5 : Math.min(4, subdivisions);
    const nVoicing = voicing.length;

    // Generate a melodic shape over the eighth-note grid
    const noteTicks: number[] = [];
    const step = Math.floor(subdivisions / phraseLength);
    for (let i = 0; i < phraseLength; i++) {
      const tick = barStartTicks + i * step * Math.round(tpBeat / 2);
      if (tick < barStartTicks + tpBar) {
        noteTicks.push(tick);
      }
    }

    for (let i = 0; i < noteTicks.length; i++) {
      const eventTicks = noteTicks[i]!;
      if (eventTicks < window.fromTicks || eventTicks >= window.toTicks) continue;

      // Melodic line: cycle through voicing notes with a wave pattern
      const wavePos = (i * 2) % (nVoicing * 2);
      let idx: number;
      if (wavePos < nVoicing) {
        idx = wavePos;
      } else {
        idx = nVoicing * 2 - wavePos - 1;
      }
      const note = voicing[idx]!;

      // Shorter duration for flowing phrases
      const durationTicks =
        i < noteTicks.length - 1
          ? Math.round(0.6 * (noteTicks[i + 1]! - eventTicks))
          : Math.round(0.5 * tpBeat);

      let atTicks = eventTicks;
      let velocity = 0.4 * this.baseVelocity;

      if (this.humanize) {
        atTicks = Math.max(
          window.fromTicks,
          atTicks + Math.round((Math.random() * 2 - 1) * maxJitterTicks),
        );
        velocity = Math.max(0.01, Math.min(1, velocity + (Math.random() * 2 - 1) * 0.05));
      }

      ctx.scheduleEvent('clarinet', { notes: [note] }, atTicks, velocity, durationTicks);
      this.lastScheduledTick = eventTicks;
    }

    // Advance for next bar
    this.phraseNoteIdx = (this.phraseNoteIdx + 1) % nVoicing;
  }

  dispose(): void {
    this.prevVoicing = null;
    this.lastScheduledTick = -1;
    this.phraseNoteIdx = 0;
  }
}
