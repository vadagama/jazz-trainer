import { useMemo } from 'react';
import {
  ConstructorPage,
  createConstructorStore,
  type PreviewControls,
} from '@jazz/plugin-admin-constructor-shared';
import type { RhodesPatternStyle, RhodesVoicingRole } from '@jazz/music-core';
import { createRhodesStrategy } from './rhodesStrategy.js';
import { useRhodesPreview } from './useRhodesPreview.js';

export default function RhodesConstructorPage() {
  const preview = useRhodesPreview();

  const previewControls: PreviewControls<RhodesVoicingRole> = useMemo(
    () => ({
      ready: preview.ready,
      currentBar: preview.currentBar,
      currentTick: preview.currentTick,
      play: preview.play,
      stop: preview.stop,
    }),
    [preview],
  );

  const strategy = useMemo(() => createRhodesStrategy(), []);

  const store = useMemo(
    () => createConstructorStore<RhodesPatternStyle, RhodesVoicingRole>(strategy.storageKey, strategy),
    [strategy],
  );

  return (
    <ConstructorPage<RhodesPatternStyle, RhodesVoicingRole>
      strategy={strategy}
      preview={previewControls}
      store={store}
    />
  );
}
