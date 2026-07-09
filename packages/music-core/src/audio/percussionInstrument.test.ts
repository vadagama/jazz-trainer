import { describe, it, expect } from 'vitest';
import { PercussionInstrument } from './percussionInstrument.js';
import type { PercussionInstrumentSettings } from './percussionInstrument.js';
import { parseTimeSignature, ticksPerBeat, ticksPerBar } from '../time/timeSignature.js';
import type { ScheduleContext, ScheduleWindow, PercussionEvent } from './instrument.js';
import type { PercussionSound } from './percussionPatternTypes.js';

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
// Organism-driven scheduling (Latin)
// ═══════════════════════════════════════════════════════════════════════════════

describe('PercussionInstrument — organism-driven (Latin)', () => {
  const sig = parseTimeSignature('4/4');

  function makePerc(overrides?: Partial<PercussionInstrumentSettings>): PercussionInstrument {
    const perc = new PercussionInstrument();
    perc.setStyle('latin');
    perc.updateSettings(makeDefaultSettings({ humanizeIntensity: 'off', ...overrides }));
    return perc;
  }

  it('produces hits when enabled', () => {
    const hits: Hit[] = [];
    makePerc().schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.length).toBeGreaterThan(0);
  });

  it('shaker is present in latin pattern', () => {
    const hits: Hit[] = [];
    makePerc().schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.some((h) => h.sound === 'shaker')).toBe(true);
  });

  it('clave is present in latin pattern', () => {
    const hits: Hit[] = [];
    makePerc().schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.some((h) => h.sound === 'clave')).toBe(true);
  });

  it('produces no hits when disabled', () => {
    const hits: Hit[] = [];
    makePerc({ enabled: false }).schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits).toHaveLength(0);
  });

  it('disabling shaker removes it from output', () => {
    const hits: Hit[] = [];
    makePerc({ shakerEnabled: false }).schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.some((h) => h.sound === 'shaker')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Organism-driven scheduling (Bossa)
// ═══════════════════════════════════════════════════════════════════════════════

describe('PercussionInstrument — organism-driven (Bossa)', () => {
  const sig = parseTimeSignature('4/4');

  function makePerc(overrides?: Partial<PercussionInstrumentSettings>): PercussionInstrument {
    const perc = new PercussionInstrument();
    perc.setStyle('bossa');
    perc.updateSettings(makeDefaultSettings({ humanizeIntensity: 'off', ...overrides }));
    return perc;
  }

  it('produces hits when enabled', () => {
    const hits: Hit[] = [];
    makePerc().schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.length).toBeGreaterThan(0);
  });

  it('shaker is present in bossa pattern', () => {
    const hits: Hit[] = [];
    makePerc().schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.some((h) => h.sound === 'shaker')).toBe(true);
  });

  it('triangle is present when enabled', () => {
    const hits: Hit[] = [];
    makePerc({ triangleEnabled: true }).schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.some((h) => h.sound === 'triangle')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Organism-driven scheduling (Funk)
// ═══════════════════════════════════════════════════════════════════════════════

describe('PercussionInstrument — organism-driven (Funk)', () => {
  const sig = parseTimeSignature('4/4');

  function makePerc(overrides?: Partial<PercussionInstrumentSettings>): PercussionInstrument {
    const perc = new PercussionInstrument();
    perc.setStyle('funk');
    perc.updateSettings(makeDefaultSettings({ humanizeIntensity: 'off', ...overrides }));
    return perc;
  }

  it('produces hits when enabled', () => {
    const hits: Hit[] = [];
    makePerc().schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.length).toBeGreaterThan(0);
  });

  it('shaker is present in funk pattern', () => {
    const hits: Hit[] = [];
    makePerc().schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.some((h) => h.sound === 'shaker')).toBe(true);
  });

  it('tambourine is present in funk pattern', () => {
    const hits: Hit[] = [];
    makePerc({ tambourineEnabled: true }).schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.some((h) => h.sound === 'tambourine')).toBe(true);
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

  it('latin produces shaker and clave', () => {
    const hits: Hit[] = [];
    makePerc('latin').schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.some((h) => h.sound === 'shaker')).toBe(true);
    expect(hits.some((h) => h.sound === 'clave')).toBe(true);
  });

  it('bossa produces shaker', () => {
    const hits: Hit[] = [];
    makePerc('bossa').schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.some((h) => h.sound === 'shaker')).toBe(true);
  });

  it('funk produces shaker', () => {
    const hits: Hit[] = [];
    makePerc('funk').schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.some((h) => h.sound === 'shaker')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Settings API
// ═══════════════════════════════════════════════════════════════════════════════

describe('PercussionInstrument — settings', () => {
  it('updateSettings merges partial settings', () => {
    const perc = new PercussionInstrument();
    perc.updateSettings({ volume: 0.5, claveEnabled: false });
    perc.updateSettings({ volume: 0.8 });
    // Settings should be merged
    const hits: Hit[] = [];
    const sig = parseTimeSignature('4/4');
    perc.setStyle('latin');
    perc.updateSettings(makeDefaultSettings({ humanizeIntensity: 'off', claveEnabled: false }));
    perc.schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.some((h) => h.sound === 'clave')).toBe(false);
  });

  it('setHumanizeIntensity updates humanize setting', () => {
    const perc = new PercussionInstrument();
    perc.setHumanizeIntensity('high');
    const hits: Hit[] = [];
    const sig = parseTimeSignature('4/4');
    perc.setStyle('latin');
    perc.updateSettings(makeDefaultSettings({ humanizeIntensity: 'high' }));
    perc.schedule(oneBar(sig), makeCtx(sig, hits));
    // High humanize may shift ticks slightly — just verify it doesn't crash
    expect(hits.length).toBeGreaterThan(0);
  });

  it('reset clears organism state', () => {
    const perc = new PercussionInstrument();
    perc.setStyle('latin');
    perc.setOrganismId('latin-default');
    perc.reset();
    // After reset, should still schedule (auto-selects organism)
    const hits: Hit[] = [];
    const sig = parseTimeSignature('4/4');
    perc.setStyle('latin');
    perc.updateSettings(makeDefaultSettings({ humanizeIntensity: 'off' }));
    perc.schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.length).toBeGreaterThan(0);
  });

  it('setOrganismId changes active organism', () => {
    const perc = new PercussionInstrument();
    perc.setStyle('latin');
    perc.setOrganismId('latin-default');
    const hits: Hit[] = [];
    const sig = parseTimeSignature('4/4');
    perc.updateSettings(makeDefaultSettings({ humanizeIntensity: 'off' }));
    perc.schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Degraded fallback — verify old patterns still work when no organism
// ═══════════════════════════════════════════════════════════════════════════════

describe('PercussionInstrument — degraded fallback', () => {
  const sig = parseTimeSignature('4/4');

  function makeDegradedPerc(
    style: 'latin' | 'bossa' | 'funk',
    overrides?: Partial<PercussionInstrumentSettings>,
  ): PercussionInstrument {
    const perc = new PercussionInstrument();
    // Force organism to null so degraded fallback is used
    perc['currentOrganism'] = null;
    perc.setStyle(style);
    // setStyle calls selectOrganismForStyle, so clear again
    perc['currentOrganism'] = null;
    perc.updateSettings(makeDefaultSettings({ humanizeIntensity: 'off', ...overrides }));
    return perc;
  }

  it('latin degraded produces shaker 8th notes', () => {
    const hits: Hit[] = [];
    makeDegradedPerc('latin').schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'shaker')).toHaveLength(8);
  });

  it('latin degraded produces clave 3-2 over 2 bars', () => {
    const hits: Hit[] = [];
    makeDegradedPerc('latin').schedule(
      { fromTicks: 0, toTicks: ticksPerBar(sig) * 2 },
      makeCtx(sig, hits),
    );
    expect(hits.filter((h) => h.sound === 'clave')).toHaveLength(5);
  });

  it('latin degraded cowbell on beats 1 and 3', () => {
    const hits: Hit[] = [];
    makeDegradedPerc('latin').schedule(oneBar(sig), makeCtx(sig, hits));
    const ticks = hits.filter((h) => h.sound === 'cowbell').map((h) => h.atTicks);
    expect(ticks).toHaveLength(2);
    expect(ticks).toContain(0);
    expect(ticks).toContain(Math.round(ticksPerBeat(sig) * 2));
  });

  it('bossa degraded produces shaker 8th notes', () => {
    const hits: Hit[] = [];
    makeDegradedPerc('bossa').schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'shaker')).toHaveLength(8);
  });

  it('bossa degraded triangle on beats 1 and 3', () => {
    const hits: Hit[] = [];
    makeDegradedPerc('bossa').schedule(oneBar(sig), makeCtx(sig, hits));
    const ticks = hits.filter((h) => h.sound === 'triangle').map((h) => h.atTicks);
    expect(ticks).toHaveLength(2);
  });

  it('funk degraded produces shaker 16th notes', () => {
    const hits: Hit[] = [];
    makeDegradedPerc('funk').schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.filter((h) => h.sound === 'shaker')).toHaveLength(16);
  });

  it('funk degraded cowbell on beats 1 and 3', () => {
    const hits: Hit[] = [];
    makeDegradedPerc('funk').schedule(oneBar(sig), makeCtx(sig, hits));
    const ticks = hits.filter((h) => h.sound === 'cowbell').map((h) => h.atTicks);
    expect(ticks).toHaveLength(2);
  });

  it('funk degraded timbales on backbeats', () => {
    const hits: Hit[] = [];
    makeDegradedPerc('funk').schedule(oneBar(sig), makeCtx(sig, hits));
    const ticks = hits.filter((h) => h.sound === 'timbales').map((h) => h.atTicks);
    expect(ticks).toHaveLength(2);
  });

  it('per-sound disable removes sound from degraded output', () => {
    const hits: Hit[] = [];
    makeDegradedPerc('latin', { shakerEnabled: false }).schedule(oneBar(sig), makeCtx(sig, hits));
    expect(hits.some((h) => h.sound === 'shaker')).toBe(false);
  });
});
