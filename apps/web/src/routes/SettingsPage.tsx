import { useSettings, useUpdateSettings } from '@/queries/useSettings';
import { useLocalSettingsStore } from '@/stores/useLocalSettingsStore';
import { useAuth } from '@/queries/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { Button } from '@/components/ui/button';
import type { UserSettingsDTO } from '@jazz/shared';

export function SettingsPage() {
  const { user } = useAuth();
  const { data: serverSettings } = useSettings();
  const { theme, toggle } = useTheme();
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

      <div className="space-y-1">
        <p className="text-sm font-medium">Тема интерфейса</p>
        <div className="flex gap-2">
          <Button
            variant={theme === 'light' ? 'default' : 'outline'}
            size="sm"
            onClick={() => theme !== 'light' && toggle()}
          >
            Светлая
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'outline'}
            size="sm"
            onClick={() => theme !== 'dark' && toggle()}
          >
            Тёмная
          </Button>
        </div>
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
