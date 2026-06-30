import { describe, it, expect, beforeEach } from 'vitest';
import { DuckingCompressor } from './duckingCompressor.js';

describe('DuckingCompressor', () => {
  let comp: DuckingCompressor;

  beforeEach(() => {
    comp = new DuckingCompressor();
  });

  describe('default state', () => {
    it('returns gain 1 when no activity', () => {
      expect(comp.getDuckingGain(0)).toBe(1);
    });

    it('returns gain 1 after reset', () => {
      comp.noteOn(10);
      comp.reset();
      expect(comp.getDuckingGain(20)).toBe(1);
    });
  });

  describe('attack phase', () => {
    it('ramps from 1 to depthLinear during attack time', () => {
      comp.noteOn(0);

      // At t=0 (immediately), should be 1
      expect(comp.getDuckingGain(0)).toBe(1);

      // At t=attackTime/2, should be halfway
      const midGain = comp.getDuckingGain(0.01); // attack=0.02 by default
      expect(midGain).toBeLessThan(1);
      expect(midGain).toBeGreaterThan(0.5);
    });

    it('reaches depthLinear after full attack time', () => {
      comp.noteOn(0);

      const gain = comp.getDuckingGain(0.02); // default attack = 0.02
      const expected = Math.pow(10, -6 / 20); // default depth -6 dB
      expect(gain).toBeCloseTo(expected, 4);
    });
  });

  describe('release phase', () => {
    it('returns to gain 1 after release time with no active notes', () => {
      comp.noteOn(0);
      // Wait past attack time
      comp.getDuckingGain(0.1);
      // Now release
      comp.noteOff(1);

      const midGain = comp.getDuckingGain(1.15); // 0.15s after release
      expect(midGain).toBeLessThan(1);
      expect(midGain).toBeGreaterThan(0.5);

      // After full release (0.3s default)
      const finalGain = comp.getDuckingGain(1.31);
      expect(finalGain).toBe(1);
    });

    it('stays ducked while notes are held', () => {
      comp.noteOn(0);
      comp.getDuckingGain(0.1); // past attack

      comp.noteOn(0.5); // second note starts
      comp.noteOff(0.6); // first note ends — but one still active

      const gain = comp.getDuckingGain(0.7);
      const expected = Math.pow(10, -6 / 20);
      expect(gain).toBeCloseTo(expected, 4);
    });

    it('releases only after all notes are off', () => {
      comp.noteOn(0);
      comp.noteOn(0.2);
      comp.getDuckingGain(0.3); // past attack

      comp.noteOff(0.5); // one note off, one still on
      expect(comp.getDuckingGain(0.6)).toBeCloseTo(Math.pow(10, -6 / 20), 4);

      comp.noteOff(1); // last note off
      // Should start releasing
      const midGain = comp.getDuckingGain(1.1);
      expect(midGain).toBeLessThan(1);
    });
  });

  describe('custom options', () => {
    it('respects custom depthDb', () => {
      const deepComp = new DuckingCompressor({ depthDb: -12 });
      deepComp.noteOn(0);

      const gain = deepComp.getDuckingGain(0.1);
      const expected = Math.pow(10, -12 / 20); // ~0.25
      expect(gain).toBeCloseTo(expected, 4);
    });

    it('respects custom attack and release times', () => {
      const fastComp = new DuckingCompressor({
        attackTime: 0.01,
        releaseTime: 0.1,
      });

      fastComp.noteOn(0);
      // After 0.01s attack, should be fully ducked
      expect(fastComp.getDuckingGain(0.02)).toBeCloseTo(Math.pow(10, -6 / 20), 4);

      fastComp.noteOff(0.5);
      // After 0.1s release, should be back to 1
      expect(fastComp.getDuckingGain(0.61)).toBe(1);
    });
  });
});
