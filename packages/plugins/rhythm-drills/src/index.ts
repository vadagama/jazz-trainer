import { definePlugin } from '@jazz/plugin-sdk';

export { RhythmDrillsPage } from './RhythmDrillsPage';
export { useMidiInput, useMidiEventBuffer } from './hooks/useMidiInput';
export {
  createRhythmMatchActivity,
  type RhythmMatchState,
  type RhythmMatchOptions,
} from './activities/rhythmMatch';

export default definePlugin({
  manifest: {
    id: 'practice.rhythm-drills',
    name: 'Rhythm Drills',
    apiVersion: 1,
    category: 'practice',
    description: 'Rhythm training exercises with MIDI tap input.',
  },
  contributes: {
    routes: [{ path: '/rhythm-drills', element: () => import('./RhythmDrillsPage') }],
    navItems: [{ section: 'practice', label: 'Rhythm Drills', to: '/rhythm-drills', icon: 'drum' }],
  },
});
