import type { PluginDefinition } from '@jazz/plugin-sdk';
import coreEditor from '@jazz/plugin-core-editor';
import corePlayer from '@jazz/plugin-core-player';
import catalog from '@jazz/plugin-catalog';
import adminUsers from '@jazz/plugin-admin-users';
import adminContent from '@jazz/plugin-admin-content';
import adminFlags from '@jazz/plugin-admin-flags';
import adminAssets from '@jazz/plugin-admin-assets';
import adminDiagnostics from '@jazz/plugin-admin-diagnostics';

export const PLUGINS: PluginDefinition[] = [
  coreEditor,
  corePlayer,
  catalog,
  adminUsers,
  adminContent,
  adminFlags,
  adminAssets,
  adminDiagnostics,
];
