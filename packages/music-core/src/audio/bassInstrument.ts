import type { ChordSymbol, Style } from '@jazz/shared';
import { ticksPerBar, ticksPerBeat } from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { ChordTimeline } from './chordTimeline.js';
import { BassRandomizer } from './bassRandomizer.js';
import { getStyleProfile, type StyleProfile } from '../styleProfile.js';
import { type FlatSection } from './drumInstrument.js';
import { BassPatternEngine } from './bassPatternEngine.js';
import type {
  BassOrganism,
  BassPatternStyle,
  BassPhrasing,
  BassRange,
  BassTensionLevel,
  BassVariant,
} from './bassPatternTypes.js';
import { resolveBassStepPitch } from './bassPitch.js';
import { resolveBassStep } from './bassStepEngine.js';

const PPQ = 480;

/**
 * Bass pattern names from {@link StyleProfile.instrumentDefaults.bass.pattern}.
 * Maps 1:1 onto a default organism per variant×style.
 */
export type BassPattern = 'walking' | 'root-5th' | 'syncopated' | 'montuno' | 'two-feel';

/** Style → default bass pattern (fallback when StyleProfile omits one). */
const STYLE_DEFAULT_PATTERN: Record<Style, BassPattern> = {
  swing: 'walking',
  bossa: 'root-5th',
  funk: 'syncopated',
  latin: 'montuno',
  ballad: 'two-feel',
};

/** Phrase length (bars) used by the phrasing velocity curve. */
const PHRASE_BARS = 4;

/**
 * BassInstrument — pitched bass driven by the generic pattern engine.
 *
 * Two variants share one engine:
 *  - `upright`  → id `upright-bass`, palette { regular, muted }, swing/bossa/ballad
 *  - `electric` → id `electric-bass`, palette { regular, muted, rel, stac }, funk/latin
 *
 * **Step engine model (mirrors piano's VoiceRole → voicing):**
 * Molecules store only an articulation (`regular`/`muted`/`rel`/`stac`). At
 * scheduling time, for each hit:
 *  1. {@link resolveBassStep} decides *which* chord step to play, from the
 *     current pattern, tension, and beat position.
 *  2. {@link resolveBassStepPitch} resolves that step to a scientific pitch
 *     against the real chord (octave-2 anchor, C4 ceiling).
 *  3. The articulation is forwarded as-is in the {@link BassEvent}.
 *
 * `tension` widens the set of chord steps the engine may pick (clean → root/fifth
 * only; max → chromaticism, octave jumps). `phrasing` shapes velocity across a
 * 4-bar phrase. `useMutedNotes` gates whether `muted` articulation atoms are
 * emitted (disabled → they are skipped, thinning the groove).
 */
export class BassInstrument implements Instrument {
  private timeline: ChordTimeline;
  private variant: BassVariant;
  /** Instrument id emitted in `scheduleEvent` (e.g. `upright-bass`/`electric-bass`). */
  instrumentId: string;
  private style: Style = 'swing';
  private currentPatternStyle: BassPatternStyle = 'swing';
  private pattern: BassPattern = 'walking';
  private baseVelocity = 1.0;
  private humanize = true;
  private octaveShift = 0;
  /** Harmonic tension knob (clean|moderate|altered|max) — gates step engine color. */
  private tension: BassTensionLevel = 'clean';
  /** Phrase-level velocity curve (flat|gentle|expressive). */
  private phrasing: BassPhrasing = 'flat';
  /** Whether to emit `muted` articulation atoms (ghost notes). */
  private useMutedNotes = true;
  /** Octave range knob (narrow|medium|wide) — restricts how wide the bass roams. */
  private range: BassRange = 'medium';
  readonly randomizer = new BassRandomizer();

  private readonly patternEngine = new BassPatternEngine();
  private organismId: string | null = null;
  private currentOrganism: BassOrganism | null = null;
  /** Grid sections for per-bar section resolution (mirrors PianoInstrument). */
  private gridSections: FlatSection[] | null = null;
  private lastScheduledBar = -1;
  private infiniteLoopCount = 0;
  private lastScheduledTick = -1;

  constructor(timeline: ChordTimeline, variant: BassVariant = 'upright') {
    this.timeline = timeline;
    this.variant = variant;
    this.instrumentId = variant === 'upright' ? 'upright-bass' : 'electric-bass';
    // Upright bass plays one octave above its natural register by default.
    if (variant === 'upright') this.octaveShift = 1;
  }

  setTimeline(timeline: ChordTimeline): void {
    this.timeline = timeline;
  }

  setStyleProfile(profile: StyleProfile): void {
    this.style = profile.id;
    this.currentPatternStyle = profile.id;
    // NOTE: the variant is no longer auto-switched from the StyleProfile.
    // The user explicitly selects upright/electric via setVariant(); the
    // engine serves cross-style content via pattern-engine style fallbacks.
    // When no explicit variant was chosen yet, default it from the style.
    const defaults = profile.instrumentDefaults[this.instrumentId];
    const pat = defaults?.pattern as BassPattern | undefined;
    this.pattern = pat ?? STYLE_DEFAULT_PATTERN[profile.id];
    // Apply per-style tension/phrasing defaults if present.
    if (defaults?.tension) this.tension = defaults.tension as BassTensionLevel;
    if (defaults?.humanize?.phrasing) this.phrasing = defaults.humanize.phrasing as BassPhrasing;
    this.selectOrganismForStyle();
  }

  /**
   * Explicitly switch the sample-library variant (upright ↔ electric).
   * Updates {@link instrumentId} so downstream sinks resolve the correct
   * articulation palette, and re-selects the organism for the current style
   * (cross-style content is served via the pattern-engine style fallback).
   * When the user picks a variant for a style it has no authored content for
   * (e.g. electric on swing), the engine falls back to the variant's native
   * style content.
   */
  setVariant(variant: BassVariant): void {
    this.variant = variant;
    this.instrumentId = variant === 'upright' ? 'upright-bass' : 'electric-bass';
    // Upright bass defaults to +1 octave; electric stays at natural register.
    this.octaveShift = variant === 'upright' ? 1 : 0;
    this.selectOrganismForStyle();
  }

  /** Current variant (upright | electric). */
  getVariant(): BassVariant {
    return this.variant;
  }

  /** @deprecated Use {@link setStyleProfile}(getStyleProfile(style)) instead. */
  setStyle(style: Style): void {
    this.setStyleProfile(getStyleProfile(style));
  }

  setBaseVelocity(velocity: number): void {
    this.baseVelocity = Math.max(0, Math.min(2, velocity));
  }

  setHumanize(enabled: boolean): void {
    this.humanize = enabled;
  }

  setOctaveShift(shift: number): void {
    this.octaveShift = shift;
  }

  /** Set the harmonic tension knob (gates which chord steps the engine may pick). */
  setTension(level: BassTensionLevel): void {
    this.tension = level;
  }

  /** Set the phrase-level velocity curve (flat|gentle|expressive). */
  setPhrasing(level: BassPhrasing): void {
    this.phrasing = level;
  }

  /** Gate whether `muted` articulation atoms are emitted (ghost-note toggle). */
  setUseMutedNotes(enabled: boolean): void {
    this.useMutedNotes = enabled;
  }

  /** Set the octave range (narrow|medium|wide) — restricts how wide the bass roams. */
  setRange(level: BassRange): void {
    this.range = level;
  }

  /**
   * Complexity is now expressed at the molecule/cell level (each molecule
   * declares a `complexity: {min,max}` band, cells layer sparse/medium/dense
   * pools, organisms pick denser cells for choruses). This setter is retained
   * as a no-op for backward compatibility with older callers that still feed
   * the legacy 1–7 scale; it has no effect on pattern-engine scheduling.
   *
   * @deprecated Complexity is authored in molecules/cells/organisms.
   */
  setComplexity(_level: 1 | 2 | 3 | 4 | 5 | 6 | 7): void {
    /* no-op: see javadoc */
  }

  setGridSections(sections: FlatSection[] | null): void {
    this.gridSections = sections;
  }

  // ─── Organism selection (mirrors PianoInstrument.setOrganismId) ───────────

  /**
   * Select an organism by ID. Pass `null` to fall back to the first organism
   * for the current variant×style («Авто»). When an explicit ID is given and
   * valid, it overrides the default selection.
   */
  setOrganismId(id: string | null): void {
    this.organismId = id;
    this.selectOrganismForStyle();
  }

  /** Pick the organism: explicit ID if set (searches both variants), otherwise first in the pool. */
  private selectOrganismForStyle(): void {
    if (this.organismId !== null) {
      // Search across BOTH variant lists — the user may pick an upright organism
      // even when the current variant is electric (cross-variant selection).
      // When found, switch variant to match so cell lookup uses the right registry.
      for (const v of ['upright', 'electric'] as BassVariant[]) {
        const organisms = this.patternEngine.getOrganisms(v, this.currentPatternStyle);
        const explicit = organisms.find((o) => o.id === this.organismId);
        if (explicit) {
          this.currentOrganism = explicit;
          this.variant = v;
          this.instrumentId = v === 'upright' ? 'upright-bass' : 'electric-bass';
          this.octaveShift = v === 'upright' ? 1 : 0;
          return;
        }
      }
      // Fallback: not found in any variant → use current variant's first
    }
    const organisms = this.patternEngine.getOrganisms(this.variant, this.currentPatternStyle);
    this.currentOrganism = organisms[0] ?? null;
  }

  /* ── Scheduling ──────────────────────────────────────────────────────────── */

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    const organism = this.currentOrganism;
    if (!organism) return;
    this.scheduleWithPatternEngine(window, ctx, organism);
  }

  /**
   * Section-driven scheduling via the pattern engine (mirrors
   * {@link PianoInstrument.scheduleWithPatternEngine}):
   *  1. For each bar in the window, resolve section + bar-in-section.
   *  2. Engine selects a cell + bar-in-cell for that section.
   *  3. `resolveBar()` yields hits; each hit's `sound` is an articulation. The
   *     step engine picks the chord degree, the pitch is resolved against the
   *     current chord, and a {@link BassEvent} is emitted.
   */
  private scheduleWithPatternEngine(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    organism: BassOrganism,
  ): void {
    const sig = ctx.timeSignature;
    const tpBar = ticksPerBar(sig);
    const tpBeat = ticksPerBeat(sig);

    if (this.lastScheduledTick >= 0 && window.fromTicks < this.lastScheduledTick - tpBeat) {
      // Backward seek (rewind): nothing special to reset for bass.
    }

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStartTicks = bar * tpBar;
      const firstBeatChord = this.timeline.getChordAtTick(barStartTicks, sig);
      if (!firstBeatChord) continue;

      // Section resolution per bar (mirrors PianoInstrument).
      let sectionType: string = ctx.gridSectionType ?? 'verseA';
      let barInSection: number = ctx.barInSection ?? bar % 32;
      let passIndex = 0;
      if (this.gridSections) {
        for (const sec of this.gridSections) {
          if (bar >= sec.startBar && bar < sec.startBar + sec.lengthBars) {
            sectionType = sec.type;
            barInSection = bar - sec.startBar;
            if (sec.lengthBars === Infinity && sec.passLength != null) {
              if (bar < this.lastScheduledBar) this.infiniteLoopCount++;
              this.lastScheduledBar = bar;
              passIndex = this.infiniteLoopCount;
            } else {
              passIndex = sec.passIndex;
            }
            break;
          }
        }
      } else if (bar !== firstBar) {
        barInSection = (ctx.barInSection ?? 0) + (bar - firstBar);
      }
      const tsStr = `${sig.beatsPerBar}/${sig.beatUnit}`;

      const { cell, barInCell } = this.patternEngine.selectCellForSectionType(
        this.variant,
        organism,
        sectionType,
        tsStr,
        barInSection,
        this.currentPatternStyle,
        passIndex,
      );

      const hits = this.patternEngine.resolveBar(
        this.variant,
        cell.id,
        barInCell,
        ctx.swingRatio,
        ctx.playSeed,
      );

      for (const hit of hits) {
        const eventTicks = barStartTicks + hit.atTick;
        if (eventTicks < window.fromTicks || eventTicks >= window.toTicks) continue;

        const currentChord = this.timeline.getChordAtTick(eventTicks, sig);
        if (!currentChord) continue;

        // Anticipation: a hit in the last beat of the bar targets the next chord.
        let chord = currentChord;
        let nextChord: ChordSymbol | null = null;
        if (hit.atTick >= tpBar - tpBeat) {
          nextChord = this.timeline.getNextChord(eventTicks, sig);
          if (nextChord && nextChord.raw !== currentChord.raw) chord = nextChord;
        }

        const articulation = hit.sound;
        // Gate muted (ghost) notes when the user disables them.
        if (articulation === 'muted' && !this.useMutedNotes) continue;

        // Step engine: which chord degree does this atom play?
        const step = resolveBassStep(hit.atTick, tpBeat, tpBar, chord, {
          pattern: this.pattern,
          tension: this.tension,
          nextChord,
        });
        const note = this.resolveStepPitch(step, chord, bar, eventTicks, nextChord);
        if (!note) continue;

        // Clip duration to the bar boundary.
        const nextBarStart = barStartTicks + tpBar;
        let durationTicks = hit.durationTicks;
        if (durationTicks > nextBarStart - eventTicks) {
          durationTicks = Math.max(1, nextBarStart - eventTicks);
        }

        const beat = Math.floor((eventTicks % PPQ) / (PPQ / 4));
        const phraseMul = this.phrasingMultiplier(barInSection, beat);
        const velocity = Math.min(1, hit.velocity * this.baseVelocity * phraseMul);
        const atTicks = this.applyHumanization(eventTicks, barStartTicks, tpBar);

        ctx.scheduleEvent(
          this.instrumentId,
          { note, articulation },
          atTicks,
          velocity,
          durationTicks,
        );
        this.lastScheduledTick = eventTicks;
      }
    }
  }

  /**
   * Phrase-level velocity multiplier (mirrors piano's `phrasingMultiplier`).
   * Applies a deterministic velocity curve across a 4-bar phrase:
   *  - `flat` → 1.0 everywhere
   *  - `gentle` → mild arc (phrase start/end slightly louder)
   *  - `expressive` → strong downbeat emphasis + phrase-end build
   */
  private phrasingMultiplier(barInSection: number, beat: number): number {
    switch (this.phrasing) {
      case 'flat':
        return 1.0;
      case 'gentle': {
        // Mild 4-bar arc: bars 0/3 slightly louder, bar 2 slightly pulled back.
        const barArc = [1.04, 1.0, 0.96, 1.05][barInSection % PHRASE_BARS] ?? 1.0;
        const beatArc = beat === 0 ? 1.03 : 1.0;
        return barArc * beatArc;
      }
      case 'expressive': {
        // Strong downbeat emphasis; phrase-end (bar 3) builds.
        const barArc = [1.06, 0.98, 1.0, 1.09][barInSection % PHRASE_BARS] ?? 1.0;
        const beatArc = beat === 0 ? 1.08 : beat === 2 ? 0.98 : 1.0;
        return barArc * beatArc;
      }
      default:
        return 1.0;
    }
  }

  /**
   * Tiny timing jitter for groove feel (disabled when humanize is off).
   * The nudge is clamped to the originating bar so notes never leak across
   * bar boundaries (which would break per-bar chord resolution downstream).
   */
  private applyHumanization(atTicks: number, barStart: number, barTicks: number): number {
    if (!this.humanize) return atTicks;
    // Deterministic per-tick nudge (~±6 ticks ≈ ±6 ms at PPQ 480 / bpm 120).
    const nudge = (((atTicks * 1103515245 + 12345) >>> 0) % 13) - 6;
    return Math.max(barStart, Math.min(barStart + barTicks - 1, atTicks + nudge));
  }

  /* ── Pitch resolution: BassStep → scientific pitch ───────────────────────── */

  /**
   * Resolve a {@link BassStep} against `chord` into a scientific pitch string,
   * centered on octave 2 and clamped to the C4 ceiling. `approach` resolves
   * against `nextChord` (the chord being approached) using the randomizer
   * (seeded by `barIndex` for deterministic per-bar variation).
   *
   * Delegates to {@link resolveBassStepPitch} so the admin-constructor preview
   * shares the exact same pitch logic.
   */
  private resolveStepPitch(
    step: import('./bassPatternTypes.js').BassStep,
    chord: ChordSymbol,
    barIndex: number,
    atTicks: number,
    nextChord: ChordSymbol | null,
  ): string | null {
    // Beat-within-bar feeds the randomizer's approach-variant selection,
    // matching the legacy in-class behaviour before the extraction.
    const beat = Math.floor((atTicks % PPQ) / (PPQ / 4));
    const approachVariant = this.randomizer.selectApproachVariant(barIndex, beat);
    return resolveBassStepPitch(step, chord, {
      octaveShift: this.octaveShift,
      nextChord,
      barIndex,
      approachVariant,
      range: this.range,
    });
  }
}
