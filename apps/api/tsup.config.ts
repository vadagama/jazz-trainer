import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // Bundle workspace packages (they ship TS source, not compiled JS).
  noExternal: [/^@jazz\//],
  // Native modules must stay external.
  external: ['better-sqlite3', '@libsql/client'],
});
