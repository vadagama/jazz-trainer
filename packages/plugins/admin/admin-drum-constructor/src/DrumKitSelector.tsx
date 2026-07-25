/**
 * Drum kit selector — ToolbarExtras для конструктора барабанов.
 *
 * Переключает preview-кит через хост-хук usePluginDrumPreview.
 */
import { Button } from '@jazz/ui';
import { usePluginDrumPreview, useInstruments } from '@jazz/plugin-sdk';

export function DrumKitSelector() {
  const preview = usePluginDrumPreview();
  const instruments = useInstruments();

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-muted-foreground">Кит:</span>
      {instruments.list('drums').map((k) => (
        <Button
          key={k.id}
          size="sm"
          variant={preview.kit === k.id ? 'secondary' : 'ghost'}
          onClick={() => preview.setKit(k.id)}
        >
          {k.name}
        </Button>
      ))}
      {!preview.ready && (
        <span className="text-xs text-muted-foreground">загрузка сэмплов…</span>
      )}
    </div>
  );
}
