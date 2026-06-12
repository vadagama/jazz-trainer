import { useNavigate } from 'react-router-dom';
import { useSettings, useUpdateSettings } from '@/queries/useSettings';
import { useLocalSettingsStore } from '@/stores/useLocalSettingsStore';
import { useAuth } from '@/queries/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { Button } from '@/components/ui/button';
import type { UserSettingsDTO } from '@jazz/shared';

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: serverSettings } = useSettings();
  const { theme, toggle } = useTheme();
  const updateServer = useUpdateSettings();
  const { settings: localSettings, setSettings: setLocalSettings } = useLocalSettingsStore();

  const navigate = useNavigate();
  const isServer = Boolean(user && serverSettings);
  const effectiveSettings = isServer ? serverSettings! : localSettings;

  async function handleSave(data: UserSettingsDTO) {
    if (isServer) {
      await updateServer.mutateAsync(data);
    } else {
      setLocalSettings(data);
    }
    navigate('/');
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

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-foreground">Тема интерфейса</p>
        <div className="flex overflow-hidden rounded-lg border border-border">
          <Button
            type="button"
            variant={theme === 'light' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none"
            onClick={() => theme !== 'light' && toggle()}
          >
            Светлая
          </Button>
          <div className="w-px bg-border" />
          <Button
            type="button"
            variant={theme === 'dark' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none"
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
