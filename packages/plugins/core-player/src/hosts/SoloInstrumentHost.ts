import type {
  SoloInstrument,
  SoloInstrumentManifest,
  SoloInstrumentFactories,
} from '@jazz/music-core/audio';
import { SOLO_INSTRUMENT_MANIFESTS } from '@jazz/music-core/audio';

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

  /** Currently selected manifest ID, or null if none. */
  private activeManifestId: string | null = null;

  constructor(soloBus: unknown, factories: SoloInstrumentFactories) {
    this.soloBus = soloBus;
    this.factories = factories;
  }

  /** List of all available tone manifests. */
  get availableTones(): SoloInstrumentManifest[] {
    return SOLO_INSTRUMENT_MANIFESTS;
  }

  /** ID of the currently active timbre, or null. */
  get currentToneId(): string | null {
    return this.activeManifestId;
  }

  /**
   * Select a timbre by manifest ID.
   * Disposes the current instrument and creates (or reuses from cache) the new one.
   */
  selectTone(manifestId: string): SoloInstrument {
    if (this.activeManifestId === manifestId && this.currentInstrument) {
      return this.currentInstrument;
    }

    // Dispose current
    if (this.currentInstrument) {
      this.currentInstrument.disconnect();
      // Don't dispose from cache — we may reuse it
    }

    // Check cache first
    const cached = this.instrumentCache.get(manifestId);
    if (cached) {
      this.currentInstrument = cached;
      this.currentInstrument.connect(this.soloBus);
      this.activeManifestId = manifestId;
      return cached;
    }

    // Create new via manifest
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

  /** Handle a MIDI note-on event. Delegates to the active instrument. */
  handleNoteOn(midiNote: number, velocity: number, time?: number): void {
    this.currentInstrument?.noteOn(midiNote, velocity, time);
  }

  /** Handle a MIDI note-off event. Delegates to the active instrument. */
  handleNoteOff(midiNote: number, time?: number): void {
    this.currentInstrument?.noteOff(midiNote, time);
  }

  /** Release all resources. */
  dispose(): void {
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
