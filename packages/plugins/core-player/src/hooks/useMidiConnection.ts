import { useState, useEffect, useCallback, useRef } from 'react';
import type { InputPort, MidiDeviceInfo } from '@jazz/music-core/audio';

export interface UseMidiConnectionResult {
  /** Current MIDI connection status. */
  connectionStatus: 'disconnected' | 'available' | 'connected';
  /** Info about the currently selected device, or null. */
  activeDevice: MidiDeviceInfo | null;
  /** List of available MIDI input devices. */
  availableDevices: MidiDeviceInfo[];
  /** Select a device by ID (null = all). */
  selectDevice: (deviceId: string | null) => void;
  /** True briefly after a note-on event (for UI flash). */
  indicatorFlash: boolean;
}

const FLASH_DURATION_MS = 100;

/**
 * Hook that manages MIDI connection state, device selection,
 * and provides a flash indicator for note-on events.
 *
 * @param inputPort Optional MIDI input port. If not provided,
 *   connectionStatus will be 'disconnected'.
 */
export function useMidiConnection(
  inputPort: InputPort | null | undefined,
): UseMidiConnectionResult {
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'available' | 'connected'
  >(inputPort?.connectionStatus ?? 'disconnected');
  const [activeDevice, setActiveDevice] = useState<MidiDeviceInfo | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MidiDeviceInfo[]>([]);
  const [indicatorFlash, setIndicatorFlash] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load available devices
  useEffect(() => {
    if (!inputPort) {
      setAvailableDevices([]);
      setConnectionStatus('disconnected');
      return;
    }

    let cancelled = false;

    inputPort.listInputs().then((devices) => {
      if (cancelled) return;
      setAvailableDevices(devices);
      setConnectionStatus(inputPort.connectionStatus);
    });

    // Subscribe to connection changes
    const unsubConnection = inputPort.onConnectionChange((status) => {
      setConnectionStatus(status);
      // Refresh device list on connection change
      inputPort.listInputs().then((devs) => {
        if (!cancelled) setAvailableDevices(devs);
      });
    });

    // Subscribe to note-on for flash indicator
    const unsubNoteOn = inputPort.onNoteOn(() => {
      setIndicatorFlash(true);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => {
        setIndicatorFlash(false);
      }, FLASH_DURATION_MS);
    });

    return () => {
      cancelled = true;
      unsubConnection();
      unsubNoteOn();
    };
  }, [inputPort]);

  // Cleanup flash timer on unmount
  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const selectDevice = useCallback(
    (deviceId: string | null) => {
      if (!inputPort) return;
      inputPort.selectInput(deviceId);
      // Update active device from list
      if (deviceId) {
        const device = availableDevices.find((d) => d.id === deviceId);
        setActiveDevice(device ?? null);
      } else {
        setActiveDevice(null);
      }
    },
    [inputPort, availableDevices],
  );

  return {
    connectionStatus,
    activeDevice,
    availableDevices,
    selectDevice,
    indicatorFlash,
  };
}
