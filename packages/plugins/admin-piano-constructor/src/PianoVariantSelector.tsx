/**
 * Piano variant selector — ToolbarExtras для конструктора фортепиано.
 *
 * Состояние активного piano variant хранится в zustand-сторе (без persist —
 * состояние сессии). Разделяется между PianoVariantSelector (запись) и
 * PianoConstructorPage (чтение → usePianoPreview).
 */
import { create } from 'zustand';
import { Button } from '@jazz/ui';
import { getInstrumentGroup, getDefaultVariant } from '@jazz/music-core';

interface PianoVariantState {
  activeVariant: string;
  setVariant: (v: string) => void;
}

export const usePianoVariantStore = create<PianoVariantState>((set) => ({
  activeVariant: getDefaultVariant('piano', 'swing'),
  setVariant: (v) => set({ activeVariant: v }),
}));

export function PianoVariantSelector() {
  const activeVariant = usePianoVariantStore((s) => s.activeVariant);
  const setVariant = usePianoVariantStore((s) => s.setVariant);
  const pianoGroup = getInstrumentGroup('piano');
  const pianoVariants = pianoGroup.variants;

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-muted-foreground">Пианино:</span>
      {pianoVariants.map((v) => (
        <Button
          key={v.instrumentId}
          size="sm"
          variant={activeVariant === v.instrumentId ? 'secondary' : 'ghost'}
          onClick={() => setVariant(v.instrumentId)}
        >
          {v.name}
        </Button>
      ))}
    </div>
  );
}
