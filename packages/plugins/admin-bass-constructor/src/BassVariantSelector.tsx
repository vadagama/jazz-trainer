/**
 * Bass variant selector — ToolbarExtras для конструктора баса.
 *
 * Зеркало {@link PianoVariantSelector}. Состояние активного bass variant
 * хранится в zustand-сторе (без persist — состояние сессии). Разделяется между
 * BassVariantSelector (запись) и useBassPreview (чтение → выбор сэмплеров).
 *
 * В конструкторе строки сетки = все 4 артикуляции (независимо от variant), но
 * preview выбирает сэмплы по variant: upright → Sneakybass, electric → darkblack.
 * rel/stac (electric-only) при upright-варианте fallback'ятся на regular/muted.
 */
import { create } from 'zustand';
import { Button } from '@jazz/ui';
import type { BassVariant } from '@jazz/music-core';

interface BassVariantState {
  activeVariant: BassVariant;
  setVariant: (v: BassVariant) => void;
}

export const useBassVariantStore = create<BassVariantState>((set) => ({
  activeVariant: 'upright',
  setVariant: (v) => set({ activeVariant: v }),
}));

export function BassVariantSelector() {
  const activeVariant = useBassVariantStore((s) => s.activeVariant);
  const setVariant = useBassVariantStore((s) => s.setVariant);

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm text-muted-foreground">Бас:</span>
      {(
        [
          { id: 'upright', name: 'Upright' },
          { id: 'electric', name: 'Electric' },
        ] as const
      ).map((v) => (
        <Button
          key={v.id}
          size="sm"
          variant={activeVariant === v.id ? 'secondary' : 'ghost'}
          onClick={() => setVariant(v.id)}
        >
          {v.name}
        </Button>
      ))}
    </div>
  );
}
