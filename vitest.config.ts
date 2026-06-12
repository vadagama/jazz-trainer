import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': r('./apps/web/src'),
      '@jazz/shared': r('./packages/shared/src/index.ts'),
      '@jazz/music-core': r('./packages/music-core/src/index.ts'),
      '@jazz/music-core/audio': r('./packages/music-core/src/audio/index.ts'),
      '@jazz/music-core/*': r('./packages/music-core/src/*'),
      '@jazz/tone-audio-adapter': r('./packages/adapters/tone-audio-adapter/src/index.ts'),
      '@jazz/plugin-sdk': r('./packages/plugin-sdk/src/index.ts'),
      '@jazz/ui': r('./packages/ui/src/index.ts'),
      '@jazz/plugin-core-editor': r('./packages/plugins/core-editor/src/index.ts'),
      '@jazz/plugin-core-player': r('./packages/plugins/core-player/src/index.ts'),
      '@jazz/plugin-catalog': r('./packages/plugins/catalog/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['packages/**/src/**/*.test.ts', 'apps/api/**/*.test.ts'],
    globals: true,
  },
});
