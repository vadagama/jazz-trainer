import { definePlugin } from '@jazz/plugin-sdk';

export { EarTrainingPage } from './EarTrainingPage';
export { useMidiInput, useMidiEventBuffer } from './hooks/useMidiInput';
export {
  createIntervalRecognitionActivity,
  type IntervalRecognitionState,
  type IntervalRecognitionOptions,
} from './activities/intervalRecognition';

export default definePlugin({
  manifest: {
    id: 'practice.ear-training',
    name: 'Ear Training',
    apiVersion: 1,
    category: 'practice',
    description: 'Interval and pitch recognition exercises with MIDI input.',
  },
  contributes: {
    routes: [{ path: '/ear-training', element: () => import('./EarTrainingPage') }],
    navItems: [
      { section: 'practice', label: 'Ear Training', to: '/ear-training', icon: 'music' },
    ],
  },
});
