import { useState, useEffect, useCallback } from 'react';
import { MidiDeviceSelector, MidiIndicator } from '@jazz/ui';
import type { InputPort, MidiDeviceInfo } from '@jazz/music-core';

function getInputPort(): InputPort | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as Record<string, unknown>).__midiInputPort as InputPort | null;
}

function isMidiInitialized(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as Record<string, unknown>).__midiInitialized;
}

async function triggerMidiInit(): Promise<void> {
  const fn = (window as unknown as Record<string, () => Promise<void>>).__midiInitMidi;
  if (fn) await fn();
}

export interface LiveMidiControlsProps {
  midiDeviceId?: string | undefined;
  onDeviceChange: (deviceId: string | undefined) => void;
}

/**
 * Live MIDI controls for Settings:
 * - "Enable MIDI" button (if not initialized)
 * - MIDI connection indicator with flash
 * - Device selector populated from actual Web MIDI API
 */
export function LiveMidiControls({ midiDeviceId, onDeviceChange }: LiveMidiControlsProps) {
  const [initAttempted, setInitAttempted] = useState(isMidiInitialized);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'available' | 'connected'
  >('disconnected');
  const [indicatorFlash, setIndicatorFlash] = useState(false);
  const [devices, setDevices] = useState<MidiDeviceInfo[]>([]);

  useEffect(() => {
    const port = getInputPort();
    if (!port) return;

    let cancelled = false;

    port.listInputs().then((d) => {
      if (!cancelled) {
        setDevices(d);
        setConnectionStatus(port.connectionStatus);
      }
    });

    const unsubConn = port.onConnectionChange((status) => {
      setConnectionStatus(status);
      port.listInputs().then((d) => {
        if (!cancelled) setDevices(d);
      });
    });

    let flashTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubNoteOn = port.onNoteOn(() => {
      setIndicatorFlash(true);
      if (flashTimer) clearTimeout(flashTimer);
      flashTimer = setTimeout(() => setIndicatorFlash(false), 100);
    });

    return () => {
      cancelled = true;
      unsubConn();
      unsubNoteOn();
      if (flashTimer) clearTimeout(flashTimer);
    };
  }, []);

  const handleEnableMidi = useCallback(async () => {
    setConnecting(true);
    try {
      await triggerMidiInit();
    } catch {
      /* handled internally */
    } finally {
      setInitAttempted(true);
      setConnecting(false);
    }
  }, []);

  const handleSelectDevice = useCallback(
    (deviceId: string | null) => {
      const port = getInputPort();
      if (port) port.selectInput(deviceId);
      onDeviceChange(deviceId ?? undefined);
    },
    [onDeviceChange],
  );

  return (
    <div className="space-y-3">
      {!initAttempted && (
        <button
          type="button"
          onClick={handleEnableMidi}
          disabled={connecting}
          className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {connecting ? 'Подключение…' : '🎹 Включить MIDI'}
        </button>
      )}

      <MidiIndicator
        status={connectionStatus}
        flash={indicatorFlash}
        midiInitAttempted={initAttempted}
      />

      {initAttempted && devices.length > 0 && (
        <MidiDeviceSelector
          devices={devices}
          selectedDeviceId={midiDeviceId ?? null}
          onSelectDevice={handleSelectDevice}
        />
      )}
      {initAttempted && devices.length === 0 && (
        <p className="text-xs text-muted-foreground">MIDI-устройства не обнаружены.</p>
      )}
    </div>
  );
}
