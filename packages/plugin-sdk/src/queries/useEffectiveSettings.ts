import { useEffect, useRef } from 'react';
import type { UserSettingsDTO } from '@jazz/shared';
import { useAuth } from './useAuth';
import { useSettings, useUpdateSettings } from './useSettings';
import { useLocalSettingsStore } from '../stores/useLocalSettingsStore';

export function useEffectiveSettings(): UserSettingsDTO {
  const { user } = useAuth();
  const { data: serverSettings } = useSettings();
  const { settings: localSettings } = useLocalSettingsStore();
  const updateSettings = useUpdateSettings();
  const migratedRef = useRef(false);

  useEffect(() => {
    if (!user || !serverSettings || migratedRef.current) return;

    const stored = localStorage.getItem('jazz-settings-migrated');
    if (stored) return;

    const hasLocalCustom =
      localSettings.bpm !== 120 || localSettings.volume !== 0.8 || localSettings.countIn !== 1;

    if (hasLocalCustom) {
      migratedRef.current = true;
      updateSettings.mutate(localSettings, {
        onSuccess: () => {
          localStorage.setItem('jazz-settings-migrated', '1');
        },
      });
    }
  }, [user, serverSettings, localSettings, updateSettings]);

  if (user && serverSettings) return serverSettings;
  return localSettings;
}
