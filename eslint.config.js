import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import boundaries from 'eslint-plugin-boundaries';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/.vite/**',
      '**/.claude/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // Browser globals + React rules for the web app
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  // Test files
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // =====================================================================
  // Архитектурные границы (eslint-plugin-boundaries)
  // =====================================================================

  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'packages/music-core', pattern: 'packages/music-core/*' },
        { type: 'packages/shared', pattern: 'packages/shared/*' },
        { type: 'packages/plugin-sdk', pattern: 'packages/plugin-sdk/*' },
        { type: 'packages/plugin-host', pattern: 'packages/plugin-host/*' },
        { type: 'packages/ui', pattern: 'packages/ui/*' },
        { type: 'packages/plugins', pattern: 'packages/plugins/*' },
        { type: 'packages/adapters', pattern: 'packages/adapters/**/*' },
        { type: 'apps/web', pattern: 'apps/web/*' },
        { type: 'apps/api', pattern: 'apps/api/*' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              from: 'packages/music-core',
              allow: ['packages/music-core', 'packages/shared'],
            },
            {
              from: 'packages/shared',
              allow: ['packages/shared'],
            },
            {
              from: 'packages/plugin-sdk',
              allow: ['packages/plugin-sdk', 'packages/music-core', 'packages/shared'],
            },
            {
              from: 'packages/plugin-host',
              allow: [
                'packages/plugin-host',
                'packages/plugin-sdk',
                'packages/music-core',
                'packages/shared',
              ],
            },
            {
              from: 'packages/plugins',
              allow: [
                'packages/plugin-sdk',
                'packages/music-core',
                'packages/shared',
                'packages/ui',
              ],
            },
            {
              from: 'packages/ui',
              allow: [
                'packages/ui',
                'packages/plugin-sdk',
                'packages/music-core',
                'packages/shared',
              ],
            },
            {
              from: 'packages/adapters',
              allow: ['packages/plugin-sdk', 'packages/music-core', 'packages/shared'],
            },
            {
              from: 'apps/web',
              allow: [
                'apps/web',
                'packages/plugin-host',
                'packages/plugin-sdk',
                'packages/music-core',
                'packages/shared',
                'packages/ui',
              ],
            },
            {
              from: 'apps/api',
              allow: ['apps/api', 'packages/music-core', 'packages/shared'],
            },
          ],
        },
      ],
    },
  },

  // =====================================================================
  // eslint-plugin-import: запрет нежелательных путей
  // =====================================================================

  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  {
    settings: {
      'import/resolver': {
        typescript: {
          project: [
            'tsconfig.base.json',
            'apps/web/tsconfig.json',
            'apps/api/tsconfig.json',
            'packages/music-core/tsconfig.json',
            'packages/shared/tsconfig.json',
            'packages/adapters/tone-audio-adapter/tsconfig.json',
          ],
          noWarnOnMultipleProjects: true,
        },
        node: true,
      },
    },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './packages/music-core',
              from: './apps',
            },
            {
              target: './packages/shared',
              from: './apps',
            },
            {
              target: './packages/plugins',
              from: './apps/web/src/shell',
              message: 'Плагины не могут импортировать shell',
            },
            {
              target: './packages/plugins',
              from: './apps/web/src',
              message:
                'Плагины не могут импортировать внутренности apps/web. Используй @jazz/plugin-sdk, @jazz/music-core, @jazz/shared или @jazz/ui.',
            },
            {
              target: './packages/adapters',
              from: './apps/web/src',
              message: 'Адаптеры не могут импортировать внутренности apps/web.',
            },
          ],
        },
      ],
    },
  },
);
