import { definePlugin } from '@jazz/plugin-sdk';

export { HarmonyGrid, PlayerToolbar } from '@jazz/ui';
export { BarEditor } from './components/BarEditor';
export { BarCard } from './components/BarCard';
export { ChordChip } from './components/ChordChip';
export { ChordPalette } from './components/ChordPalette';
export { DslModal } from './components/DslModal';
export { GeneratorModal } from './components/GeneratorModal';
export { PropertiesPanel } from './components/PropertiesPanel';

export default definePlugin({
  manifest: {
    id: 'core.editor',
    name: 'Grid Editor',
    apiVersion: 1,
    category: 'core',
    description: 'Harmony grid editor with DSL support.',
  },
  contributes: {
    routes: [{ path: '/grids/:id', element: () => import('./EditorPage') }],
    navItems: [{ section: 'create', label: 'Editor', to: '/grids/new', icon: 'edit' }],
  },
});
