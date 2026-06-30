import { definePlugin } from '@jazz/plugin-sdk';

export { MidiLog, type MidiLogProps } from './MidiLog';
export { MidiIndicator, type MidiIndicatorProps } from './MidiIndicator';

export default definePlugin({
  manifest: {
    id: 'visual.midi-keyboard',
    name: 'MIDI Visualizer',
    apiVersion: 1,
    category: 'play',
    description: 'Виртуальная MIDI-клавиатура и индикатор игры.',
  },
  contributes: {
    routes: [
      {
        path: '/midi-keyboard',
        element: () => import('./MidiKeyboardPage'),
      },
    ],
    navItems: [
      {
        section: 'play',
        label: 'MIDI Keyboard',
        to: '/midi-keyboard',
        icon: 'piano',
      },
    ],
    commands: [
      {
        id: 'midi-keyboard.toggle',
        label: 'Toggle MIDI Keyboard',
        run: (ctx: unknown) => {
          (ctx as { navigation: { navigate: (path: string) => void } }).navigation.navigate(
            '/midi-keyboard',
          );
        },
      },
    ],
  },
});
