import { useEffect, useRef, useCallback } from 'react';
import type { InputPort, MidiInputEvent } from '@jazz/music-core/audio';

/**
 * Hook that subscribes to MIDI note-on events via an {@link InputPort}.
 *
 * @param inputPort - The MIDI input port instance.
 * @param onNoteOn - Callback invoked on each note-on event.
 * @param enabled  - Whether listening is active (default: true).
 */
export function useMidiInput(
  inputPort: InputPort | null | undefined,
  onNoteOn: (event: MidiInputEvent) => void,
  enabled = true,
): void {
  const onNoteOnRef = useRef(onNoteOn);
  onNoteOnRef.current = onNoteOn;

  useEffect(() => {
    if (!inputPort || !enabled) return;

    const unsub = inputPort.onNoteOn((event) => {
      onNoteOnRef.current(event);
    });

    return unsub;
  }, [inputPort, enabled]);
}

/**
 * Collect MIDI note-on events into a buffer.
 *
 * Returns the accumulated events and a callback to flush/clear them.
 */
export function useMidiEventBuffer(
  inputPort: InputPort | null | undefined,
  maxEvents = 100,
) {
  const eventsRef = useRef<MidiInputEvent[]>([]);

  useMidiInput(
    inputPort,
    useCallback((event: MidiInputEvent) => {
      const buf = eventsRef.current;
      if (buf.length < maxEvents) {
        buf.push(event);
      }
    }, [maxEvents]),
  );

  const flush = useCallback((): MidiInputEvent[] => {
    const buf = eventsRef.current;
    eventsRef.current = [];
    return buf;
  }, []);

  const latest = useCallback((): MidiInputEvent | null => {
    const buf = eventsRef.current;
    return buf.length > 0 ? buf[buf.length - 1]! : null;
  }, []);

  return { flush, latest, count: eventsRef.current.length };
}
