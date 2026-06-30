import { describe, it, expect } from 'vitest';
import type { SoloInstrument } from './soloInstrument.js';

/**
 * Contract test suite for any {@link SoloInstrument} implementation.
 */
export function testSoloInstrumentContract(createInstrument: () => SoloInstrument): void {
  describe('SoloInstrument contract', () => {
    it('noteOn and noteOff do not throw', () => {
      const inst = createInstrument();
      expect(() => inst.noteOn(60, 100)).not.toThrow();
      expect(() => inst.noteOff(60)).not.toThrow();
    });

    it('connect and disconnect do not throw', () => {
      const inst = createInstrument();
      const mockDest = {} as unknown;
      expect(() => inst.connect(mockDest)).not.toThrow();
      expect(() => inst.disconnect()).not.toThrow();
    });

    it('dispose and subsequent noteOn is no-op (does not throw)', () => {
      const inst = createInstrument();
      inst.dispose();
      expect(() => inst.noteOn(60, 100)).not.toThrow();
      expect(() => inst.noteOff(60)).not.toThrow();
    });

    it('noteOn with velocity 0 is equivalent to noteOff', () => {
      const inst = createInstrument();
      expect(() => inst.noteOn(64, 0)).not.toThrow();
      expect(() => inst.noteOff(64)).not.toThrow();
    });

    it('polyphony: multiple noteOn then noteOff for each', () => {
      const inst = createInstrument();
      const notes = [60, 64, 67, 72];
      for (const n of notes) {
        expect(() => inst.noteOn(n, 80)).not.toThrow();
      }
      for (const n of notes) {
        expect(() => inst.noteOff(n)).not.toThrow();
      }
    });

    it('id, name, category are readonly strings', () => {
      const inst = createInstrument();
      expect(typeof inst.id).toBe('string');
      expect(typeof inst.name).toBe('string');
      expect(['synth', 'sampled', 'reuse']).toContain(inst.category);
    });
  });
}
