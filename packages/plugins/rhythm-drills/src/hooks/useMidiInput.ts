import { useEffect, useRef, useCallback } from 'react';
import type { InputPort, MidiInputEvent } from '@jazz/music-core/audio';

/**
 * Subscribe to MIDI note-on events via an {@link InputPort}.
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
 * Collect MIDI note-on events into a buffer with flush support.
 */
export function useMidiEventBuffer(
  inputPort: InputPort | null | undefined,
  maxEvents = 200,
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

  return { flush, count: eventsRef.current.length };
}
