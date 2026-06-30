import { useState, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { noteNameToMidi } from '@jazz/music-core';
import { VirtualKeyboard, type VirtualKeyState } from './VirtualKeyboard';
import { NotationStaff } from './NotationStaff';

// ---------------------------------------------------------------------------
// ChordPlayer — play chord notes via Web Audio API with visual feedback
// ---------------------------------------------------------------------------

export interface ChordPlayerProps {
  /** Note names to play, e.g. ['C4', 'E4', 'G4', 'B4']. */
  notes: string[];
  /** Human-readable label shown next to the play button. */
  label?: string;
  /** Duration of each note in seconds. Default: 1.2 */
  noteDuration?: number;
  /** Whether to play all notes simultaneously or as arpeggio. Default: 'block'. */
  mode?: 'block' | 'arpeggio';
  /** Delay between arpeggio notes in seconds. Default: 0.12 */
  arpeggioDelay?: number;
  /** Show a virtual keyboard with animated key highlighting during playback. */
  showKeyboard?: boolean;
  /** Show a notation staff with animated note highlighting during playback. */
  showStaff?: boolean;
}

// ── Audio engine (lazy singleton) ──────────────────────────────────────────

let _audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!_audioCtx) {
    _audioCtx = new AudioContext();
  }
  if (_audioCtx.state === 'suspended') {
    void _audioCtx.resume();
  }
  return _audioCtx;
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function midiToNoteName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return `${names[midi % 12]}${octave}`;
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  gain?: number,
): void {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const vol = gain ?? 0.25;

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(vol, startTime + 0.02);
  gainNode.gain.setValueAtTime(vol, startTime + duration * 0.7);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

// ── Component ──────────────────────────────────────────────────────────────

export function ChordPlayer({
  notes,
  label,
  noteDuration = 1.2,
  mode = 'block',
  arpeggioDelay = 0.12,
  showKeyboard = false,
  showStaff = false,
}: ChordPlayerProps): ReactNode {
  const [playing, setPlaying] = useState(false);
  const [activeKeys, setActiveKeys] = useState<Map<number, VirtualKeyState>>(new Map());
  const [highlightedNotes, setHighlightedNotes] = useState<number[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const midiNotes = useMemo(
    () =>
      notes
        .map((n) => {
          try { return noteNameToMidi(n); } catch { return -1; }
        })
        .filter((m) => m >= 0)
        .sort((a, b) => a - b),
    [notes],
  );

  const clearTimeouts = useCallback(() => {
    for (const t of timeoutsRef.current) clearTimeout(t);
    timeoutsRef.current = [];
  }, []);

  const play = useCallback(() => {
    if (playing || midiNotes.length === 0) return;
    clearTimeouts();
    setPlaying(true);

    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // ── Audio ──────────────────────────────────────────────────
    if (mode === 'block') {
      for (const midi of midiNotes) {
        playTone(ctx, midiToFrequency(midi), now, noteDuration);
      }
    } else {
      midiNotes.forEach((midi, i) => {
        playTone(ctx, midiToFrequency(midi), now + i * arpeggioDelay, noteDuration);
      });
    }

    // ── Visual feedback ────────────────────────────────────────
    if (showKeyboard || showStaff) {
      if (mode === 'block') {
        // All notes active at once
        const keys = new Map<number, VirtualKeyState>();
        for (const midi of midiNotes) {
          keys.set(midi, {
            note: midiToNoteName(midi),
            midiNote: midi,
            brightness: 0.85,
            highlightColor: 'blue',
            isChordTone: true,
          });
        }
        setActiveKeys(keys);
        setHighlightedNotes([...midiNotes]);

        timeoutsRef.current.push(
          setTimeout(() => {
            setActiveKeys(new Map());
            setHighlightedNotes([]);
            setPlaying(false);
          }, noteDuration * 1000),
        );
      } else {
        // Arpeggio — notes appear one by one, each staying for noteDuration
        const totalDuration =
          noteDuration + (midiNotes.length - 1) * arpeggioDelay;

        midiNotes.forEach((midi, i) => {
          const startDelay = i * arpeggioDelay * 1000;

          timeoutsRef.current.push(
            setTimeout(() => {
              setActiveKeys((prev) => {
                const next = new Map(prev);
                next.set(midi, {
                  note: midiToNoteName(midi),
                  midiNote: midi,
                  brightness: 0.85,
                  highlightColor: 'blue',
                  isChordTone: true,
                });
                return next;
              });
              setHighlightedNotes((prev) => [...prev, midi]);
            }, startDelay),
          );

          // Remove individual note after noteDuration from its start
          timeoutsRef.current.push(
            setTimeout(() => {
              setActiveKeys((prev) => {
                const next = new Map(prev);
                next.delete(midi);
                return next;
              });
            }, startDelay + noteDuration * 1000),
          );
        });

        // Clear all after total duration
        timeoutsRef.current.push(
          setTimeout(() => {
            setActiveKeys(new Map());
            setHighlightedNotes([]);
            setPlaying(false);
          }, totalDuration * 1000 + 100),
        );
      }
    } else {
      // No visual — just audio with timeout
      const totalDuration =
        mode === 'arpeggio'
          ? noteDuration + (midiNotes.length - 1) * arpeggioDelay
          : noteDuration;
      timeoutsRef.current.push(
        setTimeout(() => setPlaying(false), totalDuration * 1000 + 100),
      );
    }
  }, [
    playing,
    midiNotes,
    mode,
    noteDuration,
    arpeggioDelay,
    showKeyboard,
    showStaff,
    clearTimeouts,
  ]);

  // Build display name from notes
  const chordLabel = label ?? notes.map((n) => n.replace(/\d+/, '')).join('–');

  const showVisuals = showKeyboard || showStaff;

  return (
    <div className="space-y-2">
      <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
        <button
          type="button"
          onClick={play}
          disabled={playing || midiNotes.length === 0}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs transition-colors hover:bg-primary/90 disabled:opacity-50"
          title={playing ? 'Playing…' : 'Play chord'}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <span className="text-sm font-medium text-foreground">{chordLabel}</span>
        {mode === 'arpeggio' && (
          <span className="text-[10px] text-muted-foreground">арп.</span>
        )}
      </div>

      {showVisuals && (
        <div className="space-y-1.5">
          {showKeyboard && (
            <VirtualKeyboard
              mode="chord-highlight"
              chordNotes={midiNotes}
              activeKeys={playing ? activeKeys : undefined}
              compact
            />
          )}
          {showStaff && (
            <NotationStaff
              highlightedNotes={playing ? highlightedNotes : midiNotes}
              compact
            />
          )}
        </div>
      )}
    </div>
  );
}
