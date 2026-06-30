/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MidiLog } from './MidiLog';
import type { MidiLogEntry } from './MidiLog';

const sampleEntries: MidiLogEntry[] = [
  { note: 'C4', velocity: 87, timestamp: 1000 },
  { note: 'D4', velocity: 64, timestamp: 2000 },
  { note: 'E4', velocity: 92, timestamp: 3000 },
  { note: 'F4', velocity: 78, timestamp: 4000 },
];

describe('MidiLog', () => {
  it('returns null when entries are empty and not expanded', () => {
    const { container } = render(<MidiLog entries={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows toggle button when expanded even with empty entries', () => {
    render(<MidiLog entries={[]} expanded />);
    expect(screen.getByText('MIDI Log (0)')).toBeTruthy();
  });

  it('displays entry count', () => {
    render(<MidiLog entries={sampleEntries} />);
    expect(screen.getByText('MIDI Log (4)')).toBeTruthy();
  });

  it('shows entries when expanded', () => {
    render(<MidiLog entries={sampleEntries} expanded />);
    expect(screen.getByText('C4')).toBeTruthy();
    expect(screen.getByText('vel:87')).toBeTruthy();
  });

  it('hides entries when not expanded', () => {
    render(<MidiLog entries={sampleEntries} expanded={false} />);
    expect(screen.queryByText('C4')).toBeNull();
  });

  it('calls onToggle when clicked', () => {
    let toggled = false;
    render(
      <MidiLog
        entries={sampleEntries}
        onToggle={() => {
          toggled = true;
        }}
      />,
    );
    fireEvent.click(screen.getByText('MIDI Log (4)'));
    expect(toggled).toBe(true);
  });

  it('respects maxEntries', () => {
    const manyEntries: MidiLogEntry[] = Array.from({ length: 20 }, (_, i) => ({
      note: `C4`,
      velocity: 80,
      timestamp: i * 100,
    }));
    render(<MidiLog entries={manyEntries} maxEntries={3} expanded />);
    const noteEls = screen.getAllByText('C4');
    expect(noteEls.length).toBe(3);
  });

  it('shows empty message when no entries', () => {
    render(<MidiLog entries={[]} expanded />);
    expect(screen.getByText('No events yet')).toBeTruthy();
  });
});
