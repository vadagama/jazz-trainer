import { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { type InputPort, noteNameToMidi } from '@jazz/music-core';

export interface KeyState {
  note: string;
  midiNote: number;
  isBlack: boolean;
  brightness: number;
  highlightColor?: 'blue' | 'green' | 'yellow' | 'red';
  isScaleTone?: boolean;
  isChordTone?: boolean;
}

export type KeyboardMode = 'free' | 'scale-highlight' | 'chord-highlight';

export interface RecentNote {
  note: string;
  velocity: number;
  timestamp: number;
}

export interface UseMidiVisualizerOptions {
  mode?: KeyboardMode;
  scaleNotes?: number[];
  chordNotes?: number[];
  octaveRange?: [number, number];
}

export interface UseMidiVisualizerResult {
  activeKeys: Map<number, KeyState>;
  recentNotes: RecentNote[];
  connectionStatus: 'disconnected' | 'available' | 'connected';
  indicatorFlash: boolean;
}

const FLASH_DURATION_MS = 100;
const MAX_RECENT_NOTES = 10;
const NOTE_OFF_BRIGHTNESS_DECAY_MS = 150;

// Stable empty array to avoid triggering re-subscriptions when callers
// pass no scaleNotes/chordNotes (would otherwise be a new [] literal each render).
const EMPTY_ARRAY: number[] = [];

function midiToNoteName(midiNote: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  return `${names[midiNote % 12]!}${octave}`;
}

function isBlackKey(midiNote: number): boolean {
  return [1, 3, 6, 8, 10].includes(midiNote % 12);
}

export function useMidiVisualizer(
  inputPort: InputPort | null | undefined,
  options: UseMidiVisualizerOptions = {},
): UseMidiVisualizerResult {
  const { mode = 'free', scaleNotes = EMPTY_ARRAY, chordNotes = EMPTY_ARRAY } = options;

  const [activeKeys, setActiveKeys] = useState<Map<number, KeyState>>(new Map());
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'available' | 'connected'
  >(inputPort?.connectionStatus ?? 'disconnected');
  const [indicatorFlash, setIndicatorFlash] = useState(false);

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const decayTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // Refs to hold the latest mode/notes without causing re-subscription on every render.
  const modeRef = useRef(mode);
  const scaleNotesRef = useRef(scaleNotes);
  const chordNotesRef = useRef(chordNotes);

  // Intentionally no deps: runs after every render to keep refs current.
  // This lets the subscription closure always read up-to-date values
  // without being torn down and re-created on each re-render.
  useEffect(() => {
    modeRef.current = mode;
    scaleNotesRef.current = scaleNotes;
    chordNotesRef.current = chordNotes;
  });

  // Stable callback: reads from refs so its identity never changes.
  const getHighlightColor = useCallback((midiNote: number): KeyState['highlightColor'] => {
    if (modeRef.current === 'chord-highlight' && chordNotesRef.current.includes(midiNote))
      return 'green';
    if (modeRef.current === 'scale-highlight' && scaleNotesRef.current.includes(midiNote))
      return 'blue';
    return undefined;
  }, []);

  useEffect(() => {
    if (!inputPort) {
      setConnectionStatus('disconnected');
      return;
    }

    let cancelled = false;
    setConnectionStatus(inputPort.connectionStatus);

    const unsubConnection = inputPort.onConnectionChange((status) => {
      if (!cancelled) setConnectionStatus(status);
    });

    const unsubNoteOn = inputPort.onNoteOn((event) => {
      if (cancelled) return;

      const midiNote = noteNameToMidi(event.note);
      const brightness = Math.max(0.05, event.velocity / 127);

      const existingDecay = decayTimersRef.current.get(midiNote);
      if (existingDecay) clearTimeout(existingDecay);

      setIndicatorFlash(true);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => {
        setIndicatorFlash(false);
      }, FLASH_DURATION_MS);

      setRecentNotes((prev) => {
        const next: RecentNote[] = [
          { note: midiToNoteName(midiNote), velocity: event.velocity, timestamp: event.timestamp },
          ...prev,
        ];
        return next.slice(0, MAX_RECENT_NOTES);
      });

      flushSync(() => {
        setActiveKeys((prev) => {
          const next = new Map(prev);
          next.set(midiNote, {
            note: midiToNoteName(midiNote),
            midiNote,
            isBlack: isBlackKey(midiNote),
            brightness,
            highlightColor: getHighlightColor(midiNote),
            isScaleTone: scaleNotesRef.current.includes(midiNote),
            isChordTone: chordNotesRef.current.includes(midiNote),
          });
          return next;
        });
      });
    });

    const unsubNoteOff = inputPort.onNoteOff((event) => {
      if (cancelled) return;

      const midiNote = noteNameToMidi(event.note);

      const decayTimer = setTimeout(() => {
        decayTimersRef.current.delete(midiNote);
        setActiveKeys((prev) => {
          const next = new Map(prev);
          const existing = next.get(midiNote);
          if (existing) {
            next.set(midiNote, { ...existing, brightness: 0 });
            setTimeout(() => {
              setActiveKeys((prev2) => {
                const next2 = new Map(prev2);
                const still = next2.get(midiNote);
                if (still && still.brightness === 0) next2.delete(midiNote);
                return next2;
              });
            }, NOTE_OFF_BRIGHTNESS_DECAY_MS);
          }
          return next;
        });
      }, 30);

      decayTimersRef.current.set(midiNote, decayTimer);
    });

    return () => {
      cancelled = true;
      unsubConnection();
      unsubNoteOn();
      unsubNoteOff();
      // Do NOT clear decayTimersRef here — clearing in-flight 30ms note-off
      // decay timers on re-subscription is the root cause of the "stuck keys" bug.
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [inputPort, getHighlightColor]);

  // Unmount-only cleanup: clear all remaining timers.
  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      decayTimersRef.current.forEach((t) => clearTimeout(t));
      decayTimersRef.current.clear();
    };
  }, []);

  return { activeKeys, recentNotes, connectionStatus, indicatorFlash };
}
