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
      '@jazz/plugin-admin-catalog': r('./packages/plugins/admin-catalog/src/index.ts'),
      '@jazz/plugin-template': r('./packages/plugins/_template/src/index.ts'),
      '@jazz/plugin-theory-approach-notes': r(
        './packages/plugins/theory/theory-approach-notes/src/index.ts',
      ),
      '@jazz/plugin-theory-scales': r('./packages/plugins/theory/theory-scales/src/index.ts'),
      '@jazz/plugin-theory-chords': r('./packages/plugins/theory/theory-chords/src/index.ts'),
      '@jazz/plugin-theory-intervals': r('./packages/plugins/theory/theory-intervals/src/index.ts'),
      '@jazz/plugin-ear-training': r('./packages/plugins/ear-training/src/index.ts'),
      '@jazz/plugin-rhythm-drills': r('./packages/plugins/rhythm-drills/src/index.ts'),
      '@jazz/plugin-chord-quiz': r('./packages/plugins/chord-quiz/src/index.ts'),
      '@jazz/plugin-progression-recognition': r(
        './packages/plugins/progression-recognition/src/index.ts',
      ),
      '@jazz/plugin-admin-users': r('./packages/plugins/admin-users/src/index.ts'),
      '@jazz/plugin-admin-roles': r('./packages/plugins/admin-roles/src/index.ts'),
      '@jazz/plugin-admin-content': r('./packages/plugins/admin-content/src/index.ts'),
      '@jazz/plugin-admin-flags': r('./packages/plugins/admin-flags/src/index.ts'),
      '@jazz/plugin-admin-assets': r('./packages/plugins/admin-assets/src/index.ts'),
      '@jazz/plugin-admin-diagnostics': r('./packages/plugins/admin-diagnostics/src/index.ts'),
      '@jazz/plugin-admin-drum-constructor': r(
        './packages/plugins/admin-drum-constructor/src/index.ts',
      ),
      '@jazz/plugin-admin-percussion-constructor': r(
        './packages/plugins/admin-percussion-constructor/src/index.ts',
      ),
      '@jazz/plugin-admin-piano-constructor': r(
        './packages/plugins/admin-piano-constructor/src/index.ts',
      ),
      '@jazz/plugin-admin-bass-constructor': r(
        './packages/plugins/admin-bass-constructor/src/index.ts',
      ),
      '@jazz/plugin-admin-rhodes-constructor': r(
        './packages/plugins/admin-rhodes-constructor/src/index.ts',
      ),
      '@jazz/plugin-admin-constructor-shared': r(
        './packages/plugins/admin-constructor-shared/src/index.ts',
      ),
      '@jazz/plugin-jazz-drum-kit': r('./packages/plugins/instruments/jazz-drum-kit/src/index.ts'),
      '@jazz/plugin-funk-drum-kit': r('./packages/plugins/instruments/funk-drum-kit/src/index.ts'),
      '@jazz/plugin-percussion': r('./packages/plugins/instruments/percussion/src/index.ts'),
      '@jazz/plugin-metronome': r('./packages/plugins/instruments/metronome/src/index.ts'),
      '@jazz/plugin-upright-piano': r('./packages/plugins/instruments/upright-piano/src/index.ts'),
      '@jazz/plugin-bass': r('./packages/plugins/instruments/bass/src/index.ts'),
      '@jazz/plugin-rhodes': r('./packages/plugins/instruments/rhodes/src/index.ts'),
      '@jazz/plugin-theory-chord-tones': r(
        './packages/plugins/theory/theory-chord-tones/src/index.ts',
      ),
      '@jazz/plugin-theory-arpeggios': r('./packages/plugins/theory/theory-arpeggios/src/index.ts'),
      '@jazz/plugin-theory-blues': r('./packages/plugins/theory/theory-blues/src/index.ts'),
      '@jazz/plugin-practice-cards': r('./packages/plugins/practice-cards/src/index.ts'),
      '@jazz/plugin-theory-rhythm': r('./packages/plugins/theory/theory-rhythm/src/index.ts'),
      '@jazz/plugin-theory-groove': r('./packages/plugins/theory/theory-groove/src/index.ts'),
      '@jazz/plugin-theory-ii-v-i': r('./packages/plugins/theory/theory-ii-v-i/src/index.ts'),
      '@jazz/plugin-theory-scales-jazz': r(
        './packages/plugins/theory/theory-scales-jazz/src/index.ts',
      ),
      '@jazz/plugin-theory-voicings': r('./packages/plugins/theory/theory-voicings/src/index.ts'),
      '@jazz/plugin-theory-voice-leading': r(
        './packages/plugins/theory/theory-voice-leading/src/index.ts',
      ),
      '@jazz/plugin-theory-diminished-harmony': r(
        './packages/plugins/theory/theory-diminished-harmony/src/index.ts',
      ),
      '@jazz/plugin-theory-coltrane-changes': r(
        './packages/plugins/theory/theory-coltrane-changes/src/index.ts',
      ),
      '@jazz/plugin-theory-blues-advanced': r(
        './packages/plugins/theory/theory-blues-advanced/src/index.ts',
      ),
      '@jazz/plugin-theory-rhythm-changes': r(
        './packages/plugins/theory/theory-rhythm-changes/src/index.ts',
      ),
      '@jazz/plugin-theory-modal-interchange': r(
        './packages/plugins/theory/theory-modal-interchange/src/index.ts',
      ),
      '@jazz/plugin-theory-secondary-dominants': r(
        './packages/plugins/theory/theory-secondary-dominants/src/index.ts',
      ),
      '@jazz/plugin-theory-tritone-sub': r(
        './packages/plugins/theory/theory-tritone-sub/src/index.ts',
      ),
      '@jazz/plugin-theory-turnarounds': r(
        './packages/plugins/theory/theory-turnarounds/src/index.ts',
      ),
      '@jazz/plugin-theory-catalog': r('./packages/plugins/theory/theory-catalog/src/index.ts'),
      '@jazz/plugin-visual-midi-keyboard': r(
        './packages/plugins/visual-midi-keyboard/src/index.ts',
      ),
      '@jazz/plugin-core-settings': r('./packages/plugins/core-settings/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'packages/**/src/**/*.test.ts',
      'packages/**/src/**/*.test.tsx',
      'apps/api/**/*.test.ts',
    ],
    globals: true,
  },
});
