import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@jazz/shared': r('./packages/shared/src/index.ts'),
      '@jazz/music-core': r('./packages/music-core/src/index.ts'),
      '@jazz/music-core/audio': r('./packages/music-core/src/audio/index.ts'),
      '@jazz/music-core/*': r('./packages/music-core/src/*'),
      '@jazz/tone-audio-adapter': r('./packages/adapters/tone-audio-adapter/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['packages/**/src/**/*.test.ts', 'apps/api/**/*.test.ts'],
    globals: true,
  },
});
