import { definePlugin } from '@jazz/plugin-sdk';

export { useMidiConnection, type UseMidiConnectionResult } from '@jazz/plugin-sdk';
export { MidiIndicator, type MidiIndicatorProps } from '@jazz/ui';
export { SoloInstrumentSelector, type SoloInstrumentSelectorProps } from '@jazz/ui';
export { SoloVolumeSlider, type SoloVolumeSliderProps } from '@jazz/ui';
export { DuckingToggle, type DuckingToggleProps } from '@jazz/ui';
export { MidiDeviceSelector, type MidiDeviceSelectorProps } from '@jazz/ui';
export { SoloInstrumentHost } from '@jazz/music-core/audio';

export default definePlugin({
  manifest: {
    id: 'core.player',
    name: 'Player',
    apiVersion: 1,
    category: 'play',
    description: 'Read-only grid player for public compositions.',
  },
  contributes: {
    routes: [
      { path: '/play', element: () => import('./PlayerPage') },
      { path: '/play/:id', element: () => import('./PlayerPage') },
    ],
  },
});
