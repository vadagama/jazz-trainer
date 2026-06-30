import { type ReactNode, useMemo } from 'react';

// ---------------------------------------------------------------------------
// NotationStaff — SVG musical staff with note highlighting
// ---------------------------------------------------------------------------

export interface NotationStaffProps {
  /** MIDI notes to highlight on the staff (expected notes). */
  highlightedNotes?: number[];
  /** MIDI notes to show as selected/played by the user. */
  selectedNotes?: number[];
  /** Show the notes as note heads (filled ellipses) on the staff. */
  showNotes?: boolean;
  /** Compact mode for smaller display. */
  compact?: boolean;
  /** Called when a note head is clicked. */
  onNoteClick?: (midiNote: number) => void;
  /** Optional className for the container. */
  className?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

/** MIDI note that sits on the bottom line of the treble clef staff. */
const TREBLE_BOTTOM_LINE_MIDI = 64; // E4
/** MIDI note that sits on the bottom line of the bass clef staff. */
const BASS_BOTTOM_LINE_MIDI = 43; // G2

/** Split point: notes >= this go to treble clef, below go to bass clef. */
const GRAND_SPLIT = 60; // C4

const HIGHLIGHT_COLOR = '#3b82f6'; // blue
const SELECTED_COLOR = '#22c55e'; // green
const NOTE_COLOR = '#1a1a1a';
const LINE_COLOR = '#999';
const LEDGER_COLOR = '#aaa';

// ── Helpers ────────────────────────────────────────────────────────────────

interface StaffNote {
  midi: number;
  /** Staff: 'treble' or 'bass'. */
  staff: 'treble' | 'bass';
  /** Position in half-spaces: 0 = bottom line, 1 = first space, 2 = middle line, … */
  position: number;
  /** Whether the note needs an accidental (# or b). Derived from MIDI note name. */
  accidental: '#' | 'b' | null;
}

function midiToStaffNote(midi: number): StaffNote {
  const noteName = midiToNoteName(midi);
  const accidental = noteName.includes('#') ? '#' as const : noteName.includes('b') ? 'b' as const : null;

  if (midi >= GRAND_SPLIT) {
    // Treble clef: E4 (64) = bottom line → position 0
    const position = (midi - TREBLE_BOTTOM_LINE_MIDI) / 2;
    return { midi, staff: 'treble', position, accidental };
  }
  // Bass clef: G2 (43) = bottom line → position 0
  const position = (midi - BASS_BOTTOM_LINE_MIDI) / 2;
  return { midi, staff: 'bass', position, accidental };
}

function midiToNoteName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const name = names[midi % 12]!;
  return `${name}${octave}`;
}

// ── SVG drawing helpers ────────────────────────────────────────────────────

/** Treble clef SVG path (simplified). */
const TREBLE_CLEF_PATH =
  'M8 42 Q8 38 12 34 Q16 30 16 26 Q16 22 12 18 Q8 14 8 10 Q8 6 12 4 Q16 2 18 4 Q20 6 19 10 L17 19 Q16 23 15 27 Q14 31 13 35 L11 44 Q10 48 8 42 Z';

/** Bass clef SVG path (simplified). */
const BASS_CLEF_PATH =
  'M14 6 Q12 4 10 5 Q8 6 8 9 Q8 12 10 14 L12 18 Q13 20 13 23 Q13 26 11 28 Q9 30 7 28 Q5 26 6 23 L7 18 Q8 14 9 10 Q10 6 14 6 Z M12 24 Q13 25 13 27 Q13 29 11 30 Q9 31 8 29 Q7 27 8 25 Z';

interface StaffLayout {
  topY: number;
  lineSpacing: number;
  staffHeight: number;
  leftMargin: number;
  rightMargin: number;
  clefWidth: number;
  staffGap: number;
  noteRadius: number;
  accidentalFontSize: number;
}

function getLayout(compact: boolean): StaffLayout {
  return compact
    ? {
        topY: 12,
        lineSpacing: 7,
        staffHeight: 28, // 4 * 7 = 28px for 5 lines
        leftMargin: 28,
        rightMargin: 12,
        clefWidth: 18,
        staffGap: 20,
        noteRadius: 4.5,
        accidentalFontSize: 9,
      }
    : {
        topY: 14,
        lineSpacing: 10,
        staffHeight: 40, // 4 * 10 = 40px
        leftMargin: 36,
        rightMargin: 14,
        clefWidth: 24,
        staffGap: 28,
        noteRadius: 6,
        accidentalFontSize: 11,
      };
}

/** Y-position of a note on a staff (0 = bottom line). */
function noteY(position: number, topY: number, lineSpacing: number): number {
  // position 0 = bottom line (y = topY + 4*lineSpacing)
  return topY + lineSpacing * 4 - position * lineSpacing;
}

/** Y-coordinate of a staff line (0 = bottom, 4 = top). */
function lineY(lineIndex: number, topY: number, lineSpacing: number): number {
  return topY + lineSpacing * lineIndex;
}

// ── Component ──────────────────────────────────────────────────────────────

export function NotationStaff({
  highlightedNotes = [],
  selectedNotes = [],
  showNotes = true,
  compact = false,
  onNoteClick,
  className,
}: NotationStaffProps): ReactNode {
  const layout = getLayout(compact);
  const { topY, lineSpacing, staffHeight, leftMargin, clefWidth, staffGap, noteRadius } = layout;

  // Convert notes to staff positions
  const highlighted = useMemo(
    () => highlightedNotes.map((m) => midiToStaffNote(m)),
    [highlightedNotes],
  );
  const selected = useMemo(
    () => selectedNotes.map((m) => midiToStaffNote(m)),
    [selectedNotes],
  );
  const allDisplayNotes = useMemo(() => {
    if (!showNotes) return [];
    // Merge highlighted + selected, deduplicated by MIDI
    const map = new Map<number, StaffNote>();
    for (const n of highlighted) map.set(n.midi, n);
    for (const n of selected) if (!map.has(n.midi)) map.set(n.midi, n);
    return [...map.values()];
  }, [showNotes, highlighted, selected]);

  // Separate notes by staff
  const trebleNotes = useMemo(() => allDisplayNotes.filter((n) => n.staff === 'treble'), [allDisplayNotes]);
  const bassNotes = useMemo(() => allDisplayNotes.filter((n) => n.staff === 'bass'), [allDisplayNotes]);

  // ── Always render grand staff (treble + bass) ────────────────────────
  const trebleTopY = topY;
  const bassTopY = trebleTopY + staffHeight + staffGap;
  const totalHeight = bassTopY + staffHeight + topY;

  // Staff line drawing helper
  const renderStaffLines = (staffTopY: number, key: string) => (
    <g key={key}>
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={leftMargin}
          y1={lineY(i, staffTopY, lineSpacing)}
          x2={260 - layout.rightMargin}
          y2={lineY(i, staffTopY, lineSpacing)}
          stroke={LINE_COLOR}
          strokeWidth={0.8}
        />
      ))}
    </g>
  );

  // Clef rendering
  const renderClef = (type: 'treble' | 'bass', staffTopY: number) => {
    const pathData = type === 'treble' ? TREBLE_CLEF_PATH : BASS_CLEF_PATH;
    const h = staffHeight;
    const x = leftMargin - clefWidth + 2;
    const y = staffTopY - h * 0.08;
    return (
      <g transform={`translate(${x}, ${y}) scale(${h / 48})`}>
        <path d={pathData} fill={LINE_COLOR} />
      </g>
    );
  };

  // Render note heads with ledger lines
  const renderNotes = (notes: StaffNote[], staffTopY: number) => {
    const highlightSet = new Set(highlightedNotes);
    const selectedSet = new Set(selectedNotes);

    // Group notes by position to avoid overlapping note heads
    const byPos = new Map<number, StaffNote[]>();
    for (const n of notes) {
      const key = n.position;
      if (!byPos.has(key)) byPos.set(key, []);
      byPos.get(key)!.push(n);
    }

    const elements: ReactNode[] = [];
    const noteX = leftMargin + clefWidth + 8;

    for (const [pos, noteGroup] of byPos) {
      const y = noteY(pos, staffTopY, lineSpacing);
      const isHighlighted = noteGroup.some((n) => highlightSet.has(n.midi));
      const isSelected = noteGroup.some((n) => selectedSet.has(n.midi));
      const note = noteGroup[0]!;

      let fill = NOTE_COLOR;
      if (isSelected) fill = SELECTED_COLOR;
      else if (isHighlighted) fill = HIGHLIGHT_COLOR;

      // Ledger lines for notes outside the staff (pos < 0 or pos > 4)
      const ledgerLines: ReactNode[] = [];
      if (pos < 0) {
        for (let p = -2; p >= pos; p -= 2) {
          ledgerLines.push(
            <line
              key={`ledger-below-${p}`}
              x1={noteX - noteRadius * 1.6}
              y1={noteY(p, staffTopY, lineSpacing)}
              x2={noteX + noteRadius * 1.6}
              y2={noteY(p, staffTopY, lineSpacing)}
              stroke={LEDGER_COLOR}
              strokeWidth={0.8}
            />,
          );
        }
      }
      if (pos > 4) {
        for (let p = 6; p <= pos; p += 2) {
          ledgerLines.push(
            <line
              key={`ledger-above-${p}`}
              x1={noteX - noteRadius * 1.6}
              y1={noteY(p, staffTopY, lineSpacing)}
              x2={noteX + noteRadius * 1.6}
              y2={noteY(p, staffTopY, lineSpacing)}
              stroke={LEDGER_COLOR}
              strokeWidth={0.8}
            />,
          );
        }
      }

      // Accidental
      const accidentalEl =
        note.accidental ? (
          <text
            x={noteX - noteRadius * 2.2}
            y={y + noteRadius * 0.35}
            fontSize={layout.accidentalFontSize}
            fill={fill}
            textAnchor="middle"
            style={{ pointerEvents: 'none' }}
          >
            {note.accidental === '#' ? '♯' : '♭'}
          </text>
        ) : null;

      elements.push(
        <g key={`note-${note.midi}`}>
          {ledgerLines}
          {accidentalEl}
          <ellipse
            cx={noteX}
            cy={y}
            rx={noteRadius * 1.2}
            ry={noteRadius * 0.8}
            fill={fill}
            stroke={fill === NOTE_COLOR ? 'none' : fill}
            strokeWidth={fill !== NOTE_COLOR ? 1.2 : 0}
            transform={`rotate(-10, ${noteX}, ${y})`}
            style={{
              cursor: onNoteClick ? 'pointer' : 'default',
              transition: 'fill 150ms ease',
            }}
            onClick={() => onNoteClick?.(note.midi)}
          />
        </g>,
      );
    }
    return elements;
  };

  return (
    <div
      className={className}
      style={{
        overflowX: 'auto',
        width: '100%',
        maxWidth: '100%',
      }}
    >
      <svg
        viewBox={`0 0 260 ${totalHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: '100%',
          height: `${totalHeight}px`,
          display: 'block',
          userSelect: 'none',
        }}
      >
      {/* Grand staff brace */}
      <line
        x1={leftMargin - clefWidth - 2}
        y1={trebleTopY}
        x2={leftMargin - clefWidth - 2}
        y2={bassTopY + staffHeight}
        stroke={LINE_COLOR}
        strokeWidth={1.5}
      />

      {/* Treble staff */}
      {renderStaffLines(trebleTopY, 'treble-lines')}
      {renderClef('treble', trebleTopY)}
      {renderNotes(trebleNotes, trebleTopY)}

      {/* Bass staff */}
      {renderStaffLines(bassTopY, 'bass-lines')}
      {renderClef('bass', bassTopY)}
      {renderNotes(bassNotes, bassTopY)}
      </svg>
    </div>
  );
}
