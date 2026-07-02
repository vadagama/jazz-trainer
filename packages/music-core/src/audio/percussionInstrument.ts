import { ticksPerBeat } from '../time/timeSignature.js';
import type { Instrument, ScheduleContext, ScheduleWindow } from './instrument.js';
import type { PercussionSound } from './percussionSampleRegistry.js';
import type { Style } from '@jazz/shared';
import { getStyleProfile, type StyleProfile } from '../styleProfile.js';

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

// ─── Helpers ───────────────────────────────────────────────────────────────

function barGrooveOffset(bar: number, maxTicks: number): number {
  if (maxTicks <= 0) return 0;
  let h = (bar * 0x9e3779b9) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  const r = (h % 1000) / 1000;
  return Math.round((r - 0.5) * 2 * maxTicks);
}

interface PercHit {
  sound: PercussionSound;
  atTick: number;
  velocity: number;
  durationTicks: number;
}

function scheduleHits(
  hits: PercHit[],
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
    ctx.scheduleEvent('percussion', { sound: hit.sound }, t, hit.velocity, hit.durationTicks);
  }
}

function jitterTick(ms: number, bpm: number): number {
  return Math.round((ms / 1000) * (bpm / 60) * PPQ);
}

// ─── Percussion Instrument ─────────────────────────────────────────────────

export class PercussionInstrument implements Instrument {
  private settings: PercussionInstrumentSettings = { ...DEFAULT_PERCUSSION_SETTINGS };
  private currentStyle: Style = 'latin';

  private static STYLE_TO_PATTERN: Record<Style, PercussionPattern> = {
    swing: 'cascara-clave',
    bossa: 'bossa-texture',
    funk: 'funk-accents',
    latin: 'cascara-clave',
    ballad: 'bossa-texture',
  };

  setStyleProfile(profile: StyleProfile): void {
    this.currentStyle = profile.id;
    const pat = profile.instrumentDefaults.percussion.pattern as PercussionPattern | undefined;
    if (pat) {
      this.settings.pattern = pat;
    } else {
      this.settings.pattern = PercussionInstrument.STYLE_TO_PATTERN[profile.id] ?? 'cascara-clave';
    }
  }

  setStyle(style: Style): void {
    this.setStyleProfile(getStyleProfile(style));
  }

  updateSettings(patch: Partial<PercussionInstrumentSettings>): void {
    Object.assign(this.settings, patch);
  }

  setHumanizeIntensity(intensity: HumanizeIntensity): void {
    this.settings.humanizeIntensity = intensity;
  }

  reset(): void {
    this.settings = { ...DEFAULT_PERCUSSION_SETTINGS };
    this.currentStyle = 'latin';
  }

  /* ── Scheduling ──────────────────────────────────────────────────────── */

  schedule(window: ScheduleWindow, ctx: ScheduleContext): void {
    const s = this.settings;
    if (!s.enabled) return;

    const pattern = PercussionInstrument.STYLE_TO_PATTERN[this.currentStyle];
    switch (pattern) {
      case 'cascara-clave':
        this.scheduleCascaraClave(window, ctx, s);
        break;
      case 'bossa-texture':
        this.scheduleBossaTexture(window, ctx, s);
        break;
      case 'funk-accents':
        this.scheduleFunkAccents(window, ctx, s);
        break;
    }
  }

  /* ── Cascara + Clave (Latin) ─────────────────────────────────────────── */

  private scheduleCascaraClave(
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
      const hits: PercHit[] = [];
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

      // Cabasa: offbeat 8ths (complementary to shaker)
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
            {
              sound: 'clave',
              atTick: 0,
              velocity: s.claveVolume,
              durationTicks: Math.round(tpBeat * 0.25),
            },
            {
              sound: 'clave',
              atTick: Math.round(tpBeat * 1.5),
              velocity: s.claveVolume * 0.9,
              durationTicks: Math.round(tpBeat * 0.25),
            },
            {
              sound: 'clave',
              atTick: Math.round(tpBeat * 3),
              velocity: s.claveVolume * 0.85,
              durationTicks: Math.round(tpBeat * 0.25),
            },
          );
        } else {
          hits.push(
            {
              sound: 'clave',
              atTick: Math.round(tpBeat),
              velocity: s.claveVolume,
              durationTicks: Math.round(tpBeat * 0.25),
            },
            {
              sound: 'clave',
              atTick: Math.round(tpBeat * 2),
              velocity: s.claveVolume * 0.9,
              durationTicks: Math.round(tpBeat * 0.25),
            },
          );
        }
      }

      // Cascara on timbales
      if (s.timbalesEnabled) {
        const ticks = [
          0,
          Math.round(tpBeat * 1.5),
          Math.round(tpBeat * 2),
          Math.round(tpBeat * 2.5),
          Math.round(tpBeat * 3),
          Math.round(tpBeat * 3.5),
        ];
        for (const ct of ticks) {
          hits.push({
            sound: 'timbales',
            atTick: ct,
            velocity: s.timbalesVolume * (ct === 0 ? 0.9 : 0.7),
            durationTicks: Math.round(tpBeat * 0.2),
          });
        }
      }

      // Tumbao: congaLow (2&, 4&) + tumba (beat 4)
      if (s.congaLowEnabled) {
        for (const offset of [Math.round(tpBeat * 1.5), Math.round(tpBeat * 3.5)]) {
          hits.push({
            sound: 'congaLow',
            atTick: offset,
            velocity: s.congaLowVolume,
            durationTicks: Math.round(tpBeat * 0.3),
          });
        }
      }
      if (s.tumbaEnabled) {
        hits.push({
          sound: 'tumba',
          atTick: Math.round(tpBeat * 3),
          velocity: s.tumbaVolume,
          durationTicks: Math.round(tpBeat * 0.35),
        });
      }

      // CongaHigh (1&, 3&) + bongoLow (beat 2)
      if (s.congaHighEnabled) {
        for (const offset of [Math.round(tpBeat * 0.5), Math.round(tpBeat * 2.5)]) {
          hits.push({
            sound: 'congaHigh',
            atTick: offset,
            velocity: s.congaHighVolume * 0.8,
            durationTicks: Math.round(tpBeat * 0.2),
          });
        }
      }
      if (s.bongoLowEnabled) {
        hits.push({
          sound: 'bongoLow',
          atTick: Math.round(tpBeat),
          velocity: s.bongoLowVolume,
          durationTicks: Math.round(tpBeat * 0.25),
        });
      }

      // Cowbell: beats 1 and 3
      if (s.cowbellEnabled) {
        hits.push({
          sound: 'cowbell',
          atTick: 0,
          velocity: s.cowbellVolume,
          durationTicks: Math.round(tpBeat * 0.3),
        });
        hits.push({
          sound: 'cowbell',
          atTick: Math.round(tpBeat * 2),
          velocity: s.cowbellVolume * 0.8,
          durationTicks: Math.round(tpBeat * 0.3),
        });
      }

      scheduleHits(hits, barStart, groove, window, ctx, maxJitter);
    }
  }

  /* ── Bossa Texture ────────────────────────────────────────────────────── */

  private scheduleBossaTexture(
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
      const hits: PercHit[] = [];

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

      // Cabasa: sparse bossa pattern — offbeat accents
      if (s.cabasaEnabled) {
        hits.push(
          {
            sound: 'cabasa',
            atTick: Math.round(tpBeat * 0.5),
            velocity: s.cabasaVolume * 0.7,
            durationTicks: Math.round(tpBeat * 0.3),
          },
          {
            sound: 'cabasa',
            atTick: Math.round(tpBeat * 2.5),
            velocity: s.cabasaVolume * 0.6,
            durationTicks: Math.round(tpBeat * 0.3),
          },
        );
      }

      // Triangle: beats 1 and 3
      if (s.triangleEnabled) {
        hits.push(
          {
            sound: 'triangle',
            atTick: 0,
            velocity: s.triangleVolume,
            durationTicks: Math.round(tpBeat * 0.6),
          },
          {
            sound: 'triangle',
            atTick: Math.round(tpBeat * 2),
            velocity: s.triangleVolume * 0.8,
            durationTicks: Math.round(tpBeat * 0.6),
          },
        );
      }

      // Tambourine: light accents on backbeats
      if (s.tambourineEnabled) {
        hits.push(
          {
            sound: 'tambourine',
            atTick: Math.round(tpBeat),
            velocity: s.tambourineVolume * 0.7,
            durationTicks: Math.round(tpBeat * 0.25),
          },
          {
            sound: 'tambourine',
            atTick: Math.round(tpBeat * 3),
            velocity: s.tambourineVolume * 0.65,
            durationTicks: Math.round(tpBeat * 0.25),
          },
        );
      }

      // Conga low: bossa conga pattern
      if (s.congaLowEnabled) {
        hits.push(
          {
            sound: 'congaLow',
            atTick: Math.round(tpBeat),
            velocity: s.congaLowVolume,
            durationTicks: Math.round(tpBeat * 0.4),
          },
          {
            sound: 'congaLow',
            atTick: Math.round(tpBeat * 2.5),
            velocity: s.congaLowVolume * 0.85,
            durationTicks: Math.round(tpBeat * 0.4),
          },
        );
      }

      // Conga high: offbeat fills
      if (s.congaHighEnabled) {
        hits.push({
          sound: 'congaHigh',
          atTick: Math.round(tpBeat * 1.5),
          velocity: s.congaHighVolume * 0.7,
          durationTicks: Math.round(tpBeat * 0.25),
        });
      }

      // Belltree: sparse glissando at bar start (every 4th bar)
      if (s.belltreeEnabled && bar % 4 === 0) {
        hits.push({
          sound: 'belltree',
          atTick: 0,
          velocity: s.belltreeVolume,
          durationTicks: Math.round(tpBeat * 0.5),
        });
      }

      scheduleHits(hits, barStart, groove, window, ctx, maxJitter);
    }
  }

  /* ── Funk Accents ─────────────────────────────────────────────────────── */

  private scheduleFunkAccents(
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
      const hits: PercHit[] = [];

      // Cowbell: beats 1 and 3
      if (s.cowbellEnabled) {
        hits.push(
          {
            sound: 'cowbell',
            atTick: 0,
            velocity: s.cowbellVolume,
            durationTicks: Math.round(tpBeat * 0.4),
          },
          {
            sound: 'cowbell',
            atTick: Math.round(tpBeat * 2),
            velocity: s.cowbellVolume * 0.9,
            durationTicks: Math.round(tpBeat * 0.4),
          },
        );
      }

      // Conga low: syncopated
      if (s.congaLowEnabled) {
        hits.push(
          {
            sound: 'congaLow',
            atTick: Math.round(tpBeat * 0.5),
            velocity: s.congaLowVolume,
            durationTicks: Math.round(tpBeat * 0.4),
          },
          {
            sound: 'congaLow',
            atTick: Math.round(tpBeat * 3),
            velocity: s.congaLowVolume * 0.9,
            durationTicks: Math.round(tpBeat * 0.4),
          },
        );
      }

      // Tumba: deep accent on beat 1
      if (s.tumbaEnabled) {
        hits.push({
          sound: 'tumba',
          atTick: 0,
          velocity: s.tumbaVolume,
          durationTicks: Math.round(tpBeat * 0.4),
        });
      }

      // Conga high: beat 2 and offbeat of 3
      if (s.congaHighEnabled) {
        hits.push(
          {
            sound: 'congaHigh',
            atTick: Math.round(tpBeat),
            velocity: s.congaHighVolume * 0.8,
            durationTicks: Math.round(tpBeat * 0.25),
          },
          {
            sound: 'congaHigh',
            atTick: Math.round(tpBeat * 2.5),
            velocity: s.congaHighVolume * 0.7,
            durationTicks: Math.round(tpBeat * 0.25),
          },
        );
      }

      // Timbales: backbeats 2 and 4
      if (s.timbalesEnabled) {
        hits.push(
          {
            sound: 'timbales',
            atTick: Math.round(tpBeat),
            velocity: s.timbalesVolume * 0.8,
            durationTicks: Math.round(tpBeat * 0.15),
          },
          {
            sound: 'timbales',
            atTick: Math.round(tpBeat * 3),
            velocity: s.timbalesVolume,
            durationTicks: Math.round(tpBeat * 0.15),
          },
        );
      }

      // Vibraslap: funky accent at beat 3 (every 2nd bar)
      if (s.vibraslapEnabled && bar % 2 === 0) {
        hits.push({
          sound: 'vibraslap',
          atTick: Math.round(tpBeat * 2),
          velocity: s.vibraslapVolume,
          durationTicks: Math.round(tpBeat * 0.3),
        });
      }

      // Shaker: 16th note groove
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

      scheduleHits(hits, barStart, groove, window, ctx, maxJitter);
    }
  }

  dispose(): void {
    /* no-op */
  }
}
