import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { renderWithProviders } from './renderWithProviders';
import type { UserSettingsDTO } from '@jazz/shared';

const DEFAULT: UserSettingsDTO = {
  bpm: 120,
  clickStrong: 'drum-stick',
  clickStrong2: 'drum-stick',
  clickWeak: 'drum-stick',
  volume: 0.8,
  countIn: 1,
};

describe('SettingsForm', () => {
  it('renders with default values', () => {
    renderWithProviders(<SettingsForm defaultValues={DEFAULT} onSave={vi.fn()} />);
    expect((screen.getByLabelText('BPM') as HTMLInputElement).value).toBe('120');
  });

  it('calls onSave with form data on submit', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<SettingsForm defaultValues={DEFAULT} onSave={onSave} />);

    const bpmInput = screen.getByLabelText('BPM');
    await user.clear(bpmInput);
    await user.type(bpmInput, '140');

    await user.click(screen.getByRole('button', { name: /сохранить/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
      expect(onSave.mock.calls[0]?.[0]).toMatchObject({ bpm: 140 });
    });
  });

  it('shows validation error for invalid BPM', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<SettingsForm defaultValues={DEFAULT} onSave={onSave} />);

    const bpmInput = screen.getByLabelText('BPM');
    await user.clear(bpmInput);
    await user.type(bpmInput, '5');

    await user.click(screen.getByRole('button', { name: /сохранить/i }));

    await waitFor(() => {
      expect(onSave).not.toHaveBeenCalled();
    });
  });
});
