import { useMemo } from 'react';
import {
  ConstructorPage,
  createConstructorStore,
  type PreviewControls,
} from '@jazz/plugin-admin-constructor-shared';
import type { BassArticulation, BassPatternStyle } from '@jazz/music-core';
import { createBassStrategy } from './bassStrategy.js';
import { useBassPreview } from './useBassPreview.js';

export default function BassConstructorPage() {
  // Preview грузит сэмплеры для всех 4 артикуляций (regular/muted из upright,
  // rel/stac из electric), поэтому любая молекула — независимо от выбранного
  // стиля — проигрывается корректно. Ступени движок выбирает по style + tension.
  const preview = useBassPreview();

  const previewControls: PreviewControls<BassArticulation> = useMemo(
    () => ({
      ready: preview.ready,
      currentBar: preview.currentBar,
      currentTick: preview.currentTick,
      play: preview.play,
      stop: preview.stop,
    }),
    [preview],
  );

  const strategy = useMemo(() => createBassStrategy(), []);

  const store = useMemo(
    () => createConstructorStore<BassPatternStyle, BassArticulation>(strategy.storageKey, strategy),
    [strategy],
  );

  return (
    <ConstructorPage<BassPatternStyle, BassArticulation>
      strategy={strategy}
      preview={previewControls}
      store={store}
    />
  );
}
