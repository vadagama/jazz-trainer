import {
  ticksPerBar,
  ticksPerBeat,
} from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { Section, SectionType } from '@jazz/shared';
import type { StyleProfile } from '../styleProfile.js';
import { PercussionPatternEngine } from './percussionPatternEngine.js';
import type {
  PercussionSound,
  PercussionHit,
  PercussionCell,
  PercussionOrganism,
  PercussionPatternStyle,
} from './percussionPatternTypes.js';
import { PERCUSSION_CELLS } from './percussionCells.js';
import { expandRange } from '../playback/repeatExpansion.js';

// ─── Types ─────────────────────────────────────────────────────────────────

export type PercussionPattern = 'cascara-clave' | 'bossa-texture' | 'funk-accents';

export type HumanizeIntensity = 'off' | 'low' | 'med' | 'high';

const HUMANIZE_PARAMS: Record<HumanizeIntensity, { timingMs: number }> = {
  off: { timingMs: 0 },
  low: { timingMs: 2 },
  med: { timingMs: 4 },
  high: { timingMs: 6 },
};

const PPQ = 480;

// ─── Settings ──────────────────────────────────────────────────────────────

export interface PercussionInstrumentSettings {
  enabled: boolean;
  volume: number;
  pattern: PercussionPattern;

  // Core Latin percussion (8 original sounds)
  congaHighEnabled: boolean;
  congaHighVolume: number;
  congaLowEnabled: boolean;
  congaLowVolume: number;
  timbalesEnabled: boolean;
  timbalesVolume: number;
  cowbellEnabled: boolean;
  cowbellVolume: number;
  claveEnabled: boolean;
  claveVolume: number;
  shakerEnabled: boolean;
  shakerVolume: number;
  guiroEnabled: boolean;
  guiroVolume: number;
  triangleEnabled: boolean;
  triangleVolume: number;

  // Extended percussion (8 additional sounds)
  bongoLowEnabled: boolean;
  bongoLowVolume: number;
  tumbaEnabled: boolean;
  tumbaVolume: number;
  cabasaEnabled: boolean;
  cabasaVolume: number;
  tambourineEnabled: boolean;
  tambourineVolume: number;
  vibraslapEnabled: boolean;
  vibraslapVolume: number;
  belltreeEnabled: boolean;
  belltreeVolume: number;
  whistleEnabled: boolean;
  whistleVolume: number;
  sleighBellsEnabled: boolean;
  sleighBellsVolume: number;

  humanizeIntensity: HumanizeIntensity;
}

export const DEFAULT_PERCUSSION_SETTINGS: PercussionInstrumentSettings = {
  enabled: false,
  volume: 0.7,
  pattern: 'cascara-clave',

  congaHighEnabled: true,
  congaHighVolume: 0.7,
  congaLowEnabled: true,
  congaLowVolume: 0.75,
  timbalesEnabled: true,
  timbalesVolume: 0.65,
  cowbellEnabled: true,
  cowbellVolume: 0.6,
  claveEnabled: true,
  claveVolume: 0.7,
  shakerEnabled: true,
  shakerVolume: 0.55,
  guiroEnabled: true,
  guiroVolume: 0.5,
  triangleEnabled: true,
  triangleVolume: 0.5,

  bongoLowEnabled: false,
  bongoLowVolume: 0.65,
  tumbaEnabled: false,
  tumbaVolume: 0.7,
  cabasaEnabled: false,
  cabasaVolume: 0.55,
  tambourineEnabled: false,
  tambourineVolume: 0.5,
  vibraslapEnabled: false,
  vibraslapVolume: 0.55,
  belltreeEnabled: false,
  belltreeVolume: 0.45,
  whistleEnabled: false,
  whistleVolume: 0.5,
  sleighBellsEnabled: false,
  sleighBellsVolume: 0.4,

  humanizeIntensity: 'low',
};

// ─── Per-sound enable lookup ──────────────────────────────────────────────

const SOUND_ENABLED_KEY: Record<PercussionSound, keyof PercussionInstrumentSettings> = {
  congaHigh: 'congaHighEnabled',
  congaLow: 'congaLowEnabled',
  bongoLow: 'bongoLowEnabled',
  tumba: 'tumbaEnabled',
  timbales: 'timbalesEnabled',
  cowbell: 'cowbellEnabled',
  clave: 'claveEnabled',
  shaker: 'shakerEnabled',
  guiro: 'guiroEnabled',
  cabasa: 'cabasaEnabled',
  triangle: 'triangleEnabled',
  tambourine: 'tambourineEnabled',
  vibraslap: 'vibraslapEnabled',
  belltree: 'belltreeEnabled',
  whistle: 'whistleEnabled',
  sleighBells: 'sleighBellsEnabled',
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function barGrooveOffset(bar: number, maxTicks: number): number {
  if (maxTicks <= 0) return 0;
  let h = bar * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = ((h >> 16) ^ h) & 0x7fffffff;
  const r = h / 0x7fffffff;
  return Math.round((r - 0.5) * 2 * maxTicks);
}

function scheduleHits(
  hits: PercussionHit[],
  barStart: number,
  groove: number,
  window: ScheduleWindow,
  ctx: ScheduleContext,
  maxJitter: number,
  s: PercussionInstrumentSettings,
): void {
  for (const hit of hits) {
    // Per-sound enable gate
    const enabledKey = SOUND_ENABLED_KEY[hit.sound];
    if (enabledKey && !s[enabledKey]) continue;

    const raw = barStart + hit.atTick + groove;
    if (raw < window.fromTicks - maxJitter || raw >= window.toTicks) continue;
    const t = Math.max(window.fromTicks, raw);
    ctx.scheduleEvent('percussion', { sound: hit.sound }, t, hit.velocity, hit.durationTicks);
  }
}

function jitterTick(ms: number, bpm: number): number {
  return Math.round((ms / 1000) * (bpm / 60) * PPQ);
}

function timeSignatureKey(beatsPerBar: number, beatUnit: number): string {
  return `${beatsPerBar}/${beatUnit}`;
}

// ─── Grid helpers (same pattern as DrumInstrument) ────────────────────────

interface FlatSection {
  type: SectionType;
  timeSignature: string;
  startBar: number;
  lengthBars: number;
}

function flattenSections(sections: Section[] | null): FlatSection[] | null {
  if (!sections || sections.length === 0) return null;

  const lastSection = sections[sections.length - 1]!;
  const lastBar = lastSection.bars[lastSection.bars.length - 1];
  const formRepeat = lastBar?.repeatEnd;
  const isFormInfinite = formRepeat?.count === null;

  const formPasses = isFormInfinite ? 1 : (formRepeat?.count ?? 1);

  const flat: FlatSection[] = [];
  let cursor = 0;

  for (let pass = 0; pass < formPasses; pass++) {
    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i]!;
      const [beatsPerBar, beatUnit] = sec.timeSignature.split('/').map(Number);
      const isLast = i === sections.length - 1;

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
      });
      cursor += expanded.length;
    }
  }

  if (isFormInfinite && flat.length > 0) {
    const last = flat[flat.length - 1]!;
    flat[flat.length - 1] = { ...last, lengthBars: Infinity };
  }

  return flat;
}

// ─── Percussion Instrument ─────────────────────────────────────────────────

export class PercussionInstrument implements Instrument {
  private settings: PercussionInstrumentSettings = { ...DEFAULT_PERCUSSION_SETTINGS };
  private patternEngine = new PercussionPatternEngine();
  private currentStyle: PercussionPatternStyle = 'latin';
  private userStyle: string = 'latin';
  private currentOrganism: PercussionOrganism | null = null;
  private organismId: string | null = null;
  private gridSections: FlatSection[] | null = null;

  private static STYLE_TO_PATTERN: Record<string, PercussionPatternStyle> = {
    swing: 'latin',
    bossa: 'bossa',
    funk: 'funk',
    latin: 'latin',
    ballad: 'bossa',
  };

  private static STYLE_TO_LEGACY: Record<string, PercussionPattern> = {
    swing: 'cascara-clave',
    bossa: 'bossa-texture',
    funk: 'funk-accents',
    latin: 'cascara-clave',
    ballad: 'bossa-texture',
  };

  setStyleProfile(profile: StyleProfile): void {
    this.userStyle = profile.id;
    const pat = PercussionInstrument.STYLE_TO_PATTERN[profile.id];
    if (pat) {
      this.currentStyle = pat;
      this.selectOrganismForStyle();
    }

    // Also update legacy pattern from profile defaults
    const legacyPat = profile.instrumentDefaults.percussion.pattern as PercussionPattern | undefined;
    if (legacyPat) {
      this.settings.pattern = legacyPat;
    } else {
      this.settings.pattern =
        PercussionInstrument.STYLE_TO_LEGACY[profile.id] ?? 'cascara-clave';
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
    const pat = PercussionInstrument.STYLE_TO_PATTERN[style];
    if (pat) {
      this.currentStyle = pat;
      this.userStyle = style;
      this.selectOrganismForStyle();
    }
  }

  updateSettings(patch: Partial<PercussionInstrumentSettings>): void {
    Object.assign(this.settings, patch);
  }

  setHumanizeIntensity(intensity: HumanizeIntensity): void {
    this.settings.humanizeIntensity = intensity;
  }

  setGridSections(sections: Section[] | null): void {
    this.gridSections = flattenSections(sections);
  }

  reset(): void {
    this.settings = { ...DEFAULT_PERCUSSION_SETTINGS };
    this.currentStyle = 'latin';
    this.userStyle = 'latin';
    this.gridSections = null;
    this.organismId = null;
    this.currentOrganism = null;
  }

  /* ── Scheduling ──────────────────────────────────────────────────────── */

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

  /* ── Organism-driven scheduling ─────────────────────────────────────── */

  private resolveBarSlot(
    absoluteBar: number,
    ctx: ScheduleContext,
  ): { cell: PercussionCell; barInCell: number } | null {
    const organism = this.currentOrganism;
    if (!organism) return null;

    const sig = ctx.timeSignature;
    const tsKey = timeSignatureKey(sig.beatsPerBar, sig.beatUnit);

    if (this.gridSections) {
      for (const sec of this.gridSections) {
        if (absoluteBar >= sec.startBar && absoluteBar < sec.startBar + sec.lengthBars) {
          const barInSection = absoluteBar - sec.startBar;
          return this.patternEngine.selectCellForSectionType(
            organism,
            sec.type,
            tsKey,
            barInSection,
            this.currentStyle,
          );
        }
      }
    }

    const form = organism.defaultForm;
    if (!form || form.length === 0) {
      const verseAPool = this.patternEngine.resolveSectionCells(organism, 'verseA', tsKey);
      if (verseAPool.length > 0) {
        const cell = PERCUSSION_CELLS[verseAPool[0]!];
        if (cell) return { cell, barInCell: absoluteBar % cell.length };
      }
      return null;
    }

    let cursor = 0;
    for (const section of form) {
      const repeats = section.repeats ?? 1;
      const pool = this.patternEngine.resolveSectionCells(organism, section.type, tsKey);
      const cellId = pool[0];
      const cell = cellId ? PERCUSSION_CELLS[cellId] : undefined;
      if (!cell) return null;
      const sectionLen = cell.length * repeats;
      if (absoluteBar >= cursor && absoluteBar < cursor + sectionLen) {
        const barInSection = absoluteBar - cursor;
        return { cell, barInCell: barInSection % cell.length };
      }
      cursor += sectionLen;
    }

    const firstPool = this.patternEngine.resolveSectionCells(organism, form[0]!.type, tsKey);
    const firstCellId = firstPool[0];
    const firstCell = firstCellId ? PERCUSSION_CELLS[firstCellId] : undefined;
    if (!firstCell) return null;
    return { cell: firstCell, barInCell: absoluteBar % firstCell.length };
  }

  private scheduleOrganism(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    s: PercussionInstrumentSettings,
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

      const hits = this.patternEngine.assembleBar(pos.cell, pos.barInCell, ctx.swingRatio);

      scheduleHits(hits, barStart, groove, window, ctx, maxJitter, s);
    }
  }

  /* ── Degraded fallback ──────────────────────────────────────────────── */

  private scheduleDegraded(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    s: PercussionInstrumentSettings,
  ): void {
    const pattern = PercussionInstrument.STYLE_TO_LEGACY[this.userStyle] ?? this.settings.pattern;
    switch (pattern) {
      case 'cascara-clave':
        this.scheduleDegradedLatin(window, ctx, s);
        break;
      case 'bossa-texture':
        this.scheduleDegradedBossa(window, ctx, s);
        break;
      case 'funk-accents':
        this.scheduleDegradedFunk(window, ctx, s);
        break;
    }
  }

  /* ── Cascara + Clave (Latin) degraded ───────────────────────────────── */

  private scheduleDegradedLatin(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    s: PercussionInstrumentSettings,
  ): void {
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);
    const tpBar = tpBeat * sig.beatsPerBar;
    const timingMs = HUMANIZE_PARAMS[s.humanizeIntensity].timingMs;
    const maxJitter = jitterTick(timingMs, ctx.bpm);

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.ceil(window.toTicks / tpBar) - 1;

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStart = bar * tpBar;
      const groove = barGrooveOffset(bar, maxJitter);
      const hits: PercussionHit[] = [];
      const claveCycle = bar % 2;

      // Shaker: steady 8th notes
      if (s.shakerEnabled) {
        for (let eighth = 0; eighth < sig.beatsPerBar * 2; eighth++) {
          const atTick = Math.round(eighth * (tpBeat / 2));
          hits.push({
            sound: 'shaker',
            atTick,
            velocity: s.shakerVolume * (eighth % 2 === 0 ? 0.8 : 0.5),
            durationTicks: Math.round(tpBeat / 3),
          });
        }
      }

      // Cabasa: offbeat 8ths
      if (s.cabasaEnabled) {
        for (let eighth = 0; eighth < sig.beatsPerBar * 2; eighth++) {
          const atTick = Math.round(eighth * (tpBeat / 2));
          hits.push({
            sound: 'cabasa',
            atTick,
            velocity: s.cabasaVolume * (eighth % 2 === 1 ? 0.75 : 0.4),
            durationTicks: Math.round(tpBeat / 3),
          });
        }
      }

      // Clave: son 3-2
      if (s.claveEnabled) {
        if (claveCycle === 0) {
          hits.push(
            { sound: 'clave', atTick: 0, velocity: s.claveVolume, durationTicks: Math.round(tpBeat * 0.25) },
            { sound: 'clave', atTick: Math.round(tpBeat * 1.5), velocity: s.claveVolume * 0.9, durationTicks: Math.round(tpBeat * 0.25) },
            { sound: 'clave', atTick: Math.round(tpBeat * 3), velocity: s.claveVolume * 0.85, durationTicks: Math.round(tpBeat * 0.25) },
          );
        } else {
          hits.push(
            { sound: 'clave', atTick: Math.round(tpBeat), velocity: s.claveVolume, durationTicks: Math.round(tpBeat * 0.25) },
            { sound: 'clave', atTick: Math.round(tpBeat * 2), velocity: s.claveVolume * 0.9, durationTicks: Math.round(tpBeat * 0.25) },
          );
        }
      }

      // Cascara on timbales
      if (s.timbalesEnabled) {
        const ticks = [0, Math.round(tpBeat * 1.5), Math.round(tpBeat * 2), Math.round(tpBeat * 2.5), Math.round(tpBeat * 3), Math.round(tpBeat * 3.5)];
        for (const ct of ticks) {
          hits.push({ sound: 'timbales', atTick: ct, velocity: s.timbalesVolume * (ct === 0 ? 0.9 : 0.7), durationTicks: Math.round(tpBeat * 0.2) });
        }
      }

      // Tumbao
      if (s.congaLowEnabled) {
        for (const offset of [Math.round(tpBeat * 1.5), Math.round(tpBeat * 3.5)]) {
          hits.push({ sound: 'congaLow', atTick: offset, velocity: s.congaLowVolume, durationTicks: Math.round(tpBeat * 0.3) });
        }
      }
      if (s.tumbaEnabled) {
        hits.push({ sound: 'tumba', atTick: Math.round(tpBeat * 3), velocity: s.tumbaVolume, durationTicks: Math.round(tpBeat * 0.35) });
      }

      // CongaHigh + bongoLow
      if (s.congaHighEnabled) {
        for (const offset of [Math.round(tpBeat * 0.5), Math.round(tpBeat * 2.5)]) {
          hits.push({ sound: 'congaHigh', atTick: offset, velocity: s.congaHighVolume * 0.8, durationTicks: Math.round(tpBeat * 0.2) });
        }
      }
      if (s.bongoLowEnabled) {
        hits.push({ sound: 'bongoLow', atTick: Math.round(tpBeat), velocity: s.bongoLowVolume, durationTicks: Math.round(tpBeat * 0.25) });
      }

      // Cowbell
      if (s.cowbellEnabled) {
        hits.push({ sound: 'cowbell', atTick: 0, velocity: s.cowbellVolume, durationTicks: Math.round(tpBeat * 0.3) });
        hits.push({ sound: 'cowbell', atTick: Math.round(tpBeat * 2), velocity: s.cowbellVolume * 0.8, durationTicks: Math.round(tpBeat * 0.3) });
      }

      scheduleHits(hits, barStart, groove, window, ctx, maxJitter, s);
    }
  }

  /* ── Bossa Texture degraded ─────────────────────────────────────────── */

  private scheduleDegradedBossa(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    s: PercussionInstrumentSettings,
  ): void {
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);
    const tpBar = tpBeat * sig.beatsPerBar;
    const timingMs = HUMANIZE_PARAMS[s.humanizeIntensity].timingMs;
    const maxJitter = jitterTick(timingMs, ctx.bpm);

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.ceil(window.toTicks / tpBar) - 1;

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStart = bar * tpBar;
      const groove = barGrooveOffset(bar, maxJitter);
      const hits: PercussionHit[] = [];

      // Shaker: steady 8th notes
      if (s.shakerEnabled) {
        for (let eighth = 0; eighth < sig.beatsPerBar * 2; eighth++) {
          const atTick = Math.round(eighth * (tpBeat / 2));
          hits.push({
            sound: 'shaker',
            atTick,
            velocity: s.shakerVolume * (eighth % 2 === 0 ? 0.75 : 0.45),
            durationTicks: Math.round(tpBeat / 3),
          });
        }
      }

      // Cabasa: sparse
      if (s.cabasaEnabled) {
        hits.push(
          { sound: 'cabasa', atTick: Math.round(tpBeat * 0.5), velocity: s.cabasaVolume * 0.7, durationTicks: Math.round(tpBeat * 0.3) },
          { sound: 'cabasa', atTick: Math.round(tpBeat * 2.5), velocity: s.cabasaVolume * 0.6, durationTicks: Math.round(tpBeat * 0.3) },
        );
      }

      // Triangle
      if (s.triangleEnabled) {
        hits.push(
          { sound: 'triangle', atTick: 0, velocity: s.triangleVolume, durationTicks: Math.round(tpBeat * 0.6) },
          { sound: 'triangle', atTick: Math.round(tpBeat * 2), velocity: s.triangleVolume * 0.8, durationTicks: Math.round(tpBeat * 0.6) },
        );
      }

      // Tambourine
      if (s.tambourineEnabled) {
        hits.push(
          { sound: 'tambourine', atTick: Math.round(tpBeat), velocity: s.tambourineVolume * 0.7, durationTicks: Math.round(tpBeat * 0.25) },
          { sound: 'tambourine', atTick: Math.round(tpBeat * 3), velocity: s.tambourineVolume * 0.65, durationTicks: Math.round(tpBeat * 0.25) },
        );
      }

      // Conga
      if (s.congaLowEnabled) {
        hits.push(
          { sound: 'congaLow', atTick: Math.round(tpBeat), velocity: s.congaLowVolume, durationTicks: Math.round(tpBeat * 0.4) },
          { sound: 'congaLow', atTick: Math.round(tpBeat * 2.5), velocity: s.congaLowVolume * 0.85, durationTicks: Math.round(tpBeat * 0.4) },
        );
      }
      if (s.congaHighEnabled) {
        hits.push({ sound: 'congaHigh', atTick: Math.round(tpBeat * 1.5), velocity: s.congaHighVolume * 0.7, durationTicks: Math.round(tpBeat * 0.25) });
      }

      // Belltree
      if (s.belltreeEnabled && bar % 4 === 0) {
        hits.push({ sound: 'belltree', atTick: 0, velocity: s.belltreeVolume, durationTicks: Math.round(tpBeat * 0.5) });
      }

      scheduleHits(hits, barStart, groove, window, ctx, maxJitter, s);
    }
  }

  /* ── Funk Accents degraded ──────────────────────────────────────────── */

  private scheduleDegradedFunk(
    window: ScheduleWindow,
    ctx: ScheduleContext,
    s: PercussionInstrumentSettings,
  ): void {
    const sig = ctx.timeSignature;
    const tpBeat = ticksPerBeat(sig);
    const tpBar = tpBeat * sig.beatsPerBar;
    const timingMs = HUMANIZE_PARAMS[s.humanizeIntensity].timingMs;
    const maxJitter = jitterTick(timingMs, ctx.bpm);

    const firstBar = Math.floor(window.fromTicks / tpBar);
    const lastBar = Math.ceil(window.toTicks / tpBar) - 1;

    for (let bar = firstBar; bar <= lastBar; bar++) {
      const barStart = bar * tpBar;
      const groove = barGrooveOffset(bar, maxJitter);
      const hits: PercussionHit[] = [];

      // Cowbell
      if (s.cowbellEnabled) {
        hits.push(
          { sound: 'cowbell', atTick: 0, velocity: s.cowbellVolume, durationTicks: Math.round(tpBeat * 0.4) },
          { sound: 'cowbell', atTick: Math.round(tpBeat * 2), velocity: s.cowbellVolume * 0.9, durationTicks: Math.round(tpBeat * 0.4) },
        );
      }

      // Conga
      if (s.congaLowEnabled) {
        hits.push(
          { sound: 'congaLow', atTick: Math.round(tpBeat * 0.5), velocity: s.congaLowVolume, durationTicks: Math.round(tpBeat * 0.4) },
          { sound: 'congaLow', atTick: Math.round(tpBeat * 3), velocity: s.congaLowVolume * 0.9, durationTicks: Math.round(tpBeat * 0.4) },
        );
      }
      if (s.tumbaEnabled) {
        hits.push({ sound: 'tumba', atTick: 0, velocity: s.tumbaVolume, durationTicks: Math.round(tpBeat * 0.4) });
      }
      if (s.congaHighEnabled) {
        hits.push(
          { sound: 'congaHigh', atTick: Math.round(tpBeat), velocity: s.congaHighVolume * 0.8, durationTicks: Math.round(tpBeat * 0.25) },
          { sound: 'congaHigh', atTick: Math.round(tpBeat * 2.5), velocity: s.congaHighVolume * 0.7, durationTicks: Math.round(tpBeat * 0.25) },
        );
      }

      // Timbales
      if (s.timbalesEnabled) {
        hits.push(
          { sound: 'timbales', atTick: Math.round(tpBeat), velocity: s.timbalesVolume * 0.8, durationTicks: Math.round(tpBeat * 0.15) },
          { sound: 'timbales', atTick: Math.round(tpBeat * 3), velocity: s.timbalesVolume, durationTicks: Math.round(tpBeat * 0.15) },
        );
      }

      // Vibraslap
      if (s.vibraslapEnabled && bar % 2 === 0) {
        hits.push({ sound: 'vibraslap', atTick: Math.round(tpBeat * 2), velocity: s.vibraslapVolume, durationTicks: Math.round(tpBeat * 0.3) });
      }

      // Shaker: 16th notes
      if (s.shakerEnabled) {
        for (let sixteenth = 0; sixteenth < sig.beatsPerBar * 4; sixteenth++) {
          const atTick = Math.round(sixteenth * (tpBeat / 4));
          const isAccent = sixteenth % 4 === 0;
          hits.push({
            sound: 'shaker',
            atTick,
            velocity: s.shakerVolume * (isAccent ? 0.7 : 0.35),
            durationTicks: Math.round(tpBeat / 5),
          });
        }
      }

      scheduleHits(hits, barStart, groove, window, ctx, maxJitter, s);
    }
  }

  dispose(): void {
    /* no-op */
  }
}
