import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GeneratorModal } from '@/components/editor/GeneratorModal';
import { renderWithProviders } from '../renderWithProviders';
import type { GridContent, PatternInfo } from '@jazz/shared';

const mockPatterns: PatternInfo[] = [
  { id: 'ii-V-I-major', name: 'ii-V-I Major', description: 'Классический ii-V-I', defaultBars: 4, variableLength: true },
];

vi.mock('@/queries/useGrid', () => ({
  usePatterns: vi.fn(() => ({ data: mockPatterns, isLoading: false })),
  useGenerateGrid: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({
      version: 1,
      bars: [
        { id: 'b1', chords: [{ symbol: 'Dm7', parsed: null }] },
        { id: 'b2', chords: [{ symbol: 'G7', parsed: null }] },
      ],
    } satisfies GridContent),
    isPending: false,
    isError: false,
  })),
}));

describe('GeneratorModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows pattern list', () => {
    renderWithProviders(
      <GeneratorModal open onApply={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByTestId('pattern-select')).toBeTruthy();
  });

  it('shows key selector', () => {
    renderWithProviders(
      <GeneratorModal open onApply={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByTestId('key-select-gen')).toBeTruthy();
  });

  it('calls onClose when cancel clicked', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <GeneratorModal open onApply={vi.fn()} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /отмена/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('generate button is disabled when no pattern selected', () => {
    renderWithProviders(
      <GeneratorModal open onApply={vi.fn()} onClose={vi.fn()} />,
    );
    const btn = screen.getByTestId('gen-generate-btn');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});
