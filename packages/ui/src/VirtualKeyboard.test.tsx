/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { VirtualKeyboard } from './VirtualKeyboard';
import type { VirtualKeyState } from './VirtualKeyboard';

describe('VirtualKeyboard', () => {
  it('renders an SVG element', () => {
    const { container } = render(<VirtualKeyboard />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders key groups for each MIDI note (2 octaves)', () => {
    const { container } = render(<VirtualKeyboard octaveRange={[3, 4]} />);
    // 2 octaves = 14 white keys + 10 black keys = 24 key groups
    const groups = container.querySelectorAll('[data-midi-note]');
    expect(groups.length).toBe(24);
  });

  it('renders compact mode with correct viewBox height', () => {
    const { container } = render(<VirtualKeyboard compact octaveRange={[3, 4]} />);
    const svg = container.querySelector('svg');
    // compact svgH=115, viewBox ends with " 115"
    expect(svg?.getAttribute('viewBox')).toMatch(/ 115$/);
  });

  it('renders normal mode with correct viewBox height', () => {
    const { container } = render(<VirtualKeyboard compact={false} octaveRange={[3, 4]} />);
    const svg = container.querySelector('svg');
    // non-compact svgH=170, viewBox ends with " 170"
    expect(svg?.getAttribute('viewBox')).toMatch(/ 170$/);
  });

  it('shows note labels when showLabels is true', () => {
    const { container } = render(<VirtualKeyboard showLabels octaveRange={[4, 4]} />);
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBeGreaterThan(0);
  });

  it('hides note labels when showLabels is false', () => {
    const { container } = render(<VirtualKeyboard showLabels={false} />);
    expect(container.querySelectorAll('text').length).toBe(0);
  });

  it('defaults showLabels to true', () => {
    const { container } = render(<VirtualKeyboard octaveRange={[4, 4]} />);
    expect(container.querySelectorAll('text').length).toBeGreaterThan(0);
  });

  it('highlights active MIDI key with the same pressed color as mouse', () => {
    const activeKeys = new Map<number, VirtualKeyState>();
    activeKeys.set(60, { note: 'C4', midiNote: 60, brightness: 0.8 });
    const { container } = render(<VirtualKeyboard activeKeys={activeKeys} showLabels={false} />);
    const fills = Array.from(container.querySelectorAll('rect')).map((r) => r.getAttribute('fill'));
    // Active key uses the same solid pressed color as mouse press (#b8cce0)
    expect(fills.some((f) => f === '#b8cce0')).toBe(true);
  });

  it('renders without active keys (idle)', () => {
    const { container } = render(<VirtualKeyboard />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders custom octave range', () => {
    const { container } = render(<VirtualKeyboard octaveRange={[4, 5]} />);
    const groups = container.querySelectorAll('[data-midi-note]');
    expect(groups.length).toBe(24); // 2 octaves
  });

  it('calls onKeyClick on pointer-down', () => {
    const onKeyClick = vi.fn();
    const { container } = render(<VirtualKeyboard octaveRange={[3, 4]} onKeyClick={onKeyClick} />);
    const c3 = container.querySelector('[data-midi-note="48"]');
    expect(c3).toBeTruthy();
    fireEvent.pointerDown(c3!);
    expect(onKeyClick).toHaveBeenCalledWith(48);
  });

  it('calls onKeyRelease on pointer-up', () => {
    const onKeyRelease = vi.fn();
    const { container } = render(
      <VirtualKeyboard octaveRange={[3, 4]} onKeyRelease={onKeyRelease} />,
    );
    const c3 = container.querySelector('[data-midi-note="48"]');
    fireEvent.pointerDown(c3!);
    fireEvent.pointerUp(c3!);
    expect(onKeyRelease).toHaveBeenCalledWith(48);
  });

  it('applies chord-highlight colors to chord tones', () => {
    const chordNotes = [60, 64, 67, 71];
    const { container } = render(
      <VirtualKeyboard mode="chord-highlight" chordNotes={chordNotes} showLabels={false} />,
    );
    const fills = Array.from(container.querySelectorAll('rect')).map((r) => r.getAttribute('fill'));
    // Chord tone white key gets #ddeeff
    expect(fills.some((f) => f === '#ddeeff')).toBe(true);
  });

  it('applies scale-highlight dimming to non-scale keys', () => {
    const scaleNotes = [60, 62, 64, 65, 67, 69, 71];
    const { container } = render(
      <VirtualKeyboard mode="scale-highlight" scaleNotes={scaleNotes} showLabels={false} />,
    );
    const fills = Array.from(container.querySelectorAll('rect')).map((r) => r.getAttribute('fill'));
    // Dimmed white key gets #d0d0d0
    expect(fills.some((f) => f === '#d0d0d0')).toBe(true);
  });

  it('accepts custom className on container div', () => {
    const { container } = render(<VirtualKeyboard className="my-class" />);
    expect(container.firstElementChild?.className).toContain('my-class');
  });
});
