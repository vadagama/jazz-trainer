import { useState, useEffect, useCallback, useRef } from 'react';
import type { InputPort, MidiDeviceInfo } from '@jazz/music-core';

export interface UseMidiConnectionResult {
  connectionStatus: 'disconnected' | 'available' | 'connected';
  activeDevice: MidiDeviceInfo | null;
  availableDevices: MidiDeviceInfo[];
  selectDevice: (deviceId: string | null) => void;
  indicatorFlash: boolean;
}

const FLASH_DURATION_MS = 100;

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

    const unsubConnection = inputPort.onConnectionChange((status) => {
      setConnectionStatus(status);
      inputPort.listInputs().then((devs) => {
        if (!cancelled) setAvailableDevices(devs);
      });
    });

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

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const selectDevice = useCallback(
    (deviceId: string | null) => {
      if (!inputPort) return;
      inputPort.selectInput(deviceId);
      if (deviceId) {
        const device = availableDevices.find((d) => d.id === deviceId);
        setActiveDevice(device ?? null);
      } else {
        setActiveDevice(null);
      }
    },
    [inputPort, availableDevices],
  );

  return { connectionStatus, activeDevice, availableDevices, selectDevice, indicatorFlash };
}
