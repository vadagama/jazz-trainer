import { it, expect } from 'vitest';
import type { AudioPort } from './ports.js';

/**
 * Contract test suite for any {@link AudioPort} implementation.
 *
 * Usage in adapter tests:
 * ```ts
 * import { testAudioPortContract } from '@jazz/music-core/audio/ports.test';
 * import { MyAdapter } from './MyAdapter';
 *
 * describe('MyAdapter', () => {
 *   testAudioPortContract(() => new MyAdapter());
 * });
 * ```
 */
export function testAudioPortContract(createPort: () => AudioPort): void {
  it('starts and stops without error', () => {
    const port = createPort();
    expect(() => port.start()).not.toThrow();
    expect(() => port.stop()).not.toThrow();
  });

  it('currentTime is a number after construction', () => {
    const port = createPort();
    expect(typeof port.currentTime).toBe('number');
  });

  it('clear removes scheduled events without throwing', () => {
    const port = createPort();
    expect(() => port.clear()).not.toThrow();
  });

  it('scheduleNote accepts a valid note', () => {
    const port = createPort();
    expect(() =>
      port.scheduleNote({
        time: 0,
        note: 'C4',
        duration: 0.5,
        velocity: 0.8,
      }),
    ).not.toThrow();
  });

  it('scheduleClick accepts a subdivision', () => {
    const port = createPort();
    expect(() =>
      port.scheduleClick({
        time: 0,
        accent: true,
        subdivision: 4,
      }),
    ).not.toThrow();
  });

  it('scheduleNote with voice does not throw', () => {
    const port = createPort();
    expect(() =>
      port.scheduleNote({
        time: 1,
        note: 'Eb4',
        duration: 0.25,
        velocity: 0.6,
        voice: 'rhodes',
      }),
    ).not.toThrow();
  });

  it('consecutive start/stop cycles do not throw', () => {
    const port = createPort();
    for (let i = 0; i < 3; i++) {
      port.start();
      port.stop();
    }
  });

  it('clear after scheduling does not throw', () => {
    const port = createPort();
    port.scheduleClick({ time: 0, accent: true, subdivision: 4 });
    port.scheduleNote({ time: 0.5, note: 'G3', duration: 0.5, velocity: 0.7 });
    expect(() => port.clear()).not.toThrow();
  });
}
