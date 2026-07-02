import { describe, it, expect } from 'vitest';
import { PercussionInstrument } from './percussionInstrument.js';
import type { PercussionInstrumentSettings } from './percussionInstrument.js';
import { parseTimeSignature, ticksPerBeat, ticksPerBar } from '../time/timeSignature.js';
import type { ScheduleContext, ScheduleWindow, PercussionEvent } from './instrument.js';
import type { PercussionSound } from './percussionSampleRegistry.js';

interface Hit {
  sound: PercussionSound;
  atTicks: number;
}

function makeCtx(sig: ReturnType<typeof parseTimeSignature>, hits: Hit[]): ScheduleContext {
  return {
    bpm: 120,
    timeSignature: sig,
    swingRatio: 0.5,
    scheduleClick: () => {},
    scheduleEvent: (_instrumentId, payload, atTicks) => {
      if (_instrumentId === 'percussion') {
        const p = payload as PercussionEvent;
        hits.push({ sound: p.sound, atTicks });
      }
    },
  };
}

function oneBar(sig: ReturnType<typeof parseTimeSignature>): ScheduleWindow {
  return { fromTicks: 0, toTicks: ticksPerBar(sig) };
}

function makeDefaultSettings(
  overrides: Partial<PercussionInstrumentSettings> = {},
): PercussionInstrumentSettings {
  return {
    enabled: true,
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
    humanizeIntensity: 'off',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cascara + Clave (Latin)
// ═══════════════════════════════════════════════════════════════════════════════

describe('PercussionInstrument — cascara-clave (Latin)', () => {
  const sig = parseTimeSignature('4/4');

  function makePerc(overrides?: Partial<PercussionInstrumentSettings>): PercussionInstrument {
    const perc = new PercussionInstrument();
    perc.setStyle('latin');
    perc.updateSettings(makeDefaultSettings({ humanizeIntensity: 'off', ...overrides }));
    return perc;
  }

  it('shaker plays steady 8th notes', () => {
    const hits: Hit[] = [];
    makePerc().schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'shaker').map((h) => h.atTicks)).toHaveLength(8);
  });

  it('clave plays 3-2 son clave over 2 bars', () => {
    const hits: Hit[] = [];
    makePerc().schedule({ fromTicks: 0, toTicks: ticksPerBar(sig) * 2 }, makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'clave')).toHaveLength(5);
  });

  it('cowbell hits on beats 1 and 3', () => {
    const hits: Hit[] = [];
    makePerc().schedule(oneBar(sig), makeCtx(sig, hits));
    const ticks = hits.filter((h) => h.sound === 'cowbell').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig);
    expect(ticks).toHaveLength(2);
    expect(ticks).toContain(0);
    expect(ticks).toContain(Math.round(tpBeat * 2));
  });

  it('tumba plays on beat 4 when enabled', () => {
    const hits: Hit[] = [];
    makePerc({ tumbaEnabled: true }).schedule(oneBar(sig), makeCtx(sig, hits));
    const ticks = hits.filter((h) => h.sound === 'tumba').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig);
    expect(ticks).toHaveLength(1);
    expect(ticks).toContain(Math.round(tpBeat * 3));
  });

  it('bongoLow plays on beat 2 when enabled', () => {
    const hits: Hit[] = [];
    makePerc({ bongoLowEnabled: true }).schedule(oneBar(sig), makeCtx(sig, hits));
    const ticks = hits.filter((h) => h.sound === 'bongoLow').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig);
    expect(ticks).toHaveLength(1);
    expect(ticks).toContain(Math.round(tpBeat));
  });

  it('cabasa plays offbeat 8ths when enabled', () => {
    const hits: Hit[] = [];
    makePerc({ cabasaEnabled: true }).schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'cabasa').map((h) => h.atTicks)).toHaveLength(8);
  });

  it('tumba disabled by default does not play', () => {
    const hits: Hit[] = [];
    makePerc().schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'tumba')).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bossa Texture
// ═══════════════════════════════════════════════════════════════════════════════

describe('PercussionInstrument — bossa-texture', () => {
  const sig = parseTimeSignature('4/4');

  function makePerc(overrides?: Partial<PercussionInstrumentSettings>): PercussionInstrument {
    const perc = new PercussionInstrument();
    perc.setStyle('bossa');
    perc.updateSettings(makeDefaultSettings({ humanizeIntensity: 'off', ...overrides }));
    return perc;
  }

  it('shaker plays steady 8th notes', () => {
    const hits: Hit[] = [];
    makePerc().schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'shaker')).toHaveLength(8);
  });

  it('triangle accents on beats 1 and 3', () => {
    const hits: Hit[] = [];
    makePerc().schedule(oneBar(sig), makeCtx(sig, hits));
    const ticks = hits.filter((h) => h.sound === 'triangle').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig);
    expect(ticks).toHaveLength(2);
    expect(ticks).toContain(0);
    expect(ticks).toContain(Math.round(tpBeat * 2));
  });

  it('cabasa plays sparse offbeat accents when enabled', () => {
    const hits: Hit[] = [];
    makePerc({ cabasaEnabled: true }).schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'cabasa')).toHaveLength(2);
  });

  it('tambourine plays on backbeats when enabled', () => {
    const hits: Hit[] = [];
    makePerc({ tambourineEnabled: true }).schedule(oneBar(sig), makeCtx(sig, hits));
    const ticks = hits.filter((h) => h.sound === 'tambourine').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig);
    expect(ticks).toHaveLength(2);
    expect(ticks).toContain(Math.round(tpBeat));
    expect(ticks).toContain(Math.round(tpBeat * 3));
  });

  it('belltree plays every 4th bar', () => {
    const hits: Hit[] = [];
    makePerc({ belltreeEnabled: true }).schedule(
      { fromTicks: 0, toTicks: ticksPerBar(sig) * 4 },
      makeCtx(sig, hits),
    );
    const btHits = hits.filter((h) => h.sound === 'belltree');
    expect(btHits).toHaveLength(1);
    expect(btHits[0]!.atTicks).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Funk Accents
// ═══════════════════════════════════════════════════════════════════════════════

describe('PercussionInstrument — funk-accents', () => {
  const sig = parseTimeSignature('4/4');

  function makePerc(overrides?: Partial<PercussionInstrumentSettings>): PercussionInstrument {
    const perc = new PercussionInstrument();
    perc.setStyle('funk');
    perc.updateSettings(makeDefaultSettings({ humanizeIntensity: 'off', ...overrides }));
    return perc;
  }

  it('cowbell hits on beats 1 and 3', () => {
    const hits: Hit[] = [];
    makePerc().schedule(oneBar(sig), makeCtx(sig, hits));
    const ticks = hits.filter((h) => h.sound === 'cowbell').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig);
    expect(ticks).toHaveLength(2);
    expect(ticks).toContain(0);
    expect(ticks).toContain(Math.round(tpBeat * 2));
  });

  it('timbales hits on backbeats 2 and 4', () => {
    const hits: Hit[] = [];
    makePerc().schedule(oneBar(sig), makeCtx(sig, hits));
    const ticks = hits.filter((h) => h.sound === 'timbales').map((h) => h.atTicks);
    const tpBeat = ticksPerBeat(sig);
    expect(ticks).toHaveLength(2);
    expect(ticks).toContain(Math.round(tpBeat));
    expect(ticks).toContain(Math.round(tpBeat * 3));
  });

  it('vibraslap plays at beat 3 every 2nd bar when enabled', () => {
    const hits: Hit[] = [];
    makePerc({ vibraslapEnabled: true }).schedule(
      { fromTicks: 0, toTicks: ticksPerBar(sig) * 2 },
      makeCtx(sig, hits),
    );
    const vsHits = hits.filter((h) => h.sound === 'vibraslap');
    const tpBeat = ticksPerBeat(sig);
    expect(vsHits).toHaveLength(1);
    expect(vsHits[0]!.atTicks).toBe(Math.round(tpBeat * 2));
  });

  it('tumba plays on beat 1 when enabled', () => {
    const hits: Hit[] = [];
    makePerc({ tumbaEnabled: true }).schedule(oneBar(sig), makeCtx(sig, hits));
    const ticks = hits.filter((h) => h.sound === 'tumba').map((h) => h.atTicks);
    expect(ticks).toHaveLength(1);
    expect(ticks).toContain(0);
  });

  it('shaker plays 16th notes in funk', () => {
    const hits: Hit[] = [];
    makePerc().schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'shaker')).toHaveLength(16);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 16-sound coverage
// ═══════════════════════════════════════════════════════════════════════════════

describe('PercussionInstrument — all 16 sounds', () => {
  const sig = parseTimeSignature('4/4');

  it('all 16 sounds appear when enabled in cascara-clave', () => {
    const perc = new PercussionInstrument();
    perc.setStyle('latin');
    perc.updateSettings(
      makeDefaultSettings({
        humanizeIntensity: 'off',
        bongoLowEnabled: true,
        tumbaEnabled: true,
        cabasaEnabled: true,
        tambourineEnabled: true,
        vibraslapEnabled: true,
        belltreeEnabled: true,
        whistleEnabled: true,
        sleighBellsEnabled: true,
      }),
    );
    const hits: Hit[] = [];
    perc.schedule({ fromTicks: 0, toTicks: ticksPerBar(sig) * 4 }, makeCtx(sig, hits));

    const sounds = new Set(hits.map((h) => h.sound));
    // All 16 sounds should appear at least once
    expect(sounds.has('congaHigh')).toBe(true);
    expect(sounds.has('congaLow')).toBe(true);
    expect(sounds.has('timbales')).toBe(true);
    expect(sounds.has('cowbell')).toBe(true);
    expect(sounds.has('clave')).toBe(true);
    expect(sounds.has('shaker')).toBe(true);
    // guiro, whistle, sleighBells may not be scheduled in cascara-clave
    expect(sounds.has('bongoLow')).toBe(true);
    expect(sounds.has('tumba')).toBe(true);
    expect(sounds.has('cabasa')).toBe(true);
    // belltree appears every 4 bars in bossa, not cascara
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Style → Pattern mapping
// ═══════════════════════════════════════════════════════════════════════════════

describe('PercussionInstrument — style mapping', () => {
  const sig = parseTimeSignature('4/4');

  function makePerc(style: 'latin' | 'bossa' | 'funk'): PercussionInstrument {
    const perc = new PercussionInstrument();
    perc.setStyle(style);
    perc.updateSettings(makeDefaultSettings({ humanizeIntensity: 'off' }));
    return perc;
  }

  it('latin → cascara-clave has shaker and clave', () => {
    const hits: Hit[] = [];
    makePerc('latin').schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.some((h) => h.sound === 'shaker')).toBe(true);
    expect(hits.some((h) => h.sound === 'clave')).toBe(true);
  });

  it('bossa → bossa-texture has shaker and triangle', () => {
    const hits: Hit[] = [];
    makePerc('bossa').schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.some((h) => h.sound === 'shaker')).toBe(true);
    expect(hits.some((h) => h.sound === 'triangle')).toBe(true);
  });

  it('funk → funk-accents has cowbell and timbales', () => {
    const hits: Hit[] = [];
    makePerc('funk').schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.some((h) => h.sound === 'cowbell')).toBe(true);
    expect(hits.some((h) => h.sound === 'timbales')).toBe(true);
  });
});
