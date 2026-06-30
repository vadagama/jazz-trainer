import type { InputPort, MidiInputEvent, MidiDeviceInfo } from '@jazz/music-core';

// ---------------------------------------------------------------------------
// MuxInputPort — multiplexes multiple InputPort implementations into one.
//
// Forwards noteOn/noteOff from ALL ports to subscribers.
// Device selection and channel filtering delegate to the primary port only.
// listInputs() returns only the primary port's devices (hardware MIDI).
// ---------------------------------------------------------------------------

export class MuxInputPort implements InputPort {
  private noteOnHandlers: Array<(e: MidiInputEvent) => void> = [];
  private noteOffHandlers: Array<(e: MidiInputEvent) => void> = [];
  private connectionHandlers: Array<
    (s: 'disconnected' | 'available' | 'connected') => void
  > = [];
  private cleanupFns: Array<() => void> = [];

  constructor(
    /** Primary port: device selection, channel filter, hardware MIDI listing. */
    private readonly primary: InputPort,
    /** Extra ports (e.g. ComputerKeyboardAdapter) whose notes are also forwarded. */
    private readonly extras: InputPort[] = [],
  ) {
    const all: InputPort[] = [primary, ...extras];

    for (const port of all) {
      this.cleanupFns.push(
        port.onNoteOn((e) => {
          for (const h of this.noteOnHandlers) h(e);
        }),
        port.onNoteOff((e) => {
          for (const h of this.noteOffHandlers) h(e);
        }),
        port.onConnectionChange(() => {
          const s = this.connectionStatus;
          for (const h of this.connectionHandlers) h(s);
        }),
      );
    }
  }

  // ── InputPort ─────────────────────────────────────────────────────────────

  onNoteOn(handler: (e: MidiInputEvent) => void): () => void {
    this.noteOnHandlers.push(handler);
    return () => {
      const i = this.noteOnHandlers.indexOf(handler);
      if (i !== -1) this.noteOnHandlers.splice(i, 1);
    };
  }

  onNoteOff(handler: (e: MidiInputEvent) => void): () => void {
    this.noteOffHandlers.push(handler);
    return () => {
      const i = this.noteOffHandlers.indexOf(handler);
      if (i !== -1) this.noteOffHandlers.splice(i, 1);
    };
  }

  async devices(): Promise<string[]> {
    return this.primary.devices();
  }

  /** Returns only primary (hardware MIDI) devices. Laptop keyboard is managed separately. */
  async listInputs(): Promise<MidiDeviceInfo[]> {
    return this.primary.listInputs();
  }

  selectInput(deviceId: string | null): void {
    this.primary.selectInput(deviceId);
  }

  get activeDeviceId(): string | null {
    return this.primary.activeDeviceId;
  }

  setChannelFilter(channel: number | 'all'): void {
    this.primary.setChannelFilter(channel);
  }

  get channelFilter(): number | 'all' {
    return this.primary.channelFilter;
  }

  /** Aggregate: 'connected' > 'available' > 'disconnected' across all ports. */
  get connectionStatus(): 'disconnected' | 'available' | 'connected' {
    const all: InputPort[] = [this.primary, ...this.extras];
    if (all.some((p) => p.connectionStatus === 'connected')) return 'connected';
    if (all.some((p) => p.connectionStatus === 'available')) return 'available';
    return 'disconnected';
  }

  onConnectionChange(
    handler: (s: 'disconnected' | 'available' | 'connected') => void,
  ): () => void {
    this.connectionHandlers.push(handler);
    return () => {
      const i = this.connectionHandlers.indexOf(handler);
      if (i !== -1) this.connectionHandlers.splice(i, 1);
    };
  }

  dispose(): void {
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
  }
}
