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
