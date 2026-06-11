import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BarEditor } from '@jazz/plugin-core-editor';
import type { Bar } from '@jazz/shared';

function makeBar(chords: Bar['chords'] = []): Bar {
  return { id: 'b1', chords };
}

const baseProps = {
  bar: makeBar(),
  barIndex: 0,
  isOpen: true,
  onToggle: vi.fn(),
  onAddChord: vi.fn(),
  onRemoveChord: vi.fn(),
  onUpdateChord: vi.fn(),
  onUpdateBeats: vi.fn(),
  onRemoveBar: vi.fn(),
  onClose: vi.fn(),
};

describe('BarEditor', () => {
  it('renders with correct bar number', () => {
    render(<BarEditor {...baseProps} barIndex={2} />);
    expect(screen.getByText('Такт 3')).toBeTruthy();
  });

  it('calls onAddChord with valid chord symbol', () => {
    const onAddChord = vi.fn();
    render(<BarEditor {...baseProps} onAddChord={onAddChord} />);
    const input = screen.getByTestId('new-chord-input');
    fireEvent.change(input, { target: { value: 'Cmaj7' } });
    fireEvent.click(screen.getByRole('button', { name: /добавить аккорд/i }));
    expect(onAddChord).toHaveBeenCalledWith('Cmaj7');
  });

  it('shows error for unknown chord', () => {
    render(<BarEditor {...baseProps} onAddChord={vi.fn()} />);
    const input = screen.getByTestId('new-chord-input');
    fireEvent.change(input, { target: { value: 'XYZQQ' } });
    fireEvent.click(screen.getByRole('button', { name: /добавить аккорд/i }));
    expect(screen.getByTestId('chord-error')).toBeTruthy();
  });

  it('shows error for empty chord input', () => {
    render(<BarEditor {...baseProps} onAddChord={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /добавить аккорд/i }));
    expect(screen.getByTestId('chord-error')).toBeTruthy();
  });

  it('calls onRemoveChord when X clicked', () => {
    const onRemoveChord = vi.fn();
    const bar = makeBar([{ symbol: 'G7', parsed: null }]);
    render(<BarEditor {...baseProps} bar={bar} onRemoveChord={onRemoveChord} />);
    fireEvent.click(screen.getByRole('button', { name: /удалить аккорд 1/i }));
    expect(onRemoveChord).toHaveBeenCalledWith(0);
  });

  it('calls onRemoveBar when delete button clicked', () => {
    const onRemoveBar = vi.fn();
    render(<BarEditor {...baseProps} onRemoveBar={onRemoveBar} />);
    fireEvent.click(screen.getByRole('button', { name: /удалить такт/i }));
    expect(onRemoveBar).toHaveBeenCalled();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<BarEditor {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /закрыть редактор/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('adds chord on Enter key', () => {
    const onAddChord = vi.fn();
    render(<BarEditor {...baseProps} onAddChord={onAddChord} />);
    const input = screen.getByTestId('new-chord-input');
    fireEvent.change(input, { target: { value: 'Am7' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAddChord).toHaveBeenCalledWith('Am7');
  });
});
