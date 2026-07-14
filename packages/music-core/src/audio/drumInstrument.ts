import {
  ticksPerBar,
  ticksPerBeat,
  defaultStrongBeats,
  defaultSecondStrongBeats,
} from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { Section, SectionType } from '@jazz/shared';
import type { StyleProfile } from '../styleProfile.js';
import { DrumPatternEngine } from './drumPatternEngine.js';
import type { DrumCell, DrumHit, DrumOrganism, DrumPatternStyle } from './drumPatternTypes.js';
import { DRUM_CELLS } from './drumCells.js';
import { expandRange } from '../playback/repeatExpansion.js';

const PPQ = 480;

const ORGANISM_SEED = 42;

/** Direct id → cell lookup (DRUM_CELLS is already a Record). */
const DRUM_CELLS_LOOKUP: Record<string, DrumCell> = DRUM_CELLS;

export type HumanizeIntensity = 'off' | 'low' | 'med' | 'high';

const HUMANIZE_PARAMS: Record<HumanizeIntensity, { timingMs: number }> = {
  off: { timingMs: 0 },
  low: { timingMs: 2 },
  med: { timingMs: 4 },
  high: { timingMs: 8 },
};

export interface DrumInstrumentSettings {
  enabled: boolean;
  volume: number;
  bassDrumEnabled: boolean;
  bassDrumVolume: number;
  snareEnabled: boolean;
  snareVolume: number;
  hihatEnabled: boolean;
  hihatVolume: number;
  hihatOpenness: number;
  rideEnabled: boolean;
  rideVolume: number;
  crashEnabled: boolean;
  crashVolume: number;
  crashFrequency: number;
  rimEnabled: boolean;
  rimVolume: number;
  tomEnabled: boolean;
  tomVolume: number;
  humanizeIntensity: HumanizeIntensity;
  funkComplexity: 'simple' | 'medium' | 'complex';
  fillFrequency: 'never' | '4bars' | '8bars';
  randomizationLevel: 'off' | 'low' | 'high';
}

export const DEFAULT_DRUM_SETTINGS: DrumInstrumentSettings = {
  enabled: true,
  volume: 0.7,
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
  tomEnabled: true,
  tomVolume: 0.7,
  humanizeIntensity: 'med',
  funkComplexity: 'simple',
  fillFrequency: 'never',
  randomizationLevel: 'off',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function barGrooveOffset(bar: number, maxTicks: number): number {
  if (maxTicks <= 0) return 0;
  let h = bar * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = ((h >> 16) ^ h) & 0x7fffffff;
  const r = h / 0x7fffffff;
  return Math.round((r - 0.5) * 2 * maxTicks);
}

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
    if (raw < window.fromTicks - maxJitter || raw >= window.toTicks) continue;
    const t = Math.max(window.fromTicks, raw);
    ctx.scheduleEvent('drums', { sound: hit.sound }, t, hit.velocity, hit.durationTicks);
  }
}

function timeSignatureKey(beatsPerBar: number, beatUnit: number): string {
  return `${beatsPerBar}/${beatUnit}`;
}

export interface FlatSection {
  type: SectionType;
  timeSignature: string;
  startBar: number;
  lengthBars: number;
  /** 0-based form pass index — used to cycle cell pools across grid replays. */
  passIndex: number;
  /** Bars in one pass (set for infinite forms to derive virtual passIndex). */
  passLength?: number;
}

export function flattenSections(sections: Section[] | null): FlatSection[] | null {
  if (!sections || sections.length === 0) return null;

  const lastSection = sections[sections.length - 1]!;
  const lastBar = lastSection.bars[lastSection.bars.length - 1];
  const formRepeat = lastBar?.repeatEnd;
  const isFormInfinite = formRepeat?.count === null;

  // Number of full form passes: null = infinite (handled below), N = N passes
  const formPasses = isFormInfinite ? 1 : (formRepeat?.count ?? 1);

  const flat: FlatSection[] = [];
  let cursor = 0;

  for (let pass = 0; pass < formPasses; pass++) {
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i]!;
      const [beatsPerBar, beatUnit] = sec.timeSignature.split('/').map(Number);
      const isLast = i === sections.length - 1;

      // Strip form-repeat marker from the last bar so it isn't expanded as an
      // inner repeat — it just plays once as the form endpoint.
      const barsForExpand =
        isLast && formRepeat !== undefined
          ? sec.bars.map((b, bi) =>
              bi === sec.bars.length - 1 ? ({ ...b, repeatEnd: undefined } as typeof b) : b,
            )
          : sec.bars;

      const expanded: number[] = [];
      expandRange(barsForExpand, 0, barsForExpand.length - 1, 0, expanded);

      flat.push({
        type: sec.type as SectionType,
        timeSignature: timeSignatureKey(beatsPerBar ?? 4, beatUnit ?? 4),
        startBar: cursor,
        lengthBars: expanded.length,
        passIndex: pass,
      });
      cursor += expanded.length;
    }
  }

  // Infinite form loop: last section absorbs everything past the form end.
  // Store the one-pass length so resolveBarSlot can derive a virtual passIndex.
  if (isFormInfinite && flat.length > 0) {
    const onePassLen = cursor;
    for (let i = 0; i < flat.length; i++) {
      flat[i] = { ...flat[i]!, passLength: onePassLen };
    }
    const last = flat[flat.length - 1]!;
    flat[flat.length - 1] = { ...last, lengthBars: Infinity };
  }

  return flat;
}

// ─── Class ──────────────────────────────────────────────────────────────────

export class DrumInstrument implements Instrument {
  private settings: DrumInstrumentSettings = { ...DEFAULT_DRUM_SETTINGS };
  private patternEngine = new DrumPatternEngine();
  private currentStyle: DrumPatternStyle = 'swing';
  private currentOrganism: DrumOrganism | null = null;
  private organismId: string | null = null;
  private gridSections: FlatSection[] | null = null;
  private lastScheduledBar = -1;
  private infiniteLoopCount = 0;

  private static STYLE_TO_PATTERN: Record<string, DrumPatternStyle> = {
    swing: 'swing',
    bossa: 'bossa',
    funk: 'funk',
    latin: 'latin',
    ballad: 'ballad',
  };

  setStyleProfile(profile: StyleProfile): void {
    const pat = DrumInstrument.STYLE_TO_PATTERN[profile.id];
    if (pat) {
      this.currentStyle = pat;
      this.selectOrganismForStyle();
    }
  }

  private selectOrganismForStyle(): void {
    if (this.organismId !== null) {
      const organisms = this.patternEngine.getOrganisms(this.currentStyle);
      const explicit = organisms.find((o) => o.id === this.organismId);
      this.currentOrganism = explicit ?? organisms[0] ?? null;
      return;
    }
    const organisms = this.patternEngine.getOrganisms(this.currentStyle);
    this.currentOrganism = organisms[0] ?? null;
  }

  setOrganismId(id: string | null): void {
    this.organismId = id;
    this.selectOrganismForStyle();
  }

  setStyle(style: string): void {
    const pat = DrumInstrument.STYLE_TO_PATTERN[style];
    if (pat) this.currentStyle = pat;
  }

  updateSettings(partial: Partial<DrumInstrumentSettings>): void {
    Object.assign(this.settings, partial);
  }

  setHumanizeIntensity(intensity: HumanizeIntensity): void {
    this.settings.humanizeIntensity = intensity;
  }

  setHumanize(on: boolean): void {
    this.settings.humanizeIntensity = on ? 'med' : 'off';
  }

  setGridSections(sections: Section[] | null): void {
    this.gridSections = flattenSections(sections);
  }

  reset(): void {
    this.gridSections = null;
    this.organismId = null;
    this.currentOrganism = null;
    this.lastScheduledBar = -1;
    this.infiniteLoopCount = 0;
  }

  /* ── Scheduling ────────────────────────────────────────────────────────── */

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    const s = this.settings;
    if (!s.enabled) return;

    const sig = ctx.timeSignature;
    const tsKey = timeSignatureKey(sig.beatsPerBar, sig.beatUnit);

    if (!this.currentOrganism) {
      this.scheduleDegraded(window, ctx, s);
      return;
    }

    const organism = this.currentOrganism;
    const hasTsOverride = organism?.timeSignatureOverrides?.[tsKey] !== undefined;
    const is44 = sig.beatsPerBar === 4 && sig.beatUnit === 4;
    const organismAvailable = organism !== null && (hasTsOverride || is44);

    if (organismAvailable) {
      this.scheduleOrganism(window, ctx, s);
      return;
    }

    this.scheduleDegraded(window, ctx, s);
  }

  /* ── Organism-driven scheduling ─────────────────────────────────────────── */

  private resolveBarSlot(
    absoluteBar: number,
    ctx: ScheduleContext,
  ): { cell: DrumCell; barInCell: number } | null {
    const organism = this.currentOrganism;
    if (!organism) return null;

    const sig = ctx.timeSignature;
    const tsKey = timeSignatureKey(sig.beatsPerBar, sig.beatUnit);

    if (this.gridSections) {
      for (const sec of this.gridSections) {
        if (absoluteBar >= sec.startBar && absoluteBar < sec.startBar + sec.lengthBars) {
          const barInSection = absoluteBar - sec.startBar;
          const seed = ORGANISM_SEED + absoluteBar;
          // Infinite form: track loop wraps and use loop count as passIndex
          let passIdx = sec.passIndex;
          if (sec.lengthBars === Infinity && sec.passLength != null) {
            // Detect loop wrap: bar went backwards
            if (absoluteBar < this.lastScheduledBar) {
              this.infiniteLoopCount++;
            }
            this.lastScheduledBar = absoluteBar;
            passIdx = this.infiniteLoopCount;
          }
          const result = this.patternEngine.selectCellForSectionType(
            organism,
            sec.type,
            tsKey,
            barInSection,
            this.currentStyle,
            seed,
            passIdx,
          );
          return result;
        }
      }
    }

    const form = organism.defaultForm;
    if (!form || form.length === 0) {
      const verseAPool = this.patternEngine.resolveSectionCells(organism, 'verseA', tsKey);
      if (verseAPool.length > 0) {
        // Cycle cells per cell.length bars when no form structure exists
        const cell = DRUM_CELLS_LOOKUP[verseAPool[0]!];
        if (cell) {
          const passIdx = cell.length > 0 ? Math.floor(absoluteBar / cell.length) : 0;
          return this.patternEngine.selectCellForSectionType(
            organism,
            'verseA',
            tsKey,
            absoluteBar % cell.length,
            this.currentStyle,
            ORGANISM_SEED + absoluteBar,
            passIdx,
          );
        }
      }
      return null;
    }

    // Calculate total form length for pass derivation
    let totalLen = 0;
    for (const section of form) {
      const repeats = section.repeats ?? 1;
      const pool = this.patternEngine.resolveSectionCells(organism, section.type, tsKey);
      const cellId = pool[0];
      const cell = cellId ? DRUM_CELLS_LOOKUP[cellId] : undefined;
      if (!cell) continue;
      totalLen += cell.length * repeats;
    }

    const passIdx = totalLen > 0 ? Math.floor(absoluteBar / totalLen) : 0;
    const loopBar = totalLen > 0 ? absoluteBar % totalLen : absoluteBar;

    let cursor = 0;
    for (const section of form) {
      const repeats = section.repeats ?? 1;
      const pool = this.patternEngine.resolveSectionCells(organism, section.type, tsKey);
      const cellId = pool[0];
      const cell = cellId ? DRUM_CELLS_LOOKUP[cellId] : undefined;
      if (!cell) return null;
      const sectionLen = cell.length * repeats;
      if (loopBar >= cursor && loopBar < cursor + sectionLen) {
        const barInSection = loopBar - cursor;
        return this.patternEngine.selectCellForSectionType(
          organism,
          section.type,
          tsKey,
          barInSection,
          this.currentStyle,
          ORGANISM_SEED + absoluteBar,
          passIdx,
        );
      }
      cursor += sectionLen;
    }

    // Ultimate fallback: first section's first cell, with pass cycling
    const firstPool = this.patternEngine.resolveSectionCells(organism, form[0]!.type, tsKey);
    const firstCellId = firstPool[0];
    const firstCell = firstCellId ? DRUM_CELLS_LOOKUP[firstCellId] : undefined;
    if (!firstCell) return null;
    return this.patternEngine.selectCellForSectionType(
      organism,
      form[0]!.type,
      tsKey,
      absoluteBar % firstCell.length,
      this.currentStyle,
      ORGANISM_SEED + absoluteBar,
      passIdx,
    );
  }

  private scheduleOrganism(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    s: DrumInstrumentSettings,
  ): void {
    const sig = ctx.timeSignature;
    const tpBar = ticksPerBar(sig);
    const { timingMs } = HUMANIZE_PARAMS[s.humanizeIntensity];
    const maxJitter = timingMs > 0 ? Math.round((timingMs / 1000) * (ctx.bpm / 60) * PPQ) : 0;

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const pos = this.resolveBarSlot(bar, ctx);
      if (!pos) continue;

      const barStart = bar * tpBar;
      const groove = barGrooveOffset(bar, maxJitter);

      const hits = this.patternEngine.assembleBar(
        pos.cell,
        pos.barInCell,
        ctx.swingRatio,
        ctx.playSeed ?? 0,
      );

      scheduleHits(hits, barStart, groove, window, ctx, maxJitter);
    }
  }

  /* ── Degraded fallback ──────────────────────────────────────────────────── */

  private scheduleDegraded(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    s: DrumInstrumentSettings,
  ): void {
    switch (this.currentStyle) {
      case 'bossa':
        this.scheduleDegradedBossa(window, ctx, s);
        break;
      case 'funk':
        this.scheduleDegradedFunk(window, ctx, s);
        break;
      default:
        this.scheduleDegradedSwing(window, ctx, s);
        break;
    }
  }

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
        const t = Math.max(window.fromTicks, atTicks + groove);
        if (t >= window.toTicks) continue;

        const isFirstBeat = beat === 0;
        const isStrong = strongBeats.has(beat);
        const isBackbeat =
          sig.beatsPerBar === 4 ? beat === 1 || beat === 3 : !isFirstBeat && !isStrong;

        if (s.bassDrumEnabled) {
          const vel = isFirstBeat ? 0.85 : isBackbeat ? 0.5 : 0.7;
          ctx.scheduleEvent('drums', { sound: 'bassDrum' }, t, vel, tpBeat);
        }

        if (s.snareEnabled && isBackbeat) {
          ctx.scheduleEvent('drums', { sound: 'snare' }, t, 0.9, tpBeat);
        }

        if (s.hihatEnabled && isBackbeat) {
          ctx.scheduleEvent('drums', { sound: 'hihat' }, t, 0.8, tpBeat);
        }

        if (s.rideEnabled) {
          const baseVel = isFirstBeat ? 0.85 : isBackbeat ? 0.75 : 0.8;
          ctx.scheduleEvent('drums', { sound: 'ride' }, t, baseVel, 20);
          // Skip-beat on & of 1 and 3 (4/4 only)
          if (sig.beatsPerBar === 4 && (beat === 0 || beat === 2)) {
            const offTick = atTicks + Math.round(ctx.swingRatio * tpBeat);
            const st = Math.max(window.fromTicks, offTick + groove);
            if (st < window.toTicks) {
              ctx.scheduleEvent('drums', { sound: 'ride' }, st, 0.65, 20);
            }
          }
        }

        if (s.rimEnabled && isBackbeat) {
          ctx.scheduleEvent('drums', { sound: 'rim' }, t, 0.7, tpBeat);
        }

        // Fills: extra snare on fillFrequency-th bar
        const fillEvery = s.fillFrequency === '4bars' ? 4 : s.fillFrequency === '8bars' ? 8 : 0;
        if (fillEvery > 0 && bar % fillEvery === fillEvery - 1 && (beat === 0 || beat === 3)) {
          for (let sub = 0; sub < 4; sub++) {
            const subAt = atTicks + sub * (tpBeat / 4);
            const st = Math.max(window.fromTicks, subAt + groove);
            if (st < window.toTicks) {
              ctx.scheduleEvent('drums', { sound: 'snare' }, st, 0.7, tpBeat);
            }
          }
        }
      }
    }
  }

  private scheduleDegradedBossa(
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
      // Bossa degraded for non-4/4: fall back to swing but without rim
      // (bossa uses cross-stick clave, not rim shot).
      const noRim = { ...s, rimEnabled: false };
      this.scheduleDegradedSwing(window, ctx, noRim);
      return;
    }

    const swingOffset = Math.round(ctx.swingRatio * tpBeat);
    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.floor((window.toTicks - 1) / tpBar);

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStart = bar * tpBar;
      const groove = barGrooveOffset(bar, maxJitter);

      for (let beat = 0; beat < 4; beat++) {
        const atTicks = barStart + beat * tpBeat;
        const isFirstBeat = beat === 0;
        const isBeatTwo = beat === 1;
        const isBeatThree = beat === 2;

        // Rim cross-stick: clave pattern X . X . X . . .
        if (s.rimEnabled && (isFirstBeat || isBeatTwo || isBeatThree)) {
          const t = Math.max(window.fromTicks, atTicks + groove);
          if (t < window.toTicks) {
            ctx.scheduleEvent('drums', { sound: 'rim' }, t, isFirstBeat ? 0.85 : 0.75, tpBeat);
          }
        }

        if (s.bassDrumEnabled) {
          if (isFirstBeat) {
            const t = Math.max(window.fromTicks, atTicks + groove);
            if (t < window.toTicks) {
              ctx.scheduleEvent('drums', { sound: 'bassDrum' }, t, 0.85, tpBeat);
            }
          }
          if (isBeatTwo) {
            const offTick = atTicks + swingOffset;
            const t = Math.max(window.fromTicks, offTick + groove);
            if (t < window.toTicks) {
              ctx.scheduleEvent('drums', { sound: 'bassDrum' }, t, 0.7, tpBeat);
            }
          }
        }

        if (s.hihatEnabled) {
          for (let sub = 0; sub < 2; sub++) {
            const subTicks = sub === 0 ? 0 : swingOffset;
            const subAt = atTicks + subTicks;
            const t = Math.max(window.fromTicks, subAt + groove);
            if (t < window.toTicks) {
              ctx.scheduleEvent('drums', { sound: 'hihat' }, t, sub === 0 ? 0.55 : 0.5, tpBeat);
            }
          }
        }
      }
    }
  }

  private scheduleDegradedFunk(
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

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStart = bar * tpBar;
      const groove = barGrooveOffset(bar, maxJitter);

      for (let beat = 0; beat < 4; beat++) {
        const atTicks = barStart + beat * tpBeat;
        const isBeatTwo = beat === 1;
        const isBeatFour = beat === 3;

        if (s.hihatEnabled) {
          for (let sub = 0; sub < 4; sub++) {
            let subTick: number;
            if (sub === 0) subTick = 0;
            else if (sub === 2) subTick = swingOffset;
            else if (sub === 1) subTick = sub16th;
            else subTick = sub16th * 3;

            const subAt = atTicks + subTick;
            const t = Math.max(window.fromTicks, subAt + groove);
            if (t < window.toTicks) {
              ctx.scheduleEvent('drums', { sound: 'hihat' }, t, sub === 0 ? 0.7 : 0.5, tpBeat);
            }
          }
        }

        // Bass drum: syncopated based on complexity
        if (s.bassDrumEnabled) {
          const complexity = s.funkComplexity;
          if (beat === 0) {
            const t = Math.max(window.fromTicks, atTicks + groove);
            if (t < window.toTicks) {
              ctx.scheduleEvent('drums', { sound: 'bassDrum' }, t, 0.85, tpBeat);
            }
            if (complexity === 'complex') {
              const offTick = atTicks + sub16th;
              const st = Math.max(window.fromTicks, offTick + groove);
              if (st < window.toTicks) {
                ctx.scheduleEvent('drums', { sound: 'bassDrum' }, st, 0.55, tpBeat);
              }
            }
            if (complexity === 'medium') {
              const offTick = atTicks + swingOffset;
              const st = Math.max(window.fromTicks, offTick + groove);
              if (st < window.toTicks) {
                ctx.scheduleEvent('drums', { sound: 'bassDrum' }, st, 0.7, tpBeat);
              }
            }
          }
          if (beat === 1 && complexity === 'complex') {
            const offTick = atTicks + swingOffset;
            const st = Math.max(window.fromTicks, offTick + groove);
            if (st < window.toTicks) {
              ctx.scheduleEvent('drums', { sound: 'bassDrum' }, st, 0.7, tpBeat);
            }
          }
          if (beat === 2) {
            if (complexity === 'simple') {
              const t = Math.max(window.fromTicks, atTicks + groove);
              if (t < window.toTicks) {
                ctx.scheduleEvent('drums', { sound: 'bassDrum' }, t, 0.85, tpBeat);
              }
            }
            if (complexity === 'complex') {
              const offTick = atTicks + swingOffset;
              const st = Math.max(window.fromTicks, offTick + groove);
              if (st < window.toTicks) {
                ctx.scheduleEvent('drums', { sound: 'bassDrum' }, st, 0.7, tpBeat);
              }
            }
          }
          if (beat === 3 && (complexity === 'medium' || complexity === 'complex')) {
            const t = Math.max(window.fromTicks, atTicks + groove);
            if (t < window.toTicks) {
              ctx.scheduleEvent('drums', { sound: 'bassDrum' }, t, 0.75, tpBeat);
            }
          }
        }

        // Snare: backbeat on 2 & 4 (fills on fillFrequency bars)
        if (s.snareEnabled && (isBeatTwo || isBeatFour)) {
          const t = Math.max(window.fromTicks, atTicks + groove);
          if (t < window.toTicks) {
            ctx.scheduleEvent('drums', { sound: 'snare' }, t, 0.9, tpBeat);
          }
        }

        // Fills: extra snare hits on fillFrequency-th bar
        const fillEvery = s.fillFrequency === '4bars' ? 4 : s.fillFrequency === '8bars' ? 8 : 0;
        if (fillEvery > 0 && bar % fillEvery === fillEvery - 1) {
          if (beat === 0 || beat === 3) {
            for (let sub = 0; sub < 4; sub++) {
              const subAt = atTicks + sub * sub16th;
              const st = Math.max(window.fromTicks, subAt + groove);
              if (st < window.toTicks) {
                ctx.scheduleEvent('drums', { sound: 'snare' }, st, 0.7, tpBeat);
              }
            }
          }
        }
      }
    }
  }

  dispose(): void {
    // No-op
  }
}
