import type { PercussionSound } from './percussionPatternTypes.js';

// ─── Types ─────────────────────────────────────────────────────────────────

/** A single percussion step within a pattern. */
export interface PercussionStep {
  /** Step index (0-based within the full pattern, e.g. 0..31 for 2-bar × 16 steps). */
  step: number;
  /** Percussion sound to play. */
  sound: PercussionSound;
  /** Velocity 0..1 (will be scaled by the sound's volume setting at runtime). */
  velocity: number;
  /** Duration in steps (default 1). Used for guiro swipes, belltree glissandi, etc. */
  length?: number;
}

export type PercussionDensity = 'low' | 'medium' | 'high';

/**
 * A data-driven percussion pattern definition.
 *
 * Steps are defined on a grid of `stepsPerBar` subdivisions per bar,
 * spanning `bars` bars. At runtime the engine converts steps → ticks
 * and scales velocity by the sound's per-sound volume setting.
 */
export interface PercussionPatternDef {
  /** Unique pattern ID (kebab-case, prefixed with style). */
  id: string;
  /** Musical style this pattern belongs to. */
  style: string;
  /** Human-readable name. */
  name: string;
  /** Short description of the texture and use case. */
  description: string;
  /** Number of bars in the pattern cycle. */
  bars: number;
  /** Grid resolution: subdivisions per bar (16 = 16th notes). */
  stepsPerBar: number;
  /** Suggested tempo range in BPM (informational). */
  defaultTempoRange: [number, number];
  /** Approximate density / busyness. */
  density: PercussionDensity;
  /** Steps (absolute indices across all bars: 0 .. bars × stepsPerBar - 1). */
  sounds: PercussionStep[];
}

// ─── Bossa Patterns ────────────────────────────────────────────────────────

/**
 * 1. Classic Bossa Shaker + Clave
 *
 * Базовый мягкий bossa texture: шейкер держит пульсацию восьмыми,
 * clave даёт узнаваемый двухтактовый рисунок 3-2 son clave.
 * Лёгкие conga answers добавляют тембральной глубины.
 */
export const bossaClassicShakerClave: PercussionPatternDef = {
  id: 'bossa-classic-shaker-clave',
  style: 'bossa',
  name: 'Classic Bossa Shaker + Clave',
  description: 'Мягкий шейкер на восьмых с 3-2 clave и легкими conga answers.',
  bars: 2,
  stepsPerBar: 16,
  defaultTempoRange: [120, 165],
  density: 'medium',
  sounds: [
    // shaker eighths — steady pulse, accent on downbeats
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((step) => ({
      step,
      sound: 'shaker' as const,
      velocity: step % 8 === 0 ? 0.58 : 0.38,
    })),

    // 3-2 son clave
    { step: 0, sound: 'clave' as const, velocity: 0.78 },
    { step: 6, sound: 'clave' as const, velocity: 0.62 },
    { step: 10, sound: 'clave' as const, velocity: 0.7 },
    { step: 16, sound: 'clave' as const, velocity: 0.72 },
    { step: 24, sound: 'clave' as const, velocity: 0.64 },

    // conga color — soft answers between clave hits
    { step: 7, sound: 'congaHigh' as const, velocity: 0.42 },
    { step: 15, sound: 'congaLow' as const, velocity: 0.52 },
    { step: 23, sound: 'congaHigh' as const, velocity: 0.38 },
    { step: 31, sound: 'congaLow' as const, velocity: 0.48 },
  ],
};

/**
 * 2. Soft Bossa Texture
 *
 * Более воздушный вариант для ballad/bossa, без плотной clave.
 * Лёгкий шейкер, guiro swipes и редкие triangle accents.
 */
export const bossaSoftTexture: PercussionPatternDef = {
  id: 'bossa-soft-texture',
  style: 'bossa',
  name: 'Soft Bossa Texture',
  description: 'Легкий шейкер, guiro swipes и редкие triangle accents.',
  bars: 2,
  stepsPerBar: 16,
  defaultTempoRange: [95, 135],
  density: 'low',
  sounds: [
    // shaker — gentle, barely there
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((step) => ({
      step,
      sound: 'shaker' as const,
      velocity: step % 8 === 0 ? 0.45 : 0.28,
    })),

    // guiro swipes — once per 2 beats, length=2 = scrape feel
    { step: 5, sound: 'guiro' as const, velocity: 0.32, length: 2 },
    { step: 13, sound: 'guiro' as const, velocity: 0.28, length: 2 },
    { step: 21, sound: 'guiro' as const, velocity: 0.34, length: 2 },
    { step: 29, sound: 'guiro' as const, velocity: 0.3, length: 2 },

    // triangle — delicate sparkle on downbeats
    { step: 0, sound: 'triangle' as const, velocity: 0.38 },
    { step: 16, sound: 'triangle' as const, velocity: 0.34 },

    // congaLow — soft punctuation at phrase ends
    { step: 15, sound: 'congaLow' as const, velocity: 0.38 },
    { step: 31, sound: 'congaLow' as const, velocity: 0.34 },
  ],
};

/**
 * 3. Rio Conga Bossa
 *
 * Conga-driven bossa pattern с чередованием high/low conga.
 * Больше conga-фразировки, хорошо ложится поверх bd/clave/hat.
 */
export const bossaRioConga: PercussionPatternDef = {
  id: 'bossa-rio-conga',
  style: 'bossa',
  name: 'Rio Conga Bossa',
  description: 'Conga-driven bossa pattern с чередованием high/low conga.',
  bars: 2,
  stepsPerBar: 16,
  defaultTempoRange: [125, 170],
  density: 'medium',
  sounds: [
    // shaker — accent on quarter notes
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((step) => ({
      step,
      sound: 'shaker' as const,
      velocity: step % 4 === 0 ? 0.46 : 0.3,
    })),

    // conga high/low — active call-and-response phrasing
    { step: 3, sound: 'congaHigh' as const, velocity: 0.42 },
    { step: 6, sound: 'congaHigh' as const, velocity: 0.58 },
    { step: 8, sound: 'congaLow' as const, velocity: 0.5 },
    { step: 11, sound: 'congaHigh' as const, velocity: 0.36 },
    { step: 15, sound: 'congaLow' as const, velocity: 0.62 },

    { step: 19, sound: 'congaHigh' as const, velocity: 0.4 },
    { step: 22, sound: 'congaHigh' as const, velocity: 0.56 },
    { step: 24, sound: 'congaLow' as const, velocity: 0.48 },
    { step: 27, sound: 'congaHigh' as const, velocity: 0.34 },
    { step: 31, sound: 'congaLow' as const, velocity: 0.58 },

    // clave — light reference accents
    { step: 0, sound: 'clave' as const, velocity: 0.48 },
    { step: 10, sound: 'clave' as const, velocity: 0.42 },
    { step: 24, sound: 'clave' as const, velocity: 0.44 },
  ],
};

/**
 * 4. Cabasa Bossa Pulse
 *
 * Cabasa вместо shaker — более металлическая, плотная текстура.
 * Мягкая conga и triangle sparkle добавляют глубины.
 */
export const bossaCabasaPulse: PercussionPatternDef = {
  id: 'bossa-cabasa-pulse',
  style: 'bossa',
  name: 'Cabasa Bossa Pulse',
  description: 'Cabasa pattern с мягкой conga и triangle sparkle.',
  bars: 2,
  stepsPerBar: 16,
  defaultTempoRange: [115, 155],
  density: 'medium',
  sounds: [
    // cabasa — all 16ths, accent on quarters, lighter on e's and a's
    ...Array.from({ length: 32 }, (_, step) => ({
      step,
      sound: 'cabasa' as const,
      velocity: step % 4 === 0 ? 0.46 : step % 2 === 0 ? 0.34 : 0.2,
    })),

    // conga — balanced call-and-response
    { step: 4, sound: 'congaHigh' as const, velocity: 0.36 },
    { step: 7, sound: 'congaLow' as const, velocity: 0.52 },
    { step: 12, sound: 'congaHigh' as const, velocity: 0.42 },
    { step: 15, sound: 'congaLow' as const, velocity: 0.58 },

    { step: 20, sound: 'congaHigh' as const, velocity: 0.34 },
    { step: 23, sound: 'congaLow' as const, velocity: 0.5 },
    { step: 28, sound: 'congaHigh' as const, velocity: 0.4 },
    { step: 31, sound: 'congaLow' as const, velocity: 0.54 },

    // triangle — gentle sparkle
    { step: 0, sound: 'triangle' as const, velocity: 0.3 },
    { step: 18, sound: 'triangle' as const, velocity: 0.26 },
  ],
};

/**
 * 5. Guiro Brush Bossa
 *
 * Гуиро как основной «скребущий» слой, подходит для камерного bossa/jazz.
 * Редкая clave и лёгкая shaker подложка.
 */
export const bossaGuiroBrush: PercussionPatternDef = {
  id: 'bossa-guiro-brush',
  style: 'bossa',
  name: 'Guiro Brush Bossa',
  description: 'Guiro strokes с редкой clave и легкой shaker подложкой.',
  bars: 2,
  stepsPerBar: 16,
  defaultTempoRange: [105, 145],
  density: 'medium',
  sounds: [
    // guiro — primary texture, on eighth downbeats
    ...[0, 4, 8, 12, 16, 20, 24, 28].map((step) => ({
      step,
      sound: 'guiro' as const,
      velocity: 0.42,
      length: 2,
    })),

    // shaker — sparse, only on offbeat eighths
    ...[2, 6, 10, 14, 18, 22, 26, 30].map((step) => ({
      step,
      sound: 'shaker' as const,
      velocity: 0.24,
    })),

    // clave — sparse reference
    { step: 0, sound: 'clave' as const, velocity: 0.5 },
    { step: 6, sound: 'clave' as const, velocity: 0.38 },
    { step: 10, sound: 'clave' as const, velocity: 0.44 },
    { step: 24, sound: 'clave' as const, velocity: 0.42 },

    // congaLow — phrase-end punctuation
    { step: 15, sound: 'congaLow' as const, velocity: 0.46 },
    { step: 31, sound: 'congaLow' as const, velocity: 0.42 },
  ],
};

/**
 * 6. Bossa Tambourine Light
 *
 * Светлый tambourine layer на offbeat, без чрезмерной samba-яркости.
 * Shaker подложка и conga punctuation.
 */
export const bossaTambourineLight: PercussionPatternDef = {
  id: 'bossa-tambourine-light',
  style: 'bossa',
  name: 'Bossa Tambourine Light',
  description: 'Легкий tambourine на offbeat с shaker и conga punctuation.',
  bars: 2,
  stepsPerBar: 16,
  defaultTempoRange: [120, 160],
  density: 'medium',
  sounds: [
    // shaker — steady eighths
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((step) => ({
      step,
      sound: 'shaker' as const,
      velocity: step % 8 === 0 ? 0.42 : 0.27,
    })),

    // tambourine — offbeat accents (steps 3, 7, 11, 15, 19, 23, 27, 31)
    { step: 3, sound: 'tambourine' as const, velocity: 0.34 },
    { step: 7, sound: 'tambourine' as const, velocity: 0.46 },
    { step: 11, sound: 'tambourine' as const, velocity: 0.3 },
    { step: 15, sound: 'tambourine' as const, velocity: 0.5 },

    { step: 19, sound: 'tambourine' as const, velocity: 0.32 },
    { step: 23, sound: 'tambourine' as const, velocity: 0.44 },
    { step: 27, sound: 'tambourine' as const, velocity: 0.28 },
    { step: 31, sound: 'tambourine' as const, velocity: 0.48 },

    // congaLow — structural anchors
    { step: 8, sound: 'congaLow' as const, velocity: 0.42 },
    { step: 24, sound: 'congaLow' as const, velocity: 0.4 },
  ],
};

/**
 * 7. Bossa Partido Alto Hint
 *
 * Чуть более активный рисунок, с намёком на partido alto, но мягче samba.
 * Синкопированная bossa-перкуссия с активной conga и clave accents.
 */
export const bossaPartidoAltoHint: PercussionPatternDef = {
  id: 'bossa-partido-alto-hint',
  style: 'bossa',
  name: 'Bossa Partido Alto Hint',
  description: 'Синкопированная bossa-перкуссия с активной conga и clave accents.',
  bars: 2,
  stepsPerBar: 16,
  defaultTempoRange: [130, 175],
  density: 'high',
  sounds: [
    // shaker — active, accent on quarters
    ...Array.from({ length: 32 }, (_, step) => ({
      step,
      sound: 'shaker' as const,
      velocity: step % 4 === 0 ? 0.48 : step % 2 === 0 ? 0.32 : 0.18,
    })),

    // clave — more assertive, partido-alto flavored
    { step: 0, sound: 'clave' as const, velocity: 0.62 },
    { step: 5, sound: 'clave' as const, velocity: 0.44 },
    { step: 11, sound: 'clave' as const, velocity: 0.54 },
    { step: 18, sound: 'clave' as const, velocity: 0.5 },
    { step: 24, sound: 'clave' as const, velocity: 0.58 },

    // conga — syncopated call-and-response
    { step: 3, sound: 'congaHigh' as const, velocity: 0.34 },
    { step: 6, sound: 'congaLow' as const, velocity: 0.52 },
    { step: 9, sound: 'congaHigh' as const, velocity: 0.4 },
    { step: 14, sound: 'congaLow' as const, velocity: 0.62 },

    { step: 19, sound: 'congaHigh' as const, velocity: 0.32 },
    { step: 22, sound: 'congaLow' as const, velocity: 0.5 },
    { step: 25, sound: 'congaHigh' as const, velocity: 0.38 },
    { step: 30, sound: 'congaLow' as const, velocity: 0.58 },
  ],
};

/**
 * 8. Bossa Cowbell Whisper
 *
 * Cowbell очень тихий, почти как пульс, чтобы не превращать bossa в salsa.
 * Shaker texture и guiro fills для разнообразия.
 */
export const bossaCowbellWhisper: PercussionPatternDef = {
  id: 'bossa-cowbell-whisper',
  style: 'bossa',
  name: 'Bossa Cowbell Whisper',
  description: 'Тихий cowbell pulse, shaker texture и guiro fills.',
  bars: 2,
  stepsPerBar: 16,
  defaultTempoRange: [120, 165],
  density: 'medium',
  sounds: [
    // shaker — steady eighths
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((step) => ({
      step,
      sound: 'shaker' as const,
      velocity: step % 8 === 0 ? 0.48 : 0.3,
    })),

    // cowbell — whisper-quiet pulse, clave-like placement
    { step: 0, sound: 'cowbell' as const, velocity: 0.32 },
    { step: 6, sound: 'cowbell' as const, velocity: 0.24 },
    { step: 10, sound: 'cowbell' as const, velocity: 0.28 },
    { step: 16, sound: 'cowbell' as const, velocity: 0.3 },
    { step: 24, sound: 'cowbell' as const, velocity: 0.26 },

    // guiro — occasional brush fills
    { step: 13, sound: 'guiro' as const, velocity: 0.3, length: 2 },
    { step: 29, sound: 'guiro' as const, velocity: 0.32, length: 2 },

    // conga — soft color
    { step: 7, sound: 'congaHigh' as const, velocity: 0.36 },
    { step: 15, sound: 'congaLow' as const, velocity: 0.48 },
    { step: 23, sound: 'congaHigh' as const, velocity: 0.34 },
    { step: 31, sound: 'congaLow' as const, velocity: 0.44 },
  ],
};

/**
 * 9. Minimal Jazz Bossa Percussion
 *
 * Для ситуаций, где уже есть плотные drums/piano/bass
 * и перкуссия должна быть почти незаметной.
 */
export const bossaMinimalJazz: PercussionPatternDef = {
  id: 'bossa-minimal-jazz',
  style: 'bossa',
  name: 'Minimal Jazz Bossa Percussion',
  description: 'Минимальная перкуссия: shaker, редкая clave и triangle accents.',
  bars: 2,
  stepsPerBar: 16,
  defaultTempoRange: [90, 140],
  density: 'low',
  sounds: [
    // shaker — whisper-quiet eighths
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((step) => ({
      step,
      sound: 'shaker' as const,
      velocity: step % 8 === 0 ? 0.34 : 0.22,
    })),

    // clave — very sparse
    { step: 0, sound: 'clave' as const, velocity: 0.36 },
    { step: 10, sound: 'clave' as const, velocity: 0.28 },
    { step: 24, sound: 'clave' as const, velocity: 0.3 },

    // triangle — barely audible sparkle
    { step: 16, sound: 'triangle' as const, velocity: 0.24 },
    { step: 31, sound: 'triangle' as const, velocity: 0.2 },

    // congaLow — single punctuation at end of phrase
    { step: 15, sound: 'congaLow' as const, velocity: 0.32 },
  ],
};

/**
 * 10. Bossa Extended Color
 *
 * Более декоративный вариант с extended-звуками:
 * bongo, cabasa, tambourine и belltree.
 * Хорошо для интро, бриджа или вариации.
 */
export const bossaExtendedColor: PercussionPatternDef = {
  id: 'bossa-extended-color',
  style: 'bossa',
  name: 'Bossa Extended Color',
  description: 'Расширенная bossa texture с bongo, cabasa, tambourine и belltree.',
  bars: 2,
  stepsPerBar: 16,
  defaultTempoRange: [115, 155],
  density: 'high',
  sounds: [
    // cabasa — driving pulse, accent on quarters
    ...Array.from({ length: 32 }, (_, step) => ({
      step,
      sound: 'cabasa' as const,
      velocity: step % 4 === 0 ? 0.42 : step % 2 === 0 ? 0.3 : 0.17,
    })),

    // clave — 3-2 son pattern
    { step: 0, sound: 'clave' as const, velocity: 0.58 },
    { step: 6, sound: 'clave' as const, velocity: 0.42 },
    { step: 10, sound: 'clave' as const, velocity: 0.5 },
    { step: 16, sound: 'clave' as const, velocity: 0.54 },
    { step: 24, sound: 'clave' as const, velocity: 0.46 },

    // bongoLow — light offbeat color
    { step: 3, sound: 'bongoLow' as const, velocity: 0.32 },
    { step: 7, sound: 'congaHigh' as const, velocity: 0.42 },
    { step: 12, sound: 'bongoLow' as const, velocity: 0.28 },
    { step: 15, sound: 'tumba' as const, velocity: 0.56 },

    { step: 19, sound: 'bongoLow' as const, velocity: 0.3 },
    { step: 23, sound: 'congaHigh' as const, velocity: 0.4 },
    { step: 28, sound: 'bongoLow' as const, velocity: 0.26 },
    { step: 31, sound: 'tumba' as const, velocity: 0.52 },

    // tambourine — decorative offbeat sparkle
    { step: 11, sound: 'tambourine' as const, velocity: 0.28 },
    { step: 27, sound: 'tambourine' as const, velocity: 0.26 },

    // belltree — glissando at end of pattern
    { step: 30, sound: 'belltree' as const, velocity: 0.22, length: 4 },
  ],
};

// ─── Funk Patterns ──────────────────────────────────────────────────────────

/**
 * 1. Tight Shaker + Tambourine Funk
 *
 * Плотный shaker groove 16-ми с tambourine backbeat accents
 * и ghost-акцентами на синкопированных долях.
 * Хорошо для medium-tempo funk с чётким карманом.
 */
export const funkTightShakerTambourine: PercussionPatternDef = {
  id: 'funk-tight-shaker-tambourine',
  style: 'funk',
  name: 'Tight Shaker + Tambourine Funk',
  description: 'Плотный shaker groove с tambourine backbeat accents и ghost-акцентами.',
  bars: 2,
  stepsPerBar: 16,
  defaultTempoRange: [90, 120],
  density: 'medium',
  sounds: [
    // 16th shaker texture with accents
    ...Array.from({ length: 32 }, (_, step) => ({
      step,
      sound: 'shaker' as const,
      velocity: step % 8 === 0 ? 0.62 : step % 4 === 2 ? 0.46 : step % 2 === 0 ? 0.34 : 0.18,
    })),

    // tambourine backbeat / funk snaps
    { step: 4, sound: 'tambourine' as const, velocity: 0.72 },
    { step: 12, sound: 'tambourine' as const, velocity: 0.66 },
    { step: 20, sound: 'tambourine' as const, velocity: 0.74 },
    { step: 28, sound: 'tambourine' as const, velocity: 0.68 },

    // syncopated ghost tambourine
    { step: 7, sound: 'tambourine' as const, velocity: 0.28 },
    { step: 15, sound: 'tambourine' as const, velocity: 0.34 },
    { step: 23, sound: 'tambourine' as const, velocity: 0.26 },
    { step: 31, sound: 'tambourine' as const, velocity: 0.36 },
  ],
};

/**
 * 2. Cowbell Pocket Funk
 *
 * Сухой cowbell pocket с shaker-подложкой и синкопированными ответами.
 * Отсылает к классическому фанк-звучанию 70-х.
 */
export const funkCowbellPocket: PercussionPatternDef = {
  id: 'funk-cowbell-pocket',
  style: 'funk',
  name: 'Cowbell Pocket Funk',
  description: 'Сухой cowbell pocket с shaker-подложкой и синкопированными ответами.',
  bars: 2,
  stepsPerBar: 16,
  defaultTempoRange: [95, 125],
  density: 'medium',
  sounds: [
    // subtle shaker
    ...[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map((step) => ({
      step,
      sound: 'shaker' as const,
      velocity: step % 8 === 0 ? 0.42 : 0.24,
    })),

    // cowbell syncopated funk phrase
    { step: 0, sound: 'cowbell' as const, velocity: 0.74 },
    { step: 3, sound: 'cowbell' as const, velocity: 0.38 },
    { step: 6, sound: 'cowbell' as const, velocity: 0.56 },
    { step: 10, sound: 'cowbell' as const, velocity: 0.64 },
    { step: 13, sound: 'cowbell' as const, velocity: 0.32 },

    { step: 16, sound: 'cowbell' as const, velocity: 0.72 },
    { step: 19, sound: 'cowbell' as const, velocity: 0.34 },
    { step: 22, sound: 'cowbell' as const, velocity: 0.52 },
    { step: 27, sound: 'cowbell' as const, velocity: 0.66 },
    { step: 30, sound: 'cowbell' as const, velocity: 0.42 },

    // light tambourine reinforcement
    { step: 12, sound: 'tambourine' as const, velocity: 0.46 },
    { step: 28, sound: 'tambourine' as const, velocity: 0.5 },
  ],
};

/**
 * 3. 16th Cabasa Drive
 *
 * Нервный 16th-note cabasa drive с tambourine accents на слабых долях.
 * Высокая плотность — для энергичного funk/fusion.
 */
export const funkSixteenthCabasaDrive: PercussionPatternDef = {
  id: 'funk-sixteenth-cabasa-drive',
  style: 'funk',
  name: '16th Cabasa Drive',
  description: 'Нервный 16th-note cabasa drive с tambourine accents на слабых долях.',
  bars: 2,
  stepsPerBar: 16,
  defaultTempoRange: [100, 130],
  density: 'high',
  sounds: [
    // busy cabasa layer
    ...Array.from({ length: 32 }, (_, step) => ({
      step,
      sound: 'cabasa' as const,
      velocity: step % 8 === 0 ? 0.58 : step % 4 === 0 ? 0.44 : step % 2 === 0 ? 0.34 : 0.22,
    })),

    // offbeat tambourine accents
    { step: 2, sound: 'tambourine' as const, velocity: 0.36 },
    { step: 6, sound: 'tambourine' as const, velocity: 0.48 },
    { step: 11, sound: 'tambourine' as const, velocity: 0.42 },
    { step: 14, sound: 'tambourine' as const, velocity: 0.56 },

    { step: 18, sound: 'tambourine' as const, velocity: 0.34 },
    { step: 22, sound: 'tambourine' as const, velocity: 0.46 },
    { step: 25, sound: 'tambourine' as const, velocity: 0.38 },
    { step: 30, sound: 'tambourine' as const, velocity: 0.6 },

    // tiny sparkle
    { step: 15, sound: 'triangle' as const, velocity: 0.18 },
    { step: 31, sound: 'triangle' as const, velocity: 0.22 },
  ],
};

/**
 * 4. Sparse Breakbeat Percussion
 *
 * Редкая перкуссия для breakbeat/funk: короткие акценты, много воздуха.
 * Подходит для sparse groove с акцентом на барабаны.
 */
export const funkSparseBreakbeatPerc: PercussionPatternDef = {
  id: 'funk-sparse-breakbeat-perc',
  style: 'funk',
  name: 'Sparse Breakbeat Percussion',
  description: 'Редкая перкуссия для breakbeat/funk: короткие акценты, много воздуха.',
  bars: 2,
  stepsPerBar: 16,
  defaultTempoRange: [85, 110],
  density: 'low',
  sounds: [
    // sparse shaker only on selected 16ths
    { step: 0, sound: 'shaker' as const, velocity: 0.42 },
    { step: 3, sound: 'shaker' as const, velocity: 0.22 },
    { step: 6, sound: 'shaker' as const, velocity: 0.34 },
    { step: 10, sound: 'shaker' as const, velocity: 0.28 },
    { step: 13, sound: 'shaker' as const, velocity: 0.2 },

    { step: 16, sound: 'shaker' as const, velocity: 0.44 },
    { step: 19, sound: 'shaker' as const, velocity: 0.24 },
    { step: 22, sound: 'shaker' as const, velocity: 0.32 },
    { step: 26, sound: 'shaker' as const, velocity: 0.26 },
    { step: 31, sound: 'shaker' as const, velocity: 0.3 },

    // tambourine answers
    { step: 7, sound: 'tambourine' as const, velocity: 0.48 },
    { step: 12, sound: 'tambourine' as const, velocity: 0.62 },
    { step: 23, sound: 'tambourine' as const, velocity: 0.42 },
    { step: 28, sound: 'tambourine' as const, velocity: 0.66 },

    // one-shot effect
    { step: 30, sound: 'vibraslap' as const, velocity: 0.26 },
  ],
};

/**
 * 5. Funk Disco Tambourine Layer
 *
 * Funk/disco crossover: tambourine на upbeat, shaker заполняет 16-е.
 * Cowbell hooks для вариации. Высокая плотность — танцевальный грув.
 */
export const funkDiscoTambourineLayer: PercussionPatternDef = {
  id: 'funk-disco-tambourine-layer',
  style: 'funk',
  name: 'Funk Disco Tambourine Layer',
  description: 'Funk/disco crossover: tambourine на upbeat, shaker заполняет 16-е.',
  bars: 2,
  stepsPerBar: 16,
  defaultTempoRange: [105, 128],
  density: 'high',
  sounds: [
    // shaker 16th pulse
    ...Array.from({ length: 32 }, (_, step) => ({
      step,
      sound: 'shaker' as const,
      velocity: step % 4 === 0 ? 0.44 : step % 2 === 0 ? 0.34 : 0.2,
    })),

    // tambourine upbeat / disco-funk motion
    { step: 2, sound: 'tambourine' as const, velocity: 0.48 },
    { step: 6, sound: 'tambourine' as const, velocity: 0.58 },
    { step: 10, sound: 'tambourine' as const, velocity: 0.5 },
    { step: 14, sound: 'tambourine' as const, velocity: 0.64 },

    { step: 18, sound: 'tambourine' as const, velocity: 0.46 },
    { step: 22, sound: 'tambourine' as const, velocity: 0.56 },
    { step: 26, sound: 'tambourine' as const, velocity: 0.48 },
    { step: 30, sound: 'tambourine' as const, velocity: 0.68 },

    // occasional cowbell hooks
    { step: 0, sound: 'cowbell' as const, velocity: 0.42 },
    { step: 11, sound: 'cowbell' as const, velocity: 0.34 },
    { step: 16, sound: 'cowbell' as const, velocity: 0.38 },
    { step: 27, sound: 'cowbell' as const, velocity: 0.36 },
  ],
};

// ─── Pattern Registry ──────────────────────────────────────────────────────

/**
 * All data-driven percussion patterns, keyed by ID.
 * Includes both legacy and new patterns for unified access.
 */
export const PERCUSSION_PATTERN_DEFS: Record<string, PercussionPatternDef> = {
  'bossa-classic-shaker-clave': bossaClassicShakerClave,
  'bossa-soft-texture': bossaSoftTexture,
  'bossa-rio-conga': bossaRioConga,
  'bossa-cabasa-pulse': bossaCabasaPulse,
  'bossa-guiro-brush': bossaGuiroBrush,
  'bossa-tambourine-light': bossaTambourineLight,
  'bossa-partido-alto-hint': bossaPartidoAltoHint,
  'bossa-cowbell-whisper': bossaCowbellWhisper,
  'bossa-minimal-jazz': bossaMinimalJazz,
  'bossa-extended-color': bossaExtendedColor,
  'funk-tight-shaker-tambourine': funkTightShakerTambourine,
  'funk-cowbell-pocket': funkCowbellPocket,
  'funk-sixteenth-cabasa-drive': funkSixteenthCabasaDrive,
  'funk-sparse-breakbeat-perc': funkSparseBreakbeatPerc,
  'funk-disco-tambourine-layer': funkDiscoTambourineLayer,
};

/** Array of all data-driven percussion pattern defs (for iteration / UI). */
export const PERCUSSION_PATTERN_DEF_LIST: PercussionPatternDef[] =
  Object.values(PERCUSSION_PATTERN_DEFS);

/** Union type of all data-driven percussion pattern IDs. */
export type PercussionPatternDefId = keyof typeof PERCUSSION_PATTERN_DEFS;
