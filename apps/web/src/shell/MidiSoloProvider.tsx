import { useEffect, useRef, useState } from 'react';
import type { InputPort } from '@jazz/music-core';
import {
  noteToMidi,
  SoloInstrumentHost,
  type SoloInstrumentFactories,
} from '@jazz/music-core/audio';
import { useLocalSettingsStore, useComputerKeyboardStore } from '@jazz/plugin-sdk';
import { buildKeyMap } from '@jazz/music-core/audio';
import type { ComputerKeyboardAdapter } from './ComputerKeyboardAdapter';

// ---------------------------------------------------------------------------
// Helpers to read adapters from window globals
// ---------------------------------------------------------------------------

interface ToneAdapterLike {
  getSoloBus: () => unknown;
  setSoloVolume: (v: number) => void;
  setDucking: (enabled: boolean, depthDb?: number) => void;
  noteOnDucking: (t: number) => void;
  noteOffDucking: (t: number) => void;
  now: () => number;
}

function getInputPort(): InputPort | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as Record<string, unknown>).__midiInputPort as InputPort | null;
}

function getToneAdapter(): ToneAdapterLike | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as Record<string, unknown>)
    .__toneAudioAdapter as ToneAdapterLike | null;
}

function getSoloInstrumentFactories(): SoloInstrumentFactories | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as Record<string, unknown>)
    .__soloInstrumentFactories as SoloInstrumentFactories | null;
}

function getKeyboardAdapter(): ComputerKeyboardAdapter | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as Record<string, unknown>)
    .__computerKeyboardPort as ComputerKeyboardAdapter | null;
}

// ---------------------------------------------------------------------------
// MidiSoloProvider — global MIDI→solo wiring so MIDI keyboard sound works
// on ANY screen after setup.
// ---------------------------------------------------------------------------

/**
 * Mount this at the top of the app tree. It creates a global
 * `SoloInstrumentHost`, wires MIDI note events to it, and reactively
 * applies MIDI/solo settings from the local store.
 */
export function MidiSoloProvider({ children }: { children: React.ReactNode }) {
  const hostRef = useRef<SoloInstrumentHost | null>(null);
  const [hostReady, setHostReady] = useState(false);
  const soloToneId = useLocalSettingsStore((s) => s.settings.soloToneId);
  const soloVolume = useLocalSettingsStore((s) => s.settings.soloVolume);
  const duckingEnabled = useLocalSettingsStore((s) => s.settings.duckingEnabled);
  const midiDeviceId = useLocalSettingsStore((s) => s.settings.midiDeviceId);
  const midiChannel = useLocalSettingsStore((s) => s.settings.midiChannel);

  // ── Create / dispose SoloInstrumentHost when adapters appear/disappear ──
  useEffect(() => {
    const toneAdapter = getToneAdapter();
    const factories = getSoloInstrumentFactories();
    if (!toneAdapter || !factories) return;

    const soloBus = toneAdapter.getSoloBus();
    const host = new SoloInstrumentHost(soloBus, factories);
    hostRef.current = host;
    (window as unknown as Record<string, unknown>).__soloInstrumentHost = host;
    setHostReady(true);

    // Apply current settings
    const toneId = soloToneId ?? 'rhodes-jrhodes3c';
    try {
      host.selectTone(toneId);
    } catch {
      host.selectTone('synth-default');
    }

    toneAdapter.setSoloVolume(soloVolume ?? 0.8);
    toneAdapter.setDucking(duckingEnabled ?? false);

    return () => {
      host.dispose();
      hostRef.current = null;
      delete (window as unknown as Record<string, unknown>).__soloInstrumentHost;
      setHostReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── React to adapters appearing / disappearing (transport init / teardown) ──
  useEffect(() => {
    const poll = setInterval(() => {
      const ta = getToneAdapter();
      const f = getSoloInstrumentFactories();

      if (ta && f) {
        // Adapters available — create host if needed
        if (!hostRef.current) {
          const soloBus = ta.getSoloBus();
          const host = new SoloInstrumentHost(soloBus, f);
          hostRef.current = host;
          (window as unknown as Record<string, unknown>).__soloInstrumentHost = host;
          setHostReady(true);

          const toneId = soloToneId ?? 'rhodes-jrhodes3c';
          try {
            host.selectTone(toneId);
          } catch {
            host.selectTone('synth-default');
          }
          ta.setSoloVolume(soloVolume ?? 0.8);
          ta.setDucking(duckingEnabled ?? false);
        }
      } else if (hostRef.current) {
        // Adapters disappeared (e.g. transport torn down) — dispose host
        hostRef.current.dispose();
        hostRef.current = null;
        delete (window as unknown as Record<string, unknown>).__soloInstrumentHost;
        setHostReady(false);
      }
    }, 200);
    return () => clearInterval(poll);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wire MIDI notes → SoloInstrumentHost + ducking ──
  useEffect(() => {
    const inputPort = getInputPort();
    const host = hostRef.current;
    console.debug('[MidiSoloProvider] wiring: inputPort=', !!inputPort, 'host=', !!host);
    if (!inputPort || !host) return;

    const toneAdapter = getToneAdapter();

    const unsubNoteOn = inputPort.onNoteOn((event) => {
      let midiNote: number;
      try {
        midiNote = noteToMidi(event.note);
      } catch {
        return;
      }
      console.debug('[MidiSoloProvider] noteOn:', event.note, 'vel=', event.velocity);
      host.handleNoteOn(midiNote, event.velocity);
      if (toneAdapter) {
        toneAdapter.noteOnDucking(toneAdapter.now());
      }
    });

    const unsubNoteOff = inputPort.onNoteOff((event) => {
      let midiNote: number;
      try {
        midiNote = noteToMidi(event.note);
      } catch {
        return;
      }
      host.handleNoteOff(midiNote);
      if (toneAdapter) {
        toneAdapter.noteOffDucking(toneAdapter.now());
      }
    });

    return () => {
      unsubNoteOn();
      unsubNoteOff();
    };
  }, [hostReady]);

  // ── Apply device/channel from settings ──
  useEffect(() => {
    const inputPort = getInputPort();
    if (!inputPort) return;
    if (midiDeviceId) {
      inputPort.selectInput(midiDeviceId);
    }
    if (midiChannel !== undefined) {
      inputPort.setChannelFilter(midiChannel);
    }
  }, [midiDeviceId, midiChannel]);

  // ── Apply tone changes (settings-driven) ──
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const targetId = soloToneId ?? 'rhodes-jrhodes3c';
    if (host.currentToneId !== targetId) {
      try {
        host.selectTone(targetId);
      } catch {
        try {
          host.selectTone('synth-default');
        } catch {
          /* keep current */
        }
      }
    }
  }, [soloToneId]);

  // ── Apply volume changes ──
  useEffect(() => {
    const ta = getToneAdapter();
    if (ta) ta.setSoloVolume(soloVolume ?? 0.8);
  }, [soloVolume]);

  // ── Sync Computer Keyboard store → adapter ──
  const kbEnabled = useComputerKeyboardStore((s) => s.enabled);
  const kbOctave = useComputerKeyboardStore((s) => s.octave);

  useEffect(() => {
    const adapter = getKeyboardAdapter();
    console.debug(
      '[MidiSoloProvider] kb sync: adapter=',
      !!adapter,
      'enabled=',
      kbEnabled,
      'octave=',
      kbOctave,
    );
    if (!adapter) return;

    if (kbEnabled) {
      adapter.updateKeyMap(buildKeyMap(kbOctave));
      adapter.setEnabled(true);
    } else {
      adapter.setEnabled(false);
    }
  }, [kbEnabled, kbOctave]);

  return <>{children}</>;
}
