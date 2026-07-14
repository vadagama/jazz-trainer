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
import { selectRhodesVoicingRole } from './rhodesVoicingRoles.js';
import type { RhodesVoicingRole, RhodesOrganism, RhodesPatternStyle } from './rhodesPatternTypes.js';
import { RhodesPatternEngine } from './rhodesPatternEngine.js';
import { flattenSections, type FlatSection } from './drumInstrument.js';
import type { Style, Section } from '@jazz/shared';
import { getStyleProfile, type StyleProfile } from '../styleProfile.js';

const PPQ = 480;

/** Style → default comping mode (@deprecated legacy path). */
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

  // ── Pattern engine (primary path) ──────────────────────────────────────
  /** Internal pattern engine — instantiated directly, not injected. */
  private patternEngine = new RhodesPatternEngine();
  private organismId: string | null = null;
  private currentOrganism: RhodesOrganism | null = null;
  private currentPatternStyle: RhodesPatternStyle = 'swing';
  /** Grid sections for per-bar section resolution (mirrors PianoInstrument). */
  private gridSections: FlatSection[] | null = null;
  private lastScheduledBar = -1;
  private infiniteLoopCount = 0;

  constructor(timeline: ChordTimeline) {
    this.timeline = timeline;
  }

  setTimeline(timeline: ChordTimeline): void {
    this.timeline = timeline;
  }

  setStyleProfile(profile: StyleProfile): void {
    this.style = profile.id;
    this.currentPatternStyle = (profile.id as RhodesPatternStyle) ?? 'swing';

    const defs = profile.instrumentDefaults.rhodes;
    // Pattern (organism) selection — primary path.
    const pattern = defs?.pattern as string | undefined;
    if (pattern) this.organismId = pattern;

    const voicing = defs.voicing;
    if (voicing) this.density = voicing as RhodesVoicingDensity;

    // Legacy layer mode (deprecated fallback path).
    const layerMode = defs.mode as RhodesLayerMode | undefined;
    if (layerMode) {
      this.layerMode = layerMode;
      this.layerModeSet = true;
    }

    this.selectOrganismForStyle();
  }

  /** @deprecated Use {@link setStyleProfile}(getStyleProfile(style)) instead. */
  setStyle(style: Style): void {
    this.setStyleProfile(getStyleProfile(style));
  }

  /** @deprecated Use the pattern-engine path (organism selection) instead. */
  setMode(mode: RhodesCompingMode): void {
    this.mode = mode;
  }

  /**
   * Set the complementary layer mode (@deprecated legacy path).
   * `'none'` means Rhodes is off (no output) in the legacy path.
   * Prefer organism-driven scheduling via {@link setStyleProfile}.
   */
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

  /** Explicitly select an organism by id (overrides style-driven selection). */
  setOrganismId(id: string | null): void {
    this.organismId = id;
    this.selectOrganismForStyle();
  }

  setGridSections(sections: Section[] | null): void {
    this.gridSections = flattenSections(sections);
  }

  reset(): void {
    this.prevVoicing = null;
    this.lastScheduledTick = -1;
    this.barCounter = 0;
    this.lastScheduledBar = -1;
    this.infiniteLoopCount = 0;
  }

  // ── Organism selection ─────────────────────────────────────────────────

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

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    // Primary path: pattern engine (molecules/cells/organisms).
    if (this.currentOrganism) {
      this.scheduleWithPatternEngine(window, ctx);
      return;
    }

    // @deprecated legacy path: layer modes / comping modes.
    if (this.layerModeSet) {
      if (this.layerMode === 'none') return;
      this.scheduleLayer(window, ctx);
      return;
    }

    this.scheduleComping(window, ctx);
  }

  // ── Pattern-engine scheduling (primary) ────────────────────────────────

  private scheduleWithPatternEngine(window: ScheduleWindow, ctx: ScheduleContext): void {
    const engine = this.patternEngine;
    const organism = this.currentOrganism;
    if (!organism) return;

    const sig = ctx.timeSignature;
    const tpBar = ticksPerBar(sig);
    const tpBeat = ticksPerBeat(sig);

    if (this.lastScheduledTick >= 0 && window.fromTicks < this.lastScheduledTick - tpBeat) {
      this.prevVoicing = null;
    }

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    const maxJitterTicks = this.humanize ? Math.round(0.006 * (ctx.bpm / 60) * PPQ) : 0;

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStartTicks = bar * tpBar;

      const firstBeatChord = this.timeline.getChordAtTick(barStartTicks, sig);
      if (!firstBeatChord) continue;

      // Section resolution per bar (mirrors PianoInstrument / BassInstrument).
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

      const { cell, barInCell } = engine.selectCellForSectionType(
        organism,
        sectionType,
        tsStr,
        barInSection,
        this.currentPatternStyle,
        passIndex,
      );

      const hits = engine.resolveBar(cell.id, barInCell, ctx.swingRatio, ctx.playSeed);

      for (const hit of hits) {
        const eventTicks = barStartTicks + hit.atTick;
        if (eventTicks < window.fromTicks || eventTicks >= window.toTicks) continue;

        const currentChord = this.timeline.getChordAtTick(eventTicks, sig);
        if (!currentChord) continue;

        // Voicing pre-echo: a hit in the last beat anticipates the next chord.
        let chord = currentChord;
        if (hit.atTick >= tpBar - tpBeat) {
          const next = this.timeline.getNextChord(eventTicks, sig);
          if (next && next.raw !== currentChord.raw) chord = next;
        }

        const fullVoicing = buildVoicing(chord, this.density, this.prevVoicing);
        this.prevVoicing = fullVoicing;
        const voicing = selectRhodesVoicingRole(fullVoicing, hit.sound as RhodesVoicingRole);
        if (voicing.length === 0) continue;

        // Clip duration to the bar boundary.
        const nextBarStart = barStartTicks + tpBar;
        let durationTicks = hit.durationTicks;
        if (durationTicks > nextBarStart - eventTicks) {
          durationTicks = Math.max(1, nextBarStart - eventTicks);
        }

        let atTicks = eventTicks;
        let velocity = hit.velocity * this.baseVelocity;

        if (this.humanize) {
          atTicks = Math.max(
            window.fromTicks,
            atTicks + Math.round((Math.random() * 2 - 1) * maxJitterTicks),
          );
          velocity = Math.max(0.01, Math.min(1, velocity + (Math.random() * 2 - 1) * 0.03));
        }

        ctx.scheduleEvent('rhodes', { notes: voicing }, atTicks, velocity, durationTicks);
        this.lastScheduledTick = eventTicks;
      }
    }
  }

  // ── Legacy comping scheduling (@deprecated) ────────────────────────────

  /** @deprecated Legacy comping path — superseded by scheduleWithPatternEngine. */
  private scheduleComping(window: ScheduleWindow, ctx: ScheduleContext): void {
    const sig = ctx.timeSignature;
    const tpBar = ticksPerBar(sig);
    const tpBeat = ticksPerBeat(sig);

    if (this.lastScheduledTick >= 0 && window.fromTicks < this.lastScheduledTick - tpBeat) {
      this.prevVoicing = null;
    }

    const pattern = getCompPattern(this.mode);
    const maxJitterTicks = this.humanize ? Math.round(0.006 * (ctx.bpm / 60) * PPQ) : 0;

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStartTicks = bar * tpBar;
      const firstBeatChord = this.timeline.getChordAtTick(barStartTicks, sig);
      if (!firstBeatChord) continue;

      for (const event of pattern) {
        const isOffbeat = (event.subdivision ?? 0) > 0;
        const subdivTicks = isOffbeat ? Math.round(ctx.swingRatio * tpBeat) : 0;
        const eventTicks = barStartTicks + (event.beat - 1) * tpBeat + subdivTicks;
        if (eventTicks < window.fromTicks || eventTicks >= window.toTicks) continue;

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
   * Schedule using the complementary layer mode (@deprecated).
   * Lower velocities, octave shift for high-comping, 2-bar ambient swells.
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
      const firstBeatChord = this.timeline.getChordAtTick(barStartTicks, sig);
      if (!firstBeatChord) continue;

      for (const event of pattern) {
        const isOffbeat = (event.subdivision ?? 0) > 0;
        const subdivTicks = isOffbeat ? Math.round(ctx.swingRatio * tpBeat) : 0;
        const eventTicks = barStartTicks + (event.beat - 1) * tpBeat + subdivTicks;
        if (eventTicks < window.fromTicks || eventTicks >= window.toTicks) continue;

        const chord =
          event.chordRef === 'next'
            ? this.timeline.getNextChord(eventTicks, sig)
            : this.timeline.getChordAtTick(eventTicks, sig);
        if (!chord) continue;

        const voicing = buildVoicing(chord, this.density, this.prevVoicing, voicingRangeMin);
        this.prevVoicing = voicing;

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
