import { useMemo } from 'react';
import { usePluginPercussionPreview } from '@jazz/plugin-sdk';
import {
  ConstructorPage,
  createConstructorStore,
  type PreviewControls,
} from '@jazz/plugin-admin-constructor-shared';
import type { PercussionHit, PercussionSound, PercussionPatternStyle } from '@jazz/music-core';
import { createPercussionStrategy } from './percussionStrategy.js';

export default function PercussionConstructorPage() {
  const percussionPreview = usePluginPercussionPreview();

  const preview: PreviewControls<PercussionSound> = useMemo(
    () => ({
      ready: percussionPreview.ready,
      currentBar: percussionPreview.currentBar,
      play: percussionPreview.play as (
        hits: PercussionHit[],
        opts: { bpm: number; loopBars: number; loop?: boolean },
      ) => Promise<void>,
      stop: percussionPreview.stop,
    }),
    [percussionPreview],
  );

  const strategy = useMemo(() => createPercussionStrategy(), []);

  const store = useMemo(
    () =>
      createConstructorStore<PercussionPatternStyle, PercussionSound>(
        strategy.storageKey,
        strategy,
      ),
    [strategy],
  );

  return (
    <ConstructorPage<PercussionPatternStyle, PercussionSound>
      strategy={strategy}
      preview={preview}
      store={store}
    />
  );
}
