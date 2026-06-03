import { useSettings, useUpdateSettings } from '@/queries/useSettings';
import { useLocalSettingsStore } from '@/stores/useLocalSettingsStore';
import { useAuth } from '@/queries/useAuth';
import { SettingsForm } from '@/components/settings/SettingsForm';
import type { UserSettingsDTO } from '@jazz/shared';

export function SettingsPage() {
  const { user } = useAuth();
  const { data: serverSettings } = useSettings();
  const updateServer = useUpdateSettings();
  const { settings: localSettings, setSettings: setLocalSettings } = useLocalSettingsStore();

  const isServer = Boolean(user && serverSettings);
  const effectiveSettings = isServer ? serverSettings! : localSettings;

  async function handleSave(data: UserSettingsDTO) {
    if (isServer) {
      await updateServer.mutateAsync(data);
    } else {
      setLocalSettings(data);
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isServer
            ? 'Настройки метронома сохраняются в вашем профиле'
            : 'Настройки сохраняются локально в браузере'}
        </p>
      </div>

      <SettingsForm
        key={JSON.stringify(effectiveSettings)}
        defaultValues={effectiveSettings}
        onSave={handleSave}
        isSaving={updateServer.isPending}
      />
    </div>
  );
}
