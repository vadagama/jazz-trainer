import type { SoloInstrument } from './soloInstrument.js';
import type { SoloInstrumentManifest, SoloInstrumentFactories } from './soloInstrumentManifest.js';
import { SOLO_INSTRUMENT_MANIFESTS } from './soloInstrumentRegistry.js';

/**
 * Manages the lifecycle of solo instruments:
 * - Creates/disposes instruments via manifests
 * - Routes MIDI events to the active instrument
 * - Caches loaded instruments for reuse
 */
export class SoloInstrumentHost {
  private factories: SoloInstrumentFactories;
  private soloBus: unknown;

  private currentInstrument: SoloInstrument | null = null;
  private instrumentCache = new Map<string, SoloInstrument>();

  private activeManifestId: string | null = null;
  private disposed = false;

  /** Current solo volume (0–1), reserved for future per-instrument volume control. */
  private soloVolume = 1.0;

  constructor(soloBus: unknown, factories: SoloInstrumentFactories) {
    this.soloBus = soloBus;
    this.factories = factories;
  }

  get availableTones(): SoloInstrumentManifest[] {
    return SOLO_INSTRUMENT_MANIFESTS;
  }

  get currentToneId(): string | null {
    return this.activeManifestId;
  }

  /** Update the solo volume (0–1). */
  setVolume(volume: number): void {
    this.soloVolume = Math.max(0, Math.min(1, volume));
  }

  selectTone(manifestId: string): SoloInstrument {
    if (this.activeManifestId === manifestId && this.currentInstrument) {
      return this.currentInstrument;
    }

    if (this.currentInstrument) {
      this.currentInstrument.disconnect();
    }

    const cached = this.instrumentCache.get(manifestId);
    if (cached) {
      this.currentInstrument = cached;
      this.currentInstrument.connect(this.soloBus);
      this.activeManifestId = manifestId;
      return cached;
    }

    const manifest = SOLO_INSTRUMENT_MANIFESTS.find((m) => m.id === manifestId);
    if (!manifest) {
      throw new Error(`Solo instrument manifest not found: ${manifestId}`);
    }

    const instrument = manifest.createInstrument(this.factories);
    instrument.connect(this.soloBus);

    this.instrumentCache.set(manifestId, instrument);
    this.currentInstrument = instrument;
    this.activeManifestId = manifestId;

    return instrument;
  }

  handleNoteOn(midiNote: number, velocity: number, time?: number): void {
    if (this.disposed) return;
    this.currentInstrument?.noteOn(midiNote, velocity, time);
  }

  handleNoteOff(midiNote: number, time?: number): void {
    if (this.disposed) return;
    this.currentInstrument?.noteOff(midiNote, time);
  }

  dispose(): void {
    this.disposed = true;
    if (this.currentInstrument) {
      this.currentInstrument.disconnect();
      this.currentInstrument = null;
    }
    for (const inst of this.instrumentCache.values()) {
      inst.dispose();
    }
    this.instrumentCache.clear();
    this.activeManifestId = null;
  }
}
