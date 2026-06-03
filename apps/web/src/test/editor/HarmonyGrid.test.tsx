import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HarmonyGrid } from '@/components/editor/HarmonyGrid';
import type { Section } from '@jazz/shared';

const makeSection = (bars: Section['bars'], id = 's1', name = 'Section A'): Section => ({
  id,
  name,
  timeSignature: '4/4',
  bars,
});

const noop = vi.fn();

const defaultProps = {
  selectedBarId: null,
  onSelectBar: noop,
  onRenameSection: noop,
  onSetSectionTimeSignature: noop,
  onAddBarToSection: noop,
  onSetBarRepeatEnd: noop,
  onAddSection: noop,
};

describe('HarmonyGrid', () => {
  it('shows empty state when no sections', () => {
    render(<HarmonyGrid {...defaultProps} sections={[]} />);
    expect(screen.getByText(/нет секций/i)).toBeTruthy();
  });

  it('renders one cell per bar', () => {
    const bars = [
      { id: 'b1', chords: [{ symbol: 'Cmaj7', parsed: null }] },
      { id: 'b2', chords: [] },
    ];
    render(<HarmonyGrid {...defaultProps} sections={[makeSection(bars)]} />);
    expect(screen.getByTestId('bar-cell-b1')).toBeTruthy();
    expect(screen.getByTestId('bar-cell-b2')).toBeTruthy();
  });

  it('calls onSelectBar with correct id on click', () => {
    const onSelect = vi.fn();
    const bars = [{ id: 'b1', chords: [] }];
    render(<HarmonyGrid {...defaultProps} sections={[makeSection(bars)]} onSelectBar={onSelect} />);
    fireEvent.click(screen.getByTestId('bar-cell-b1'));
    expect(onSelect).toHaveBeenCalledWith('b1');
  });

  it('marks selected bar with aria-pressed', () => {
    const bars = [{ id: 'b1', chords: [] }, { id: 'b2', chords: [] }];
    render(<HarmonyGrid {...defaultProps} sections={[makeSection(bars)]} selectedBarId="b1" />);
    expect(screen.getByTestId('bar-cell-b1').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('bar-cell-b2').getAttribute('aria-pressed')).toBe('false');
  });

  it('shows chord symbols inside bar cells', () => {
    const bars = [
      { id: 'b1', chords: [{ symbol: 'Dm7', parsed: null }, { symbol: 'G7', parsed: null }] },
    ];
    render(<HarmonyGrid {...defaultProps} sections={[makeSection(bars)]} />);
    expect(screen.getByText('Dm7')).toBeTruthy();
    expect(screen.getByText('G7')).toBeTruthy();
  });

  it('shows section name', () => {
    render(<HarmonyGrid {...defaultProps} sections={[makeSection([], 's1', 'Intro')]} />);
    expect(screen.getByText('Intro')).toBeTruthy();
  });
});
