import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayerToolbar } from '@jazz/plugin-core-editor';

const defaultProps = {
  currentKey: 'C' as const,
};

describe('PlayerToolbar', () => {
  it('renders with status=idle — Play button is enabled, Pause and Stop are disabled', () => {
    render(<PlayerToolbar {...defaultProps} status="idle" onPlay={vi.fn()} />);

    const play = screen.getByRole('button', { name: /воспроизвести/i });
    const pause = screen.getByRole('button', { name: /пауза/i });
    const stop = screen.getByRole('button', { name: /стоп/i });

    expect((play as HTMLButtonElement).disabled).toBe(false);
    expect((pause as HTMLButtonElement).disabled).toBe(true);
    expect((stop as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders with status=playing — Play is disabled, Pause is enabled', () => {
    render(<PlayerToolbar {...defaultProps} status="playing" onPlay={vi.fn()} onPause={vi.fn()} />);

    const play = screen.getByRole('button', { name: /воспроизвести/i });
    const pause = screen.getByRole('button', { name: /пауза/i });

    expect((play as HTMLButtonElement).disabled).toBe(true);
    expect((pause as HTMLButtonElement).disabled).toBe(false);
  });

  it('clicking Play calls onPlay callback', () => {
    const onPlay = vi.fn();
    render(<PlayerToolbar {...defaultProps} status="idle" onPlay={onPlay} />);

    fireEvent.click(screen.getByRole('button', { name: /воспроизвести/i }));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('displays the BPM value', () => {
    render(<PlayerToolbar {...defaultProps} bpm={140} />);

    const bpmInput = screen.getByRole('spinbutton', { name: /bpm/i }) as HTMLInputElement;
    expect(bpmInput.value).toBe('140');
  });

  it('clicking +5 calls onBpmChange with bpm + 5', () => {
    const onBpmChange = vi.fn();
    render(<PlayerToolbar {...defaultProps} bpm={120} onBpmChange={onBpmChange} />);

    fireEvent.click(screen.getByRole('button', { name: /bpm \+5/i }));
    expect(onBpmChange).toHaveBeenCalledWith(125);
  });

  it('clicking -5 calls onBpmChange with bpm - 5', () => {
    const onBpmChange = vi.fn();
    render(<PlayerToolbar {...defaultProps} bpm={120} onBpmChange={onBpmChange} />);

    fireEvent.click(screen.getByRole('button', { name: /bpm -5/i }));
    expect(onBpmChange).toHaveBeenCalledWith(115);
  });
});
