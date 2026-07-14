import { ticksPerBar, ticksPerBeat } from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { ChordTimeline } from './chordTimeline.js';
import {
  buildPianoVoicing,
  noteToMidi,
  selectVoicingRole,
  type PianoVoicingDensity,
  type TensionLevel,
  type VoiceRole,
} from './pianoVoicing.js';
import {
  getCompPattern,
  getCompingProfile,
  type CompingProfileId,
  type CompPatternId,
} from './pianoComping.js';
import type { Style, Section } from '@jazz/shared';
import {
  PianoRandomizer,
  type PianoRandomizationLevel,
  type PianoBarContext,
} from './pianoRandomizer.js';
import { getStyleProfile, type StyleProfile } from '../styleProfile.js';
import { PianoPatternEngine } from './pianoPatternEngine.js';
import {
  CHORD_SPREAD_MS,
  DEFAULT_HUMANIZE,
  TIMING_JITTER_MS,
  type HumanizeAmount,
  type HumanizeParams,
  type PianoOrganism,
  type PianoPatternStyle,
} from './pianoPatternTypes.js';
import { flattenSections, type FlatSection } from './drumInstrument.js';

const PPQ = 480;

// ─── Seeded pseudo-random (deterministic, repeatable) ──────────────────────────

function pseudoRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

// ─── Humanization constants ────────────────────────────────────────────────────

const HUMANIZE_TIMING_MS: Record<HumanizeParams['humanizeTiming'], number> = {
  none: 0,
  'slight-rush': -4,
  'slight-lag': 6,
  'medium-rush': -10,
  'medium-lag': 12,
};

const VELOCITY_VARIATION: Record<HumanizeParams['velocityVariation'], number> = {
  off: 0,
  light: 0.03,
  medium: 0.06,
  strong: 0.1,
};

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
  private tension: TensionLevel = 'clean';
  private baseVelocity = 1.0;
  private humanizeParams: HumanizeParams = { ...DEFAULT_HUMANIZE };
  private humanizeExplicitlyDisabled = false;
  private prevVoicing: string[] | null = null;
  private lastScheduledTick = -1;
  private style: Style = 'swing';
  private randomizer = new PianoRandomizer();
  private adaptiveProfile = false;

  /**
   * Internal pattern engine for section-driven scheduling.
   * When an organism is selected, the engine generates PianoHit[] per bar;
   * each hit's 'chord' sound is converted to a voicing-based PianoEvent.
   * Falls back to legacy comping-profile when no organism is selected.
   */
  private patternEngine = new PianoPatternEngine();
  private organismId: string | null = null;
  private currentOrganism: PianoOrganism | null = null;
  private currentPatternStyle: PianoPatternStyle = 'swing';
  /** Grid sections for per-bar section resolution (mirrors DrumInstrument). */
  private gridSections: FlatSection[] | null = null;
  private lastScheduledBar = -1;
  private infiniteLoopCount = 0;

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

  /** Set the harmonic tension level — how often upper structures are applied. */
  setTension(tension: TensionLevel): void {
    this.tension = tension;
  }

  setBaseVelocity(velocity: number): void {
    this.baseVelocity = Math.max(0, Math.min(2, velocity));
  }

  setHumanize(enabled: boolean): void {
    this.humanizeExplicitlyDisabled = !enabled;
    if (enabled) {
      this.humanizeParams = { ...DEFAULT_HUMANIZE };
    } else {
      this.humanizeParams = {
        timingJitterMs: 'none' as HumanizeAmount,
        velocityVariation: 'off',
        chordSpreadMs: 'none' as HumanizeAmount,
        phrasing: 'flat',
        humanizeTiming: 'none',
      };
    }
  }

  setHumanizeParams(params: Partial<HumanizeParams>): void {
    this.humanizeExplicitlyDisabled = false;
    this.humanizeParams = { ...this.humanizeParams, ...params };
  }

  setStyleProfile(profile: StyleProfile): void {
    this.style = profile.id;
    this.currentPatternStyle = (profile.id as PianoPatternStyle) ?? 'swing';
    const pat = profile.instrumentDefaults.piano.pattern as CompingProfileId | undefined;
    this.profile = pat ?? STYLE_DEFAULT_PROFILE[profile.id] ?? 'swing-sparse';
    const voicing = profile.instrumentDefaults.piano.voicing;
    if (voicing) this.density = voicing as PianoVoicingDensity;
    const tension = profile.instrumentDefaults.piano.tension;
    this.tension = (tension as TensionLevel | undefined) ?? 'clean';
    // Apply style-specific humanize params from profile (skip if user explicitly disabled)
    const humanize = profile.instrumentDefaults.piano.humanize;
    if (humanize && !this.humanizeExplicitlyDisabled) {
      this.setHumanizeParams(humanize as Partial<HumanizeParams>);
    }
    // Re-resolve organism when style changes
    this.selectOrganismForStyle();
  }

  /** @deprecated Use {@link setStyleProfile}(getStyleProfile(style)) instead. */
  setStyle(style: Style): void {
    this.setStyleProfile(getStyleProfile(style));
  }

  // ─── Humanization helpers ────────────────────────────────────────────────────

  /** Convert milliseconds to ticks at the given BPM. */
  private msToTicks(ms: number, bpm: number): number {
    return Math.round((ms / 1000) * (bpm / 60) * PPQ);
  }

  /**
   * Apply global timing shift (rush/lag) to a tick position.
   * Returns a new tick value with the offset applied.
   */
  private applyHumanizeTiming(atTick: number, bpm: number): number {
    const ms = HUMANIZE_TIMING_MS[this.humanizeParams.humanizeTiming];
    if (ms === 0) return atTick;
    return atTick + this.msToTicks(ms, bpm);
  }

  /**
   * Velocity multiplier from phrasing curve.
   * Shapes dynamics across a musical phrase (default 4-bar phrase).
   *
   * @param barInPhrase  0-based bar index within the current phrase.
   * @param beat         Beat number (1-based) within the bar.
   */
  private phrasingMultiplier(barInPhrase: number, beat: number): number {
    const phrasing = this.humanizeParams.phrasing;
    if (phrasing === 'flat') return 1.0;

    const phraseBars = 4;
    const beatsPerBar = 4;
    const progress =
      ((barInPhrase % phraseBars) * beatsPerBar + (beat - 1)) / (phraseBars * beatsPerBar);

    if (phrasing === 'gentle') {
      // Slight arch: low → high → low
      const shape = Math.sin(progress * Math.PI);
      return 0.92 + 0.14 * shape;
    }

    // expressive: wider range with second-half emphasis (peak at ~56%)
    const t = Math.pow(progress, 1.2);
    const shape = Math.sin(t * Math.PI);
    return 0.88 + 0.24 * shape;
  }

  /**
   * Spread chord notes across time: bass first, treble later.
   * Returns baseTick + offset for the given note index.
   */
  private applyChordSpread(
    atTick: number,
    noteIndex: number,
    totalNotes: number,
    bpm: number,
  ): number {
    const spreadMs = CHORD_SPREAD_MS[this.humanizeParams.chordSpreadMs];
    if (spreadMs <= 0 || totalNotes <= 1) return atTick;

    // Distribute: bass at -spreadMs, treble at +spreadMs
    const fraction = totalNotes > 1 ? noteIndex / (totalNotes - 1) : 0;
    const offsetMs = (fraction * 2 - 1) * spreadMs;
    return atTick + this.msToTicks(offsetMs, bpm);
  }

  /**
   * Add per-note velocity variation.
   * Uses deterministic random based on seed for repeatable results.
   */
  private applyVelocityVariation(baseVelocity: number, rand: () => number): number {
    const level = this.humanizeParams.velocityVariation;
    const range = VELOCITY_VARIATION[level];
    if (range === 0) return baseVelocity;
    return baseVelocity * (1 + (rand() * 2 - 1) * range);
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
    this.lastScheduledBar = -1;
    this.infiniteLoopCount = 0;
  }

  setGridSections(sections: Section[] | null): void {
    this.gridSections = flattenSections(sections);
  }

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    // When an organism is selected, use section-driven scheduling.
    // Falls back to 'verseA' when grid sections are absent.
    // Otherwise fall back to the legacy comping-profile path.
    if (this.currentOrganism) {
      this.scheduleWithPatternEngine(window, ctx);
    } else {
      this.scheduleWithComping(window, ctx);
    }
  }

  // ─── Organism selection (mirrors DrumInstrument.setOrganismId) ───────────

  /**
   * Select an organism by ID. Pass `null` to fall back to the legacy comping profile.
   * When an explicit ID is given, the engine resolves it and uses section-driven scheduling.
   */
  setOrganismId(id: string | null): void {
    this.organismId = id;
    this.selectOrganismForStyle();
  }

  private selectOrganismForStyle(): void {
    if (this.organismId !== null) {
      const organisms = this.patternEngine.getOrganisms(this.currentPatternStyle);
      const explicit = organisms.find((o) => o.id === this.organismId);
      this.currentOrganism = explicit ?? organisms[0] ?? null;
      return;
    }
    const organisms = this.patternEngine.getOrganisms(this.currentPatternStyle);
    this.currentOrganism = organisms[0] ?? null;
  }

  // ─── Pattern engine scheduling path ──────────────────────────────────────────

  /**
   * Schedule via the pattern engine: organism → cell → bar hits → PianoEvents.
   *
   * For each bar in the schedule window:
   *  1. Determine the section type and bar-in-section from {@link ScheduleContext}.
   *  2. Resolve the cell for this section + bar index via the engine.
   *  3. Assemble {@link PianoHit}[] for the current bar-in-cell.
   *  4. For each hit, resolve the chord, build a voicing, and emit a PianoEvent.
   */
  private scheduleWithPatternEngine(window: ScheduleWindow, ctx: ScheduleContext): void {
    const engine = this.patternEngine;
    const organism = this.currentOrganism;
    if (!organism) return;

    const sig = ctx.timeSignature;
    const tpBar = ticksPerBar(sig);
    const tpBeat = ticksPerBeat(sig);
    // Backward seek: reset voice leading state when scheduling jumps back
    if (this.lastScheduledTick >= 0 && window.fromTicks < this.lastScheduledTick - tpBeat) {
      this.prevVoicing = null;
    }

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStartTicks = bar * tpBar;

      // Quick guard: skip bars with no chord
      const firstBeatChord = this.timeline.getChordAtTick(barStartTicks, sig);
      if (!firstBeatChord) continue;

      // Resolve section type and bar-in-section per bar (mirrors DrumInstrument.resolveBarSlot)
      let sectionType: string = ctx.gridSectionType ?? 'verseA';
      let barInSection: number = ctx.barInSection ?? bar % 32;
      let passIndex = 0;
      if (this.gridSections) {
        for (const sec of this.gridSections) {
          if (bar >= sec.startBar && bar < sec.startBar + sec.lengthBars) {
            sectionType = sec.type;
            barInSection = bar - sec.startBar;
            if (sec.lengthBars === Infinity && sec.passLength != null) {
              if (bar < this.lastScheduledBar) {
                this.infiniteLoopCount++;
              }
              this.lastScheduledBar = bar;
              passIndex = this.infiniteLoopCount;
            } else {
              passIndex = sec.passIndex;
            }
            break;
          }
        }
      } else if (bar !== firstBar) {
        // No sections: advance bar-in-section linearly from window start
        barInSection = (ctx.barInSection ?? 0) + (bar - firstBar);
      }
      const tsStr = `${sig.beatsPerBar}/${sig.beatUnit}`;

      // Select cell + bar-in-cell via the engine
      const { cell, barInCell } = engine.selectCellForSectionType(
        organism,
        sectionType,
        tsStr,
        barInSection,
        this.currentPatternStyle,
        passIndex,
      );
      if (!cell) continue;

      // Assemble hits for this bar of the cell
      const hits = engine.resolveBar(cell.id, barInCell, ctx.swingRatio, ctx.playSeed);

      // Convert each hit into a PianoEvent
      for (const hit of hits) {
        const eventTicks = barStartTicks + hit.atTick;
        if (eventTicks < window.fromTicks || eventTicks >= window.toTicks) continue;

        // Resolve chord at event time
        const currentChord = this.timeline.getChordAtTick(eventTicks, sig);
        if (!currentChord) continue;

        // Voicing pre-echo: a hit landing in the last beat of the bar anticipates
        // the *next* chord (traditional passing/anticipation technique — matches
        // the 'fill'-category molecules, which are all placed on beat 4 or later).
        let chord = currentChord;
        if (hit.atTick >= tpBar - tpBeat) {
          const next = this.timeline.getNextChord(eventTicks, sig);
          if (next && next.raw !== currentChord.raw) chord = next;
        }

        const fullVoicing = buildPianoVoicing(
          chord,
          this.density,
          this.prevVoicing,
          this.tension,
          eventTicks,
        );
        this.prevVoicing = fullVoicing;
        const voicing = selectVoicingRole(fullVoicing, hit.sound as VoiceRole);
        if (voicing.length === 0) continue;

        // Clip duration to bar boundary to prevent note overlap across bars
        const nextBarStart = barStartTicks + tpBar;
        const maxDurTicks = nextBarStart - eventTicks;
        let clippedDuration = hit.durationTicks;
        if (clippedDuration > maxDurTicks) clippedDuration = Math.max(1, maxDurTicks);

        const atTicks = eventTicks;
        const velocity = hit.velocity * this.baseVelocity;
        const beat = Math.floor(hit.atTick / tpBeat) + 1;

        this.scheduleVoicing(
          voicing,
          atTicks,
          velocity,
          clippedDuration,
          0,
          window,
          ctx,
          barInSection,
          beat,
        );
        this.lastScheduledTick = eventTicks;
      }
    }
  }

  // ─── Legacy comping scheduling path ──────────────────────────────────────────

  private scheduleWithComping(window: ScheduleWindow, ctx: ScheduleContext): void {
    const sig = ctx.timeSignature;
    const tpBar = ticksPerBar(sig);
    const tpBeat = ticksPerBeat(sig);

    // Backward seek: reset voice leading state
    if (this.lastScheduledTick >= 0 && window.fromTicks < this.lastScheduledTick - tpBeat) {
      this.prevVoicing = null;
    }

    const profile = getCompingProfile(this.profile);

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

        const voicing = buildPianoVoicing(
          chord,
          densityForBar,
          this.prevVoicing,
          this.tension,
          eventTicks,
        );
        this.prevVoicing = voicing;

        const durationTicks = Math.round(event.durationBeats * tpBeat);

        const atTicks = eventTicks;
        const velocity = event.velocity * this.baseVelocity;
        /** Phrasing: 4-bar phrase assumption for comping profiles. */
        const barInSection = bar % 4;

        this.scheduleVoicing(
          voicing,
          atTicks,
          velocity,
          durationTicks,
          0,
          window,
          ctx,
          barInSection,
          event.beat,
        );
        this.lastScheduledTick = eventTicks;
      }
    }
  }

  // ─── Voicing scheduling with full humanization pipeline ──────────────────────

  /**
   * Schedule a chord voicing through the 5-step humanization pipeline:
   *  1. Global timing shift (rush/lag)
   *  2. Phrasing velocity multiplier
   *  3. Chord spread (bass-first micro-timing)
   *  4. Per-note timing jitter (seeded deterministic random)
   *  5. Per-note velocity variation (seeded deterministic random)
   */
  private scheduleVoicing(
    voicing: string[],
    baseTick: number,
    baseVelocity: number,
    durationTicks: number,
    _maxJitterTicks: number,
    window: ScheduleWindow,
    ctx: ScheduleContext,
    barInSection?: number,
    beat?: number,
  ): void {
    const hp = this.humanizeParams;
    const bpm = ctx.bpm;

    // Step 1: Global timing shift (rush/lag)
    const timingShifted = this.applyHumanizeTiming(baseTick, bpm);

    // Step 2: Phrasing multiplier on base velocity
    const phrasingVel = baseVelocity * this.phrasingMultiplier(barInSection ?? 0, beat ?? 1);

    // Fast path: schedule as single event when no per-note effects are active
    if (
      TIMING_JITTER_MS[hp.timingJitterMs] === 0 &&
      hp.velocityVariation === 'off' &&
      CHORD_SPREAD_MS[hp.chordSpreadMs] === 0
    ) {
      ctx.scheduleEvent('piano', { notes: voicing }, timingShifted, phrasingVel, durationTicks);
      return;
    }

    // Sort bass→treble (lowest MIDI pitch first)
    const sorted = [...voicing].sort((a, b) => noteToMidi(a) - noteToMidi(b));

    for (let i = 0; i < sorted.length; i++) {
      // Deterministic seeded random per note (same tick+index → same result)
      const seed = baseTick * 31 + i * 17;
      const rand = pseudoRandom(seed);

      // Step 3: Chord spread — bass first, treble later
      let atTicks = this.applyChordSpread(timingShifted, i, sorted.length, bpm);

      // Step 4: Per-note timing jitter
      const jitterMs = TIMING_JITTER_MS[hp.timingJitterMs];
      if (jitterMs > 0) {
        const jitterTicks = Math.round((rand() * 2 - 1) * this.msToTicks(jitterMs, bpm));
        atTicks += jitterTicks;
      }
      atTicks = Math.max(window.fromTicks, atTicks);

      // Step 5: Per-note velocity variation
      let vel = this.applyVelocityVariation(phrasingVel, rand);
      vel = Math.max(0.01, Math.min(1, vel));

      ctx.scheduleEvent('piano', { notes: [sorted[i]!] }, atTicks, vel, durationTicks);
    }
  }

  dispose(): void {
    this.prevVoicing = null;
    this.lastScheduledTick = -1;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PianoPatternEngineProxy — contract required by PianoInstrument
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Minimal proxy interface that {@link PianoInstrument} uses to talk to
 * a pattern engine without importing plugin code directly.
 *
 * Real implementations live in instrument plugins (e.g.
 * `@jazz/plugin-upright-piano`'s {@link PianoPatternEngine}).
 */
export interface PianoPatternEngineProxy {
  /**
   * Assemble hits for a single bar of a cell.
   * The engine resolves the cell by ID and delegates to the generic engine.
   */
  resolveBar(
    cellId: string,
    barInCell: number,
    swingRatio: number,
  ): import('./pattern/types.js').Hit<string>[];

  /**
   * Select the cell and bar-within-cell offset for a section type.
   * Returns both the resolved cell object and the 0-based bar index.
   */
  selectCellForSectionType(
    organism: import('./pattern/types.js').Organism<string>,
    sectionType: string,
    timeSignatureStr: string,
    barInSection: number,
    style: string,
  ): {
    cell: import('./pattern/types.js').Cell<string>;
    barInCell: number;
  };
}
