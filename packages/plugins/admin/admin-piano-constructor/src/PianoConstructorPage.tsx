import { useMemo } from 'react';
import {
  ConstructorPage,
  createConstructorStore,
  type PreviewControls,
} from '@jazz/plugin-admin-constructor-shared';
import type { PianoPatternStyle, VoiceRole } from '@jazz/music-core';
import { createPianoStrategy } from './pianoStrategy.js';
import { usePianoPreview } from './usePianoPreview.js';
import { SAMPLER_URL_BUILDERS } from './pianoSampler.js';
import { usePianoVariantStore } from './PianoVariantSelector.js';

export default function PianoConstructorPage() {
  // Активный piano variant из zustand-стора (разделяется с PianoVariantSelector).
  const activePiano = usePianoVariantStore((s) => s.activeVariant);

  const preview = usePianoPreview({
    activePiano,
    samplerUrlBuilders: SAMPLER_URL_BUILDERS,
  });

  const previewControls: PreviewControls<VoiceRole> = useMemo(
    () => ({
      ready: preview.ready,
      currentBar: preview.currentBar,
      currentTick: preview.currentTick,
      play: preview.play,
      stop: preview.stop,
    }),
    [preview],
  );

  const strategy = useMemo(() => createPianoStrategy(), []);

  const store = useMemo(
    () => createConstructorStore<PianoPatternStyle, VoiceRole>(strategy.storageKey, strategy),
    [strategy],
  );

  return (
    <ConstructorPage<PianoPatternStyle, VoiceRole>
      strategy={strategy}
      preview={previewControls}
      store={store}
    />
  );
}
