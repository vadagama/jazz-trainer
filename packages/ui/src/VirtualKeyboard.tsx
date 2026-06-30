import { type ReactNode, useMemo, useState, useCallback } from 'react';
import { getKeyboardKeys } from '@jazz/music-core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type KeyboardMode = 'free' | 'scale-highlight' | 'chord-highlight';

export interface VirtualKeyState {
  note: string;
  midiNote: number;
  /** 0–1: brightness proportional to velocity. */
  brightness: number;
  highlightColor?: 'blue' | 'green' | 'yellow' | 'red';
  isScaleTone?: boolean;
  isChordTone?: boolean;
}

export interface VirtualKeyboardProps {
  /** Octave range [low, high] inclusive. Default: [3, 5]. */
  octaveRange?: [number, number];
  mode?: KeyboardMode;
  /** Show note names on keys. Default: true. */
  showLabels?: boolean;
  /** Compact mode (smaller keys). Default: false. */
  compact?: boolean;
  activeKeys?: Map<number, VirtualKeyState>;
  scaleNotes?: number[];
  chordNotes?: number[];
  /** Called on pointer-down on a key (note on). */
  onKeyClick?: (midiNote: number) => void;
  /** Called on pointer-up / cancel on a key (note off). */
  onKeyRelease?: (midiNote: number) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Color palette — realistic piano
// ---------------------------------------------------------------------------

const KB_BG = '#1e1e1e';

const WK_FILL = '#efefef';
const WK_STROKE = '#aaaaaa';
const WK_PRESSED = '#b8cce0';
const WK_DIM = '#d0d0d0';
const WK_CHORD = '#ddeeff';

const BK_BODY = '#121212';
const BK_HEAD = '#3e3e3e';
const BK_TOP = '#282828';
const BK_PRESSED_BODY = '#1e3248';
const BK_PRESSED_HEAD = '#2e4a60';
const BK_DIM = '#252525';
const BK_CHORD_BODY = '#1e2e48';
const BK_CHORD_HEAD = '#2e3e5a';

// ---------------------------------------------------------------------------
// Geometry constants
// ---------------------------------------------------------------------------

const BK_TOP_FRAC = 0.04; // top-strip fraction of black key height
const BK_HEAD_FRAC = 0.22; // head (front cap) fraction of black key height
const GAP_PX = 1; // pixel gap on each side of a white key
const TRAVEL_PX = 4; // white key press travel (px)
const BK_TRAVEL_PX = 2; // black key press travel — shorter than white key

// ---------------------------------------------------------------------------
// Note label data
// ---------------------------------------------------------------------------

const WHITE_NAMES: Record<number, string> = {
  0: 'C',
  2: 'D',
  4: 'E',
  5: 'F',
  7: 'G',
  9: 'A',
  11: 'B',
};

const BLACK_NAMES: Record<number, [string, string]> = {
  1: ['C#', 'D♭'],
  3: ['D#', 'E♭'],
  6: ['F#', 'G♭'],
  8: ['G#', 'A♭'],
  10: ['A#', 'B♭'],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VirtualKeyboard({
  octaveRange = [3, 5],
  mode = 'free',
  showLabels = true,
  compact = false,
  activeKeys,
  scaleNotes,
  chordNotes,
  onKeyClick,
  onKeyRelease,
  className,
}: VirtualKeyboardProps): ReactNode {
  const [localPressed, setLocalPressed] = useState<Set<number>>(new Set());

  const keyLayout = useMemo(
    () => getKeyboardKeys({ octaveRange, compact }),
    [octaveRange, compact],
  );
  const whiteKeys = useMemo(() => keyLayout.filter((k) => !k.isBlack), [keyLayout]);
  const blackKeys = useMemo(() => keyLayout.filter((k) => k.isBlack), [keyLayout]);

  // SVG pixel dimensions
  const WHITE_W = compact ? 30 : 42;
  const svgW = whiteKeys.length * WHITE_W;
  const svgH = compact ? 115 : 170;

  const scaleSet = useMemo(() => new Set(scaleNotes ?? []), [scaleNotes]);
  const chordSet = useMemo(() => new Set(chordNotes ?? []), [chordNotes]);

  const onPtrDown = useCallback(
    (midiNote: number) => {
      setLocalPressed((prev) => new Set(prev).add(midiNote));
      onKeyClick?.(midiNote);
    },
    [onKeyClick],
  );

  const onPtrUp = useCallback(
    (midiNote: number) => {
      setLocalPressed((prev) => {
        const s = new Set(prev);
        s.delete(midiNote);
        return s;
      });
      onKeyRelease?.(midiNote);
    },
    [onKeyRelease],
  );

  if (whiteKeys.length === 0) return null;

  const wkFontSize = compact ? 9 : 12;
  const bkFontSize = compact ? 7 : 10;

  return (
    <div className={className} style={{ overflow: 'hidden' }}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        overflow="hidden"
        style={{ display: 'block', height: svgH, userSelect: 'none' }}
      >
        {/* Background */}
        <rect x={0} y={0} width={svgW} height={svgH} fill={KB_BG} />

        {/* ── White keys ─────────────────────────────────────────────────── */}
        {whiteKeys.map((key) => {
          const xPx = key.x * svgW;
          const wPx = key.width * svgW;

          const midiActive = activeKeys?.get(key.midiNote);
          const isMidiOn = !!(midiActive && midiActive.brightness > 0);
          const isLocal = localPressed.has(key.midiNote);
          const pressed = isMidiOn || isLocal;

          const isChordTone = chordSet.has(key.midiNote);
          const isScaleTone = scaleSet.has(key.midiNote);
          const dimmed =
            (mode === 'scale-highlight' && !isScaleTone) ||
            (mode === 'chord-highlight' && !isChordTone && !!chordNotes?.length);

          let fill = WK_FILL;
          if (pressed) {
            fill = WK_PRESSED;
          } else if (mode === 'chord-highlight' && isChordTone) {
            fill = WK_CHORD;
          } else if (dimmed) {
            fill = WK_DIM;
          }

          const dy = pressed ? TRAVEL_PX : 0;
          const label = WHITE_NAMES[key.midiNote % 12];

          return (
            <g
              key={key.midiNote}
              data-midi-note={key.midiNote}
              transform={`translate(0,${dy})`}
              style={{ cursor: 'pointer' }}
              onPointerDown={(e) => {
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  /* jsdom */
                }
                onPtrDown(key.midiNote);
              }}
              onPointerUp={(e) => {
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {
                  /* jsdom */
                }
                onPtrUp(key.midiNote);
              }}
              onPointerCancel={(e) => {
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {
                  /* jsdom */
                }
                onPtrUp(key.midiNote);
              }}
            >
              <rect
                x={xPx + GAP_PX}
                y={0}
                width={wPx - GAP_PX * 2}
                height={svgH}
                fill={fill}
                stroke={WK_STROKE}
                strokeWidth={0.5}
                rx={compact ? 2 : 3}
              />
              {showLabels && label && (
                <text
                  x={xPx + wPx / 2}
                  y={svgH - 7}
                  textAnchor="middle"
                  fontSize={wkFontSize}
                  fill={dimmed ? '#999' : '#555'}
                  fontFamily="system-ui,sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Black keys ─────────────────────────────────────────────────── */}
        {blackKeys.map((key) => {
          const xPx = key.x * svgW;
          const wPx = key.width * svgW;
          const hPx = key.height * svgH;

          const topH = hPx * BK_TOP_FRAC;
          const headH = hPx * BK_HEAD_FRAC;
          const bodyH = hPx - topH - headH;

          const midiActive = activeKeys?.get(key.midiNote);
          const isMidiOn = !!(midiActive && midiActive.brightness > 0);
          const isLocal = localPressed.has(key.midiNote);
          const pressed = isMidiOn || isLocal;

          const isChordTone = chordSet.has(key.midiNote);
          const isScaleTone = scaleSet.has(key.midiNote);
          const dimmed =
            (mode === 'scale-highlight' && !isScaleTone) ||
            (mode === 'chord-highlight' && !isChordTone && !!chordNotes?.length);

          let bodyFill = dimmed ? BK_DIM : BK_BODY;
          let headFill = dimmed ? BK_DIM : BK_HEAD;

          if (pressed) {
            bodyFill = BK_PRESSED_BODY;
            headFill = BK_PRESSED_HEAD;
          } else if (mode === 'chord-highlight' && isChordTone) {
            bodyFill = BK_CHORD_BODY;
            headFill = BK_CHORD_HEAD;
          }

          // Smaller travel for black keys; no group-level translate to avoid
          // revealing the white key above (gap fix). Instead we shift the body
          // and head down manually and extend the top strip to cover the gap.
          const dy = pressed ? BK_TRAVEL_PX : 0;
          const names = BLACK_NAMES[key.midiNote % 12];

          return (
            <g
              key={key.midiNote}
              data-midi-note={key.midiNote}
              style={{ cursor: 'pointer' }}
              onPointerDown={(e) => {
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  /* jsdom */
                }
                onPtrDown(key.midiNote);
              }}
              onPointerUp={(e) => {
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {
                  /* jsdom */
                }
                onPtrUp(key.midiNote);
              }}
              onPointerCancel={(e) => {
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {
                  /* jsdom */
                }
                onPtrUp(key.midiNote);
              }}
            >
              {/* Rear ledge — extends by dy to cover the gap that would appear above */}
              <rect x={xPx} y={0} width={wPx} height={topH + dy} fill={BK_TOP} rx={2} />
              {/* Main body — shifted down by dy */}
              <rect x={xPx} y={topH + dy} width={wPx} height={bodyH} fill={bodyFill} />
              {/* Front cap — shifted down by dy */}
              <rect
                x={xPx}
                y={topH + dy + bodyH}
                width={wPx}
                height={headH}
                fill={headFill}
                rx={1}
              />
              {/* Labels (non-compact only) — shifted down by dy */}
              {showLabels && names && !compact && (
                <>
                  <text
                    x={xPx + wPx / 2}
                    y={topH + dy + bodyH * 0.3}
                    textAnchor="middle"
                    fontSize={bkFontSize}
                    fill="#cccccc"
                    fontFamily="system-ui,sans-serif"
                    style={{ pointerEvents: 'none' }}
                  >
                    {names[0]}
                  </text>
                  <text
                    x={xPx + wPx / 2}
                    y={topH + dy + bodyH * 0.52}
                    textAnchor="middle"
                    fontSize={bkFontSize - 1}
                    fill="#888888"
                    fontFamily="system-ui,sans-serif"
                    style={{ pointerEvents: 'none' }}
                  >
                    {names[1]}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Frame border */}
        <rect
          x={0.5}
          y={0.5}
          width={svgW - 1}
          height={svgH - 1}
          fill="none"
          stroke="#555555"
          strokeWidth={1}
          rx={3}
          style={{ pointerEvents: 'none' }}
        />
      </svg>
    </div>
  );
}
