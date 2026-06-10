export interface RouteContribution {
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  element: () => Promise<any>; // lazy import of a route component
  requires?: string; // permission (для фазы R)
}

export interface NavItemContribution {
  section: string;
  label: string;
  to: string;
  icon?: string;
  requires?: string;
}

export interface CommandContribution {
  id: string;
  label: string;
  requires?: string;
  run: (ctx: unknown) => void | Promise<void>;
}

export interface ActivityContribution {
  id: string;
  type: 'lesson' | 'exercise' | 'assessment';
}

export interface PluginContributions {
  routes?: RouteContribution[];
  navItems?: NavItemContribution[];
  commands?: CommandContribution[];
  lessons?: ActivityContribution[];
  exercises?: ActivityContribution[];
  assessments?: ActivityContribution[];
  instruments?: unknown[];
  generators?: unknown[];
  theoryProviders?: unknown[];
  settingsSchema?: Record<string, unknown>;
}
