import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': r('./apps/web/src'),
      '@jazz/shared': r('./packages/shared/src/index.ts'),
      '@jazz/music-core/audio': r('./packages/music-core/src/audio/index.ts'),
      '@jazz/music-core/*': r('./packages/music-core/src/*'),
      '@jazz/music-core': r('./packages/music-core/src/index.ts'),
      '@jazz/tone-audio-adapter': r('./packages/adapters/tone-audio-adapter/src/index.ts'),
      '@jazz/webmidi-adapter': r('./packages/adapters/webmidi-adapter/src/index.ts'),
      '@jazz/plugin-sdk': r('./packages/plugin-sdk/src/index.ts'),
      '@jazz/ui': r('./packages/ui/src/index.ts'),
      '@jazz/plugin-core-editor': r('./packages/plugins/core-editor/src/index.ts'),
      '@jazz/plugin-core-player': r('./packages/plugins/core-player/src/index.ts'),
      '@jazz/plugin-catalog': r('./packages/plugins/catalog/src/index.ts'),
      '@jazz/plugin-template': r('./packages/plugins/_template/src/index.ts'),
      '@jazz/plugin-theory-scales': r('./packages/plugins/theory-scales/src/index.ts'),
      '@jazz/plugin-theory-chords': r('./packages/plugins/theory-chords/src/index.ts'),
      '@jazz/plugin-theory-intervals': r('./packages/plugins/theory-intervals/src/index.ts'),
      '@jazz/plugin-ear-training': r('./packages/plugins/ear-training/src/index.ts'),
      '@jazz/plugin-rhythm-drills': r('./packages/plugins/rhythm-drills/src/index.ts'),
      '@jazz/plugin-chord-quiz': r('./packages/plugins/chord-quiz/src/index.ts'),
      '@jazz/plugin-progression-recognition': r(
        './packages/plugins/progression-recognition/src/index.ts',
      ),
      '@jazz/plugin-admin-users': r('./packages/plugins/admin-users/src/index.ts'),
      '@jazz/plugin-admin-content': r('./packages/plugins/admin-content/src/index.ts'),
      '@jazz/plugin-admin-flags': r('./packages/plugins/admin-flags/src/index.ts'),
      '@jazz/plugin-admin-assets': r('./packages/plugins/admin-assets/src/index.ts'),
      '@jazz/plugin-admin-diagnostics': r('./packages/plugins/admin-diagnostics/src/index.ts'),
      '@jazz/plugin-practice-cards': r('./packages/plugins/practice-cards/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['packages/**/src/**/*.test.ts', 'apps/api/**/*.test.ts'],
    globals: true,
  },
});
