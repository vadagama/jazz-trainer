import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': r('./src'),
      '@jazz/shared': r('../../packages/shared/src/index.ts'),
      '@jazz/music-core': r('../../packages/music-core/src'),
      '@jazz/ui': r('../../packages/ui/src/index.ts'),
      '@jazz/plugin-sdk': r('../../packages/plugin-sdk/src/index.ts'),
      '@jazz/plugin-core-editor': r('../../packages/plugins/core-editor/src/index.ts'),
      '@jazz/plugin-core-player': r('../../packages/plugins/core-player/src/index.ts'),
      '@jazz/plugin-catalog': r('../../packages/plugins/catalog/src/index.ts'),
      '@jazz/plugin-admin-users': r('../../packages/plugins/admin-users/src/index.ts'),
      '@jazz/plugin-admin-content': r('../../packages/plugins/admin-content/src/index.ts'),
      '@jazz/plugin-admin-flags': r('../../packages/plugins/admin-flags/src/index.ts'),
      '@jazz/plugin-admin-assets': r('../../packages/plugins/admin-assets/src/index.ts'),
      '@jazz/plugin-admin-diagnostics': r('../../packages/plugins/admin-diagnostics/src/index.ts'),
      '@jazz/plugin-theory-chord-tones': r(
        '../../packages/plugins/theory-chord-tones/src/index.ts',
      ),
      '@jazz/plugin-theory-approach-notes': r(
        '../../packages/plugins/theory-approach-notes/src/index.ts',
      ),
      '@jazz/plugin-practice-cards': r('../../packages/plugins/practice-cards/src/index.ts'),
      '@jazz/plugin-theory-rhythm': r('../../packages/plugins/theory-rhythm/src/index.ts'),
      '@jazz/plugin-theory-groove': r('../../packages/plugins/theory-groove/src/index.ts'),
      '@jazz/plugin-theory-arpeggios': r('../../packages/plugins/theory-arpeggios/src/index.ts'),
      '@jazz/plugin-theory-blues': r('../../packages/plugins/theory-blues/src/index.ts'),
      '@jazz/plugin-theory-ii-v-i': r('../../packages/plugins/theory-ii-v-i/src/index.ts'),
      '@jazz/plugin-theory-scales-jazz': r(
        '../../packages/plugins/theory-scales-jazz/src/index.ts',
      ),
      '@jazz/plugin-theory-voicings': r('../../packages/plugins/theory-voicings/src/index.ts'),
      '@jazz/plugin-theory-voice-leading': r(
        '../../packages/plugins/theory-voice-leading/src/index.ts',
      ),
      '@jazz/plugin-theory-diminished-harmony': r(
        '../../packages/plugins/theory-diminished-harmony/src/index.ts',
      ),
      '@jazz/plugin-theory-coltrane-changes': r(
        '../../packages/plugins/theory-coltrane-changes/src/index.ts',
      ),
      '@jazz/plugin-theory-blues-advanced': r(
        '../../packages/plugins/theory-blues-advanced/src/index.ts',
      ),
      '@jazz/plugin-theory-rhythm-changes': r(
        '../../packages/plugins/theory-rhythm-changes/src/index.ts',
      ),
      '@jazz/plugin-theory-modal-interchange': r(
        '../../packages/plugins/theory-modal-interchange/src/index.ts',
      ),
      '@jazz/plugin-theory-secondary-dominants': r(
        '../../packages/plugins/theory-secondary-dominants/src/index.ts',
      ),
      '@jazz/plugin-theory-tritone-sub': r(
        '../../packages/plugins/theory-tritone-sub/src/index.ts',
      ),
      '@jazz/plugin-theory-turnarounds': r(
        '../../packages/plugins/theory-turnarounds/src/index.ts',
      ),
      '@jazz/plugin-theory-catalog': r('../../packages/plugins/theory-catalog/src/index.ts'),
      '@jazz/plugin-visual-midi-keyboard': r(
        '../../packages/plugins/visual-midi-keyboard/src/index.ts',
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3999',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
