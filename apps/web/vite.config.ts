import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': r('./src'),
      '@jazz/shared': r('../../packages/shared/src/index.ts'),
      '@jazz/music-core': r('../../packages/music-core/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
});
