import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DslModal } from '@jazz/plugin-core-editor';
import type { GridContent } from '@jazz/shared';

const emptyContent: GridContent = {
  version: 1,
  bars: [],
};

const filledContent: GridContent = {
  version: 1,
  bars: [
    { id: 'b1', chords: [{ symbol: 'Cmaj7', parsed: null }] },
    {
      id: 'b2',
      chords: [
        { symbol: 'Dm7', parsed: null },
        { symbol: 'G7', parsed: null },
      ],
    },
  ],
};

describe('DslModal', () => {
  it('renders export tab by default with DSL text', () => {
    render(<DslModal open content={filledContent} onImport={vi.fn()} onClose={vi.fn()} />);
    const textarea = screen.getByTestId('dsl-export-text');
    expect(textarea).toBeTruthy();
    const val = (textarea as HTMLTextAreaElement).value;
    expect(val).toContain('Cmaj7');
    expect(val).toContain('Dm7');
    expect(val).toContain('G7');
  });

  it('switches to import tab', () => {
    render(<DslModal open content={emptyContent} onImport={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('dsl-tab-import'));
    expect(screen.getByTestId('dsl-import-text')).toBeTruthy();
  });

  it('calls onImport with parsed content on valid DSL', () => {
    const onImport = vi.fn();
    render(<DslModal open content={emptyContent} onImport={onImport} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('dsl-tab-import'));
    const textarea = screen.getByTestId('dsl-import-text');
    fireEvent.change(textarea, { target: { value: 'Cmaj7 | Dm7 G7 ||' } });
    fireEvent.click(screen.getByTestId('dsl-import-btn'));
    expect(onImport).toHaveBeenCalledTimes(1);
    const arg: GridContent = onImport.mock.calls[0]![0];
    expect(arg.bars).toHaveLength(2);
  });

  it('shows error for empty DSL import', () => {
    render(<DslModal open content={emptyContent} onImport={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('dsl-tab-import'));
    fireEvent.click(screen.getByTestId('dsl-import-btn'));
    expect(screen.getByTestId('dsl-errors')).toBeTruthy();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<DslModal open content={emptyContent} onImport={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /закрыть/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
