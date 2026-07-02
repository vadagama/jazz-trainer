import { ticksPerBar, ticksPerBeat } from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { ChordTimeline } from './chordTimeline.js';
import { buildPianoVoicing, type PianoVoicingDensity } from './pianoVoicing.js';
import {
  getCompPattern,
  getCompingProfile,
  type CompingProfileId,
  type CompPatternId,
} from './pianoComping.js';
import type { Style } from '@jazz/shared';
import {
  PianoRandomizer,
  type PianoRandomizationLevel,
  type PianoBarContext,
} from './pianoRandomizer.js';
import { getStyleProfile, type StyleProfile } from '../styleProfile.js';

const PPQ = 480;

/** Style → default profile mapping. */
const STYLE_DEFAULT_PROFILE: Record<Style, CompingProfileId> = {
  swing: 'swing-sparse',
  bossa: 'swing-sparse',
  funk: 'offbeat-push',
  latin: 'latin-montuno',
  ballad: 'beginner-safe',
};

export class PianoInstrument implements Instrument {
  private timeline: ChordTimeline;
  private profile: CompingProfileId = 'swing-sparse';
  private density: PianoVoicingDensity = 'rootless3';
  private baseVelocity = 1.0;
  private humanize = true;
  private prevVoicing: string[] | null = null;
  private lastScheduledTick = -1;
  private style: Style = 'swing';
  private randomizer = new PianoRandomizer();
  private adaptiveProfile = false;

  constructor(timeline: ChordTimeline) {
    this.timeline = timeline;
  }

  setTimeline(timeline: ChordTimeline): void {
    this.timeline = timeline;
  }

  setProfile(profileId: CompingProfileId): void {
    this.profile = profileId;
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
    const pat = profile.instrumentDefaults.piano.pattern as CompingProfileId | undefined;
    this.profile = pat ?? STYLE_DEFAULT_PROFILE[profile.id] ?? 'swing-sparse';
    const voicing = profile.instrumentDefaults.piano.voicing;
    if (voicing) this.density = voicing as PianoVoicingDensity;
  }

  /** @deprecated Use {@link setStyleProfile}(getStyleProfile(style)) instead. */
  setStyle(style: Style): void {
    this.setStyleProfile(getStyleProfile(style));
  }

  setRandomizationLevel(level: PianoRandomizationLevel): void {
    this.randomizer.setLevel(level);
  }

  setAdaptiveProfile(enabled: boolean): void {
    this.adaptiveProfile = enabled;
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

    const profile = getCompingProfile(this.profile);
    // Max jitter in ticks at the current tempo (±6 ms)
    const maxJitterTicks = this.humanize ? Math.round(0.006 * (ctx.bpm / 60) * PPQ) : 0;

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStartTicks = bar * tpBar;
      // Quick guard: skip bars with no chord at all
      const firstBeatChord = this.timeline.getChordAtTick(barStartTicks, sig);
      if (!firstBeatChord) continue;

      // Select pattern from profile's 4-bar cycle
      const barInCycle = ((bar % 4) + 4) % 4;
      let patternId: CompPatternId = profile.bars[barInCycle]! as CompPatternId;

      // Adaptive override: force denser patterns for multi-chord bars
      if (this.adaptiveProfile) {
        const chordCount = this.timeline.getChordCountInBar(bar);
        if (chordCount >= 3) {
          patternId = 'quarter-comp';
        } else if (chordCount === 2) {
          patternId = 'two-and-four';
        }
      }

      const pattern = getCompPattern(patternId);
      if (pattern.length === 0) continue;

      // Randomize density for this bar (shell2 ↔ rootless4)
      const densityForBar = this.randomizer.shouldVaryVoicing(bar, this.density) ?? this.density;

      // Build bar context for randomizer
      const barCtx: PianoBarContext = {
        barIndex: bar,
        formLength: 0,
        hasNextChord: this.timeline.getNextChord(barStartTicks, sig) !== null,
      };

      const events = this.randomizer.apply(pattern, barCtx);

      for (const event of events) {
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

        const voicing = buildPianoVoicing(chord, densityForBar, this.prevVoicing);
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

        ctx.scheduleEvent('piano', { notes: voicing }, atTicks, velocity, durationTicks);
        this.lastScheduledTick = eventTicks;
      }
    }
  }

  dispose(): void {
    this.prevVoicing = null;
    this.lastScheduledTick = -1;
  }
}
