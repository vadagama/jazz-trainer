/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MidiIndicator } from './MidiIndicator';

describe('MidiIndicator', () => {
  it('renders disconnected status', () => {
    render(<MidiIndicator status="disconnected" />);
    const el = screen.getByRole('status');
    expect(el).toBeTruthy();
    expect(el.getAttribute('aria-label')).toBe('No MIDI');
  });

  it('renders available status', () => {
    render(<MidiIndicator status="available" />);
    const el = screen.getByRole('status');
    expect(el.getAttribute('aria-label')).toBe('MIDI Ready');
  });

  it('renders connected status', () => {
    render(<MidiIndicator status="connected" />);
    const el = screen.getByRole('status');
    expect(el.getAttribute('aria-label')).toBe('MIDI Connected');
  });

  it('shows flash animation when flash is true', () => {
    const { container } = render(<MidiIndicator status="connected" flash />);
    const dot = container.querySelector('span');
    expect(dot?.className).toContain('animate-pulse');
  });

  it('does not show flash animation when flash is false', () => {
    const { container } = render(<MidiIndicator status="connected" flash={false} />);
    const dot = container.querySelector('span');
    expect(dot?.className).not.toContain('animate-pulse');
  });

  it('renders custom label', () => {
    render(<MidiIndicator status="connected" label="Custom Label" />);
    const el = screen.getByRole('status');
    expect(el.getAttribute('aria-label')).toBe('Custom Label');
  });
});
