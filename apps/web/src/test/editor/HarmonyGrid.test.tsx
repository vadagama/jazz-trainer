import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HarmonyGrid } from '@/components/editor/HarmonyGrid';
import type { GridContent } from '@jazz/shared';

const makeContent = (bars: GridContent['bars']): GridContent => ({ version: 1, bars });

describe('HarmonyGrid', () => {
  it('shows empty state when no bars', () => {
    const onSelect = vi.fn();
    render(
      <HarmonyGrid content={makeContent([])} selectedBarId={null} onSelectBar={onSelect} />,
    );
    expect(screen.getByText(/нет тактов/i)).toBeTruthy();
  });

  it('renders one cell per bar', () => {
    const bars = [
      { id: 'b1', chords: [{ symbol: 'Cmaj7', parsed: null }] },
      { id: 'b2', chords: [] },
    ];
    render(
      <HarmonyGrid content={makeContent(bars)} selectedBarId={null} onSelectBar={vi.fn()} />,
    );
    expect(screen.getByTestId('bar-cell-b1')).toBeTruthy();
    expect(screen.getByTestId('bar-cell-b2')).toBeTruthy();
  });

  it('calls onSelectBar with correct id on click', () => {
    const onSelect = vi.fn();
    const bars = [{ id: 'b1', chords: [] }];
    render(
      <HarmonyGrid content={makeContent(bars)} selectedBarId={null} onSelectBar={onSelect} />,
    );
    fireEvent.click(screen.getByTestId('bar-cell-b1'));
    expect(onSelect).toHaveBeenCalledWith('b1');
  });

  it('marks selected bar with aria-pressed', () => {
    const bars = [{ id: 'b1', chords: [] }, { id: 'b2', chords: [] }];
    render(
      <HarmonyGrid content={makeContent(bars)} selectedBarId="b1" onSelectBar={vi.fn()} />,
    );
    const cell = screen.getByTestId('bar-cell-b1');
    expect(cell.getAttribute('aria-pressed')).toBe('true');
    const other = screen.getByTestId('bar-cell-b2');
    expect(other.getAttribute('aria-pressed')).toBe('false');
  });

  it('shows chord symbols inside bar cells', () => {
    const bars = [
      { id: 'b1', chords: [{ symbol: 'Dm7', parsed: null }, { symbol: 'G7', parsed: null }] },
    ];
    render(
      <HarmonyGrid content={makeContent(bars)} selectedBarId={null} onSelectBar={vi.fn()} />,
    );
    expect(screen.getByText('Dm7')).toBeTruthy();
    expect(screen.getByText('G7')).toBeTruthy();
  });

  it('shows bar numbers', () => {
    const bars = [{ id: 'b1', chords: [] }, { id: 'b2', chords: [] }];
    render(
      <HarmonyGrid content={makeContent(bars)} selectedBarId={null} onSelectBar={vi.fn()} />,
    );
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });
});
