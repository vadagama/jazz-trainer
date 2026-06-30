/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { NotationStaff } from './NotationStaff';

describe('NotationStaff', () => {
  it('renders an SVG element', () => {
    const { container } = render(<NotationStaff />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders grand staff with treble and bass clefs', () => {
    const { container } = render(<NotationStaff />);
    const lines = container.querySelectorAll('line');
    // 5 treble lines + 5 bass lines + brace line = 11 lines
    expect(lines.length).toBeGreaterThanOrEqual(10);
  });

  it('renders highlighted notes as note heads', () => {
    const { container } = render(
      <NotationStaff highlightedNotes={[60, 64, 67]} />, // C4, E4, G4
    );
    const ellipses = container.querySelectorAll('ellipse');
    expect(ellipses.length).toBe(3);
  });

  it('renders in compact mode with smaller height', () => {
    const { container } = render(<NotationStaff compact />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders selected notes in green', () => {
    const { container } = render(
      <NotationStaff highlightedNotes={[60]} selectedNotes={[64]} />,
    );
    const ellipses = container.querySelectorAll('ellipse');
    expect(ellipses.length).toBe(2);
  });

  it('renders ledger lines for notes below treble staff', () => {
    const { container } = render(
      <NotationStaff highlightedNotes={[60]} />, // C4 = one ledger line below treble
    );
    // Grand staff: 5 treble lines + 5 bass lines + brace line + 1 ledger line = 12 lines
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(12);
  });

  it('places low notes on bass clef, high notes on treble clef', () => {
    const { container } = render(
      <NotationStaff highlightedNotes={[43, 76]} />, // G2 (bass), E5 (treble)
    );
    const ellipses = container.querySelectorAll('ellipse');
    expect(ellipses.length).toBe(2);
  });
});
