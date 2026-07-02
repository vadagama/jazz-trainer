import { ticksPerBar, ticksPerBeat } from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { ChordTimeline } from './chordTimeline.js';
import {
  buildVoicing,
  getCompPattern,
  getLayerPattern,
  type RhodesVoicingDensity,
  type RhodesCompingMode,
  type RhodesLayerMode,
} from './rhodesVoicing.js';
import { noteToMidi, midiToNote, RANGE_MIN_HIGH } from './rhodesVoicing.js';
import type { Style } from '@jazz/shared';
import { getStyleProfile, type StyleProfile } from '../styleProfile.js';

const PPQ = 480;

/** Style → default comping mode. */
const STYLE_DEFAULT_MODE: Record<Style, RhodesCompingMode> = {
  swing: 'halfNotes',
  bossa: 'halfNotes',
  funk: 'oneand-three',
  latin: 'one-twoand-four',
  ballad: 'wholeNotes',
};

export class RhodesInstrument implements Instrument {
  private timeline: ChordTimeline;
  private mode: RhodesCompingMode = 'halfNotes';
  private layerMode: RhodesLayerMode = 'none';
  private layerModeSet = false;
  private layerVolume = 0.5;
  private density: RhodesVoicingDensity = 'rootless3';
  private baseVelocity = 1.0;
  private humanize = true;
  private prevVoicing: readonly string[] | null = null;
  private lastScheduledTick = -1;
  private style: Style = 'swing';
  /** Bar counter for ambient-swells (trigger every 2 bars). */
  private barCounter = 0;

  constructor(timeline: ChordTimeline) {
    this.timeline = timeline;
  }

  setTimeline(timeline: ChordTimeline): void {
    this.timeline = timeline;
  }

  setStyleProfile(profile: StyleProfile): void {
    this.style = profile.id;
    this.mode = STYLE_DEFAULT_MODE[profile.id] ?? 'halfNotes';
    const voicing = profile.instrumentDefaults.rhodes.voicing;
    if (voicing) this.density = voicing as RhodesVoicingDensity;
    const layerMode = profile.instrumentDefaults.rhodes.mode as RhodesLayerMode | undefined;
    if (layerMode) {
      this.layerMode = layerMode;
      this.layerModeSet = true;
    }
  }

  /** @deprecated Use {@link setStyleProfile}(getStyleProfile(style)) instead. */
  setStyle(style: Style): void {
    this.setStyleProfile(getStyleProfile(style));
  }

  /** @deprecated Use setLayerMode() for the complementary layer API. */
  setMode(mode: RhodesCompingMode): void {
    this.mode = mode;
  }

  /** Set the complementary layer mode. 'none' means Rhodes is off (no output). */
  setLayerMode(mode: RhodesLayerMode): void {
    this.layerMode = mode;
    this.layerModeSet = true;
  }

  /** Set layer volume multiplier (0..1). Applied on top of baseVelocity. */
  setLayerVolume(volume: number): void {
    this.layerVolume = Math.max(0, Math.min(1, volume));
  }

  setVoicingDensity(density: RhodesVoicingDensity): void {
    this.density = density;
  }

  setBaseVelocity(velocity: number): void {
    this.baseVelocity = Math.max(0, Math.min(2, velocity));
  }

  setHumanize(enabled: boolean): void {
    this.humanize = enabled;
  }

  reset(): void {
    this.prevVoicing = null;
    this.lastScheduledTick = -1;
    this.barCounter = 0;
  }

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    // If layerMode was explicitly set, use it (including 'none' = no output)
    if (this.layerModeSet) {
      if (this.layerMode === 'none') return;
      this.scheduleLayer(window, ctx);
      return;
    }

    const sig = ctx.timeSignature;
    const tpBar = ticksPerBar(sig);
    const tpBeat = ticksPerBeat(sig);

    // Backward seek: reset voice leading state
    if (this.lastScheduledTick >= 0 && window.fromTicks < this.lastScheduledTick - tpBeat) {
      this.prevVoicing = null;
    }

    const pattern = getCompPattern(this.mode);
    // Max jitter in ticks at the current tempo (±6 ms)
    const maxJitterTicks = this.humanize ? Math.round(0.006 * (ctx.bpm / 60) * PPQ) : 0;

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStartTicks = bar * tpBar;
      // Quick guard: skip bars with no chord at all
      const firstBeatChord = this.timeline.getChordAtTick(barStartTicks, sig);
      if (!firstBeatChord) continue;

      for (const event of pattern) {
        const isOffbeat = (event.subdivision ?? 0) > 0;
        const subdivTicks = isOffbeat ? Math.round(ctx.swingRatio * tpBeat) : 0;
        const eventTicks = barStartTicks + (event.beat - 1) * tpBeat + subdivTicks;
        if (eventTicks < window.fromTicks || eventTicks >= window.toTicks) continue;

        // Resolve chord at event time (sub-bar aware)
        const chord =
          event.chordRef === 'next'
            ? this.timeline.getNextChord(eventTicks, sig)
            : this.timeline.getChordAtTick(eventTicks, sig);
        if (!chord) continue;

        const voicing = buildVoicing(chord, this.density, this.prevVoicing);
        this.prevVoicing = voicing;

        const durationTicks = Math.round(event.durationBeats * tpBeat);

        let atTicks = eventTicks;
        let velocity = event.velocity * this.baseVelocity;

        if (this.humanize) {
          atTicks = Math.max(
            window.fromTicks,
            atTicks + Math.round((Math.random() * 2 - 1) * maxJitterTicks),
          );
          velocity = Math.max(0.01, Math.min(1, velocity + (Math.random() * 2 - 1) * 0.05));
        }

        ctx.scheduleEvent('rhodes', { notes: voicing }, atTicks, velocity, durationTicks);
        this.lastScheduledTick = eventTicks;
      }
    }
  }

  /**
   * Schedule using the complementary layer mode.
   * lower velocities, octave shift for high-comping, 2-bar ambient swells.
   */
  private scheduleLayer(window: ScheduleWindow, ctx: ScheduleContext): void {
    const sig = ctx.timeSignature;
    const tpBar = ticksPerBar(sig);
    const tpBeat = ticksPerBeat(sig);

    const pattern = getLayerPattern(this.layerMode);
    if (pattern.length === 0) return;

    const maxJitterTicks = this.humanize ? Math.round(0.006 * (ctx.bpm / 60) * PPQ) : 0;
    const octaveShift = this.layerMode === 'high-comping' ? 12 : 0;
    const voicingRangeMin = this.layerMode === 'high-comping' ? RANGE_MIN_HIGH : undefined;

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      this.barCounter++;

      // ambient-swells: fire every 2 bars only
      if (this.layerMode === 'ambient-swells' && this.barCounter % 2 !== 1) continue;

      const barStartTicks = bar * tpBar;
      // Quick guard: skip bars with no chord at all
      const firstBeatChord = this.timeline.getChordAtTick(barStartTicks, sig);
      if (!firstBeatChord) continue;

      for (const event of pattern) {
        const isOffbeat = (event.subdivision ?? 0) > 0;
        const subdivTicks = isOffbeat ? Math.round(ctx.swingRatio * tpBeat) : 0;
        const eventTicks = barStartTicks + (event.beat - 1) * tpBeat + subdivTicks;
        if (eventTicks < window.fromTicks || eventTicks >= window.toTicks) continue;

        // Resolve chord at event time (sub-bar aware)
        const chord =
          event.chordRef === 'next'
            ? this.timeline.getNextChord(eventTicks, sig)
            : this.timeline.getChordAtTick(eventTicks, sig);
        if (!chord) continue;

        const voicing = buildVoicing(chord, this.density, this.prevVoicing, voicingRangeMin);
        this.prevVoicing = voicing;

        // Apply octave shift for high-comping
        const shiftedVoicing =
          octaveShift !== 0 ? voicing.map((n) => midiToNote(noteToMidi(n) + octaveShift)) : voicing;

        const durationTicks = Math.round(event.durationBeats * tpBeat);
        const baseVel = event.velocity * this.baseVelocity * this.layerVolume;

        let atTicks = eventTicks;
        let velocity = baseVel;

        if (this.humanize) {
          atTicks = Math.max(
            window.fromTicks,
            atTicks + Math.round((Math.random() * 2 - 1) * maxJitterTicks),
          );
          velocity = Math.max(0.01, Math.min(1, velocity + (Math.random() * 2 - 1) * 0.03));
        }

        ctx.scheduleEvent('rhodes', { notes: shiftedVoicing }, atTicks, velocity, durationTicks);
        this.lastScheduledTick = eventTicks;
      }
    }
  }

  dispose(): void {
    this.prevVoicing = null;
    this.lastScheduledTick = -1;
  }
}
