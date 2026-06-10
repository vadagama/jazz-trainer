export type ActivityType = 'lesson' | 'exercise' | 'assessment';

export interface ActivityState<T = unknown> {
  status: 'idle' | 'active' | 'paused' | 'completed';
  data: T;
  result?: ActivityResult;
}

export interface ActivityResult {
  score?: number;
  maxScore?: number;
  durationMs?: number;
  details?: Record<string, unknown>;
}

export interface ActivityDefinition<T = unknown> {
  id: string;
  type: ActivityType;
  start: (ctx: unknown) => ActivityState<T>;
  evaluate: (state: ActivityState<T>, answer: unknown) => ActivityResult;
  report: (state: ActivityState<T>) => ActivityResult;
}
