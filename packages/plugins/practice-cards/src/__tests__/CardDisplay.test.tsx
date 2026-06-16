import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardDisplay } from '../components/CardDisplay.js';
import type { PracticeBar } from '../generators/types.js';

const makeBar = (index: number, chords: string[]): PracticeBar => ({
  index,
  chords,
  scaleLabel: chords.length > 1 ? chords.join(' ') : undefined,
});

const twoBars: PracticeBar[] = [makeBar(0, ['Cmaj7']), makeBar(1, ['Dm7', 'G7'])];

const threeBars: PracticeBar[] = [makeBar(0, ['Cmaj7']), makeBar(1, ['Dm7']), makeBar(2, ['G7'])];

const multiChordBar: PracticeBar[] = [makeBar(0, ['Cmaj7', 'A7', 'Dm7', 'G7', 'Cmaj7'])];

describe('CardDisplay', () => {
  describe('current mode', () => {
    it('renders only the current bar', () => {
      render(<CardDisplay bars={threeBars} currentIndex={1} mode="current" />);

      expect(screen.getByText('Dm7')).toBeDefined();
      expect(screen.queryByText('Cmaj7')).toBeNull();
      expect(screen.queryByText('G7')).toBeNull();
    });

    it('handles index=0 (no prev)', () => {
      render(<CardDisplay bars={threeBars} currentIndex={0} mode="current" />);
      expect(screen.getByText('Cmaj7')).toBeDefined();
    });

    it('handles index=last (no next)', () => {
      render(<CardDisplay bars={threeBars} currentIndex={2} mode="current" />);
      expect(screen.getByText('G7')).toBeDefined();
    });
  });

  describe('prev-current mode', () => {
    it('renders prev and current bars', () => {
      render(<CardDisplay bars={threeBars} currentIndex={1} mode="prev-current" />);
      expect(screen.getByText('Cmaj7')).toBeDefined();
      expect(screen.getByText('Dm7')).toBeDefined();
      expect(screen.queryByText('G7')).toBeNull();
    });

    it('renders only current when index=0', () => {
      render(<CardDisplay bars={threeBars} currentIndex={0} mode="prev-current" />);
      expect(screen.getByText('Cmaj7')).toBeDefined();
      expect(screen.queryByText('Dm7')).toBeNull();
    });
  });

  describe('prev-current-next mode', () => {
    it('renders all three when all available', () => {
      render(<CardDisplay bars={threeBars} currentIndex={1} mode="prev-current-next" />);
      expect(screen.getByText('Cmaj7')).toBeDefined();
      expect(screen.getByText('Dm7')).toBeDefined();
      expect(screen.getByText('G7')).toBeDefined();
    });

    it('renders prev+current when at end', () => {
      render(<CardDisplay bars={threeBars} currentIndex={2} mode="prev-current-next" />);
      expect(screen.getByText('Dm7')).toBeDefined();
      expect(screen.getByText('G7')).toBeDefined();
      expect(screen.queryByText('Cmaj7')).toBeNull();
    });
  });

  describe('multi-chord bars', () => {
    it('renders multi-chord text separated by spaces', () => {
      render(<CardDisplay bars={twoBars} currentIndex={1} mode="current" />);

      // Dm7 and G7 are joined with space as the display text
      expect(screen.getByText('Dm7 G7')).toBeDefined();
    });

    it('renders scaleLabel when present', () => {
      const bars: PracticeBar[] = [
        { index: 0, chords: ['Cmaj7'], scaleLabel: 'C Major', direction: 'up' },
      ];
      render(<CardDisplay bars={bars} currentIndex={0} mode="current" />);
      expect(screen.getByText('C Major')).toBeDefined();
    });

    it('reduces font size for many chords', () => {
      render(<CardDisplay bars={multiChordBar} currentIndex={0} mode="current" />);
      const span = screen.getByText('Cmaj7 A7 Dm7 G7 Cmaj7');
      // Should use a smaller font class for 5 chords
      expect(span.className).toContain('text-2xl');
    });
  });

  describe('empty bars', () => {
    it('renders nothing when bars is empty', () => {
      const { container } = render(<CardDisplay bars={[]} currentIndex={0} mode="current" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.children.length).toBe(0);
    });
  });
});
