import { useMemo } from 'react';
import { usePluginDrumPreview } from '@jazz/plugin-sdk';
import {
  ConstructorPage,
  createConstructorStore,
  type PreviewControls,
} from '@jazz/plugin-admin-constructor-shared';
import type { DrumHit, DrumSound, DrumPatternStyle } from '@jazz/music-core';
import { createDrumStrategy } from './drumStrategy.js';

export default function DrumConstructorPage() {
  const drumPreview = usePluginDrumPreview();

  const preview: PreviewControls<DrumSound> = useMemo(
    () => ({
      ready: drumPreview.ready,
      currentBar: drumPreview.currentBar,
      play: drumPreview.play as (hits: DrumHit[], opts: { bpm: number; loopBars: number; loop?: boolean }) => Promise<void>,
      stop: drumPreview.stop,
    }),
    [drumPreview],
  );

  const strategy = useMemo(() => createDrumStrategy(), []);

  const store = useMemo(
    () => createConstructorStore<DrumPatternStyle, DrumSound>(strategy.storageKey, strategy),
    [strategy],
  );

  return <ConstructorPage<DrumPatternStyle, DrumSound> strategy={strategy} preview={preview} store={store} />;
}
