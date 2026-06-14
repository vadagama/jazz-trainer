import { definePlugin } from '@jazz/plugin-sdk';

// ---------------------------------------------------------------------------
// Template Plugin — эталонный плагин для копирования.
//
// Скопируй эту директорию, замени контент и зарегистрируй в
// packages/plugin-registry/src/index.ts одной строкой.
//
// Ниже показаны ВСЕ возможные типы вкладов (contribution points).
// Раскомментируй нужные и удали ненужные.
// ---------------------------------------------------------------------------

export default definePlugin({
  manifest: {
    id: 'template', // уникальный ID, например 'theory.scales'
    name: 'Template', // читаемое имя
    apiVersion: 1 as const, // версия API плагинов
    category: 'theory' as const, // 'theory' | 'technique' | 'play' | 'assess' | 'core' | 'admin'
    description: 'Template plugin — copy me to start a new domain plugin.',
    // enabled: false,            // можно отключить плагин, не удаляя его
  },

  contributes: {
    // ── Маршруты ──────────────────────────────────────────────────────────
    routes: [
      { path: '/template', element: () => import('./TemplatePage') },
      // { path: '/scales',          element: () => import('./ScalesPage') },
      // { path: '/scales/:id',      element: () => import('./ScaleDetailPage') },
      // { path: '/admin/example',   element: () => import('./AdminPage'), requires: 'admin:read' },
    ],

    // ── Навигация ─────────────────────────────────────────────────────────
    navItems: [
      { section: 'learn', label: 'Template', to: '/template', icon: 'book-open' },
      // { section: 'learn',   label: 'Scales',       to: '/scales',       icon: 'music' },
      // { section: 'admin',   label: 'Example Admin', to: '/admin/example', icon: 'shield', requires: 'admin:read' },
      //
      // Секции: 'main', 'create', 'learn', 'practice', 'admin'
    ],

    // ── Команды (горячие клавиши / command palette) ──────────────────────
    // commands: [
    //   { id: 'template.hello', label: 'Say Hello', run: (ctx) => console.log('Hello from template!') },
    //   { id: 'template.admin', label: 'Admin Action', requires: 'admin:write', run: async (ctx) => { /* ... */ } },
    // ],

    // ── Уроки (Activities) ────────────────────────────────────────────────
    // lessons: [
    //   { id: 'template.intro', type: 'lesson' as const },
    // ],

    // ── Упражнения ────────────────────────────────────────────────────────
    // exercises: [
    //   { id: 'template.drill', type: 'exercise' as const },
    // ],

    // ── Оценивание / квизы ────────────────────────────────────────────────
    // assessments: [
    //   { id: 'template.quiz', type: 'assessment' as const },
    // ],

    // ── Инструменты (instruments) ─────────────────────────────────────────
    // instruments: [
    //   { id: 'template.metronome', name: 'Metronome', component: () => import('./Metronome') },
    // ],

    // ── Генераторы (генерация упражнений, аккордов и т.д.) ───────────────
    // generators: [
    //   { id: 'template.random', name: 'Random Generator', generate: () => ({ note: 'C4' }) },
    // ],

    // ── Поставщики теории (theory providers) ──────────────────────────────
    // theoryProviders: [
    //   { id: 'template.theory', name: 'Theory Provider', getScale: (root: string) => ({}), getChord: (root: string) => ({}), getIntervals: () => [] },
    // ],

    // ── Схема настроек (для плагина) ──────────────────────────────────────
    // settingsSchema: {
    //   tempo: { type: 'number', default: 120, min: 40, max: 300, label: 'Tempo (BPM)' },
    //   volume: { type: 'number', default: 0.8, min: 0, max: 1, step: 0.1, label: 'Volume' },
    // },
  },

  // ── setup / dispose (опционально) ───────────────────────────────────────
  // setup(ctx) {
  //   // Вызывается при активации плагина. Можно подписаться на события,
  //   // инициализировать сервисы и т.д.
  //   const unsub = ctx.events.on('playback:start', () => console.log('Started!'));
  // },
  //
  // dispose() {
  //   // Вызывается при деактивации. Отписки, очистка ресурсов.
  // },
});
