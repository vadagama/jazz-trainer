import { definePlugin } from '@jazz/plugin-sdk';
import { uprightBassManifest, electricBassManifest } from './manifest.js';

export { uprightBassManifest, electricBassManifest } from './manifest.js';
export {
  UPRIGHT_BASS_LAYERS,
  ELECTRIC_BASS_LAYERS,
  UPRIGHT_BASS_ARTICULATIONS,
  ELECTRIC_BASS_ARTICULATIONS,
  UPRIGHT_BASS_SAMPLER_BASE_URL,
  ELECTRIC_BASS_SAMPLER_BASE_URL,
} from './sampleRegistry.js';

// The bass pattern engine (molecules/cells/organisms) lives entirely in
// @jazz/music-core — import BassPatternEngine, UPRIGHT_BASS_MOLECULES, etc.
// from there directly. See docs/BASS.md.

export default definePlugin({
  manifest: {
    id: 'instrument.bass',
    name: 'Bass',
    apiVersion: 1 as const,
    category: 'core' as const,
    description:
      'Bass section — upright (Sneakybass pluck/mute, swing/bossa/ballad) + electric (darkblack reg/stac/rel/ghost, funk/latin). Pattern-engine driven.',
  },
  contributes: {
    instruments: [{ manifest: uprightBassManifest }, { manifest: electricBassManifest }],
  },
});
