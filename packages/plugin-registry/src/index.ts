import type { PluginDefinition } from '@jazz/plugin-sdk';
import coreEditor from '@jazz/plugin-core-editor';
import corePlayer from '@jazz/plugin-core-player';
import catalog from '@jazz/plugin-catalog';

export const PLUGINS: PluginDefinition[] = [coreEditor, corePlayer, catalog];
