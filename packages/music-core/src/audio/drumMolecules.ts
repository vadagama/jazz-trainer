import type { DrumMolecule, DrumAtom, MoleculeCategory } from './drumPatternTypes.js';
import type { DrumSound } from './drumSampleRegistry.js';
import { GENERATED_DRUM_MOLECULES } from './drumMoleculesGenerated.js';

// ─── Tick helpers ─────────────────────────────────────────────────────────────

const PPQ = 480;

// Beat boundaries in a 4/4 bar
const B1 = 0;
const B2 = PPQ;
const B3 = PPQ * 2;
const B4 = PPQ * 3;

// Eighth-note subdivisions within a beat
const _8 = PPQ / 2; // 240
const _8off = _8; // offbeat eighth (swing-adjusted later)

// Sixteenth-note subdivisions within a beat
const _16 = PPQ / 4; // 120
const _16e = _16; // 'e' of beat
const _16and = _16 * 2; // '&' of beat
const _16a = _16 * 3; // 'a' of beat

// ─── Shared atoms ─────────────────────────────────────────────────────────────

const kick = (tick: number, vel = 0.8, dur = PPQ): DrumAtom => ({
  sound: 'bassDrum' as DrumSound,
  atTick: tick,
  velocity: vel,
  durationTicks: dur,
});

const snare = (tick: number, vel = 0.85, dur = PPQ): DrumAtom => ({
  sound: 'snare' as DrumSound,
  atTick: tick,
  velocity: vel,
  durationTicks: dur,
});

const ride = (tick: number, vel = 0.75, dur = 20): DrumAtom => ({
  sound: 'ride' as DrumSound,
  atTick: tick,
  velocity: vel,
  durationTicks: dur,
});

const hh = (tick: number, vel = 0.6, dur = PPQ): DrumAtom => ({
  sound: 'hihat' as DrumSound,
  atTick: tick,
  velocity: vel,
  durationTicks: dur,
});

const hhClosed = (tick: number, vel = 0.6, dur = PPQ): DrumAtom => ({
  sound: 'hihat_closed' as DrumSound,
  atTick: tick,
  velocity: vel,
  durationTicks: dur,
});

const footChick = (tick: number, vel = 0.6, dur = PPQ / 4): DrumAtom => ({
  sound: 'hihat_foot' as DrumSound,
  atTick: tick,
  velocity: vel,
  durationTicks: dur,
});

const crash = (tick: number, vel = 0.9, dur = PPQ): DrumAtom => ({
  sound: 'crash' as DrumSound,
  atTick: tick,
  velocity: vel,
  durationTicks: dur,
});

const rim = (tick: number, vel = 0.75, dur = PPQ): DrumAtom => ({
  sound: 'rim' as DrumSound,
  atTick: tick,
  velocity: vel,
  durationTicks: dur,
});

const ghostSnare = (tick: number, vel = 0.25): DrumAtom => ({
  sound: 'snare' as DrumSound,
  atTick: tick,
  velocity: vel,
  durationTicks: 60,
});

const tomHi = (tick: number, vel = 0.65, dur = 120): DrumAtom => ({
  sound: 'highTom' as DrumSound,
  atTick: tick,
  velocity: vel,
  durationTicks: dur,
});

const tomLo = (tick: number, vel = 0.65, dur = 120): DrumAtom => ({
  sound: 'lowTom' as DrumSound,
  atTick: tick,
  velocity: vel,
  durationTicks: dur,
});

const rideBell = (tick: number, vel = 0.8, dur = 40): DrumAtom => ({
  sound: 'ride_bell' as DrumSound,
  atTick: tick,
  velocity: vel,
  durationTicks: dur,
});

const stir = (tick: number, vel = 0.5, dur = PPQ): DrumAtom => ({
  sound: 'hihat_stir' as DrumSound,
  atTick: tick,
  velocity: vel,
  durationTicks: dur,
});

// ═══════════════════════════════════════════════════════════════════════════════
// SWING molecules
// ═══════════════════════════════════════════════════════════════════════════════

const swingRideBasic: DrumMolecule = {
  id: 'swing-ride-basic',
  label: 'Ride ding-ding-a-ding',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['ride'],
  complexity: { min: 1, max: 3 },
  atoms: [
    ride(B1, 0.45),
    ride(B1 + _8off, 0.38),
    ride(B2, 0.42),
    ride(B2 + _8off, 0.38),
    ride(B3, 0.45),
    ride(B3 + _8off, 0.38),
    ride(B4, 0.42),
  ],
};

const swingRideVariation1: DrumMolecule = {
  id: 'swing-ride-variation-1',
  label: 'Ride с дополнительным skip на 1&',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['ride'],
  complexity: { min: 2, max: 3 },
  atoms: [
    ride(B1, 0.55),
    ride(B1 + _8off, 0.42),
    ride(B1 + _16e, 0.32), // skip accent
    ride(B2, 0.48),
    ride(B2 + _8off, 0.42),
    ride(B3, 0.5),
    ride(B3 + _8off, 0.42),
    ride(B4, 0.48),
  ],
};

const swingRideVariation2: DrumMolecule = {
  id: 'swing-ride-variation-2',
  label: 'Ride с bell-акцентом на 1',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['ride', 'ride_bell'],
  complexity: { min: 2, max: 3 },
  conditions: { requireRide: true },
  atoms: [
    rideBell(B1, 0.55),
    ride(B1 + _8off, 0.42),
    ride(B2, 0.5),
    ride(B2 + _8off, 0.42),
    ride(B3, 0.52),
    ride(B3 + _8off, 0.42),
    ride(B4, 0.48),
  ],
};

const swingFeathering1: DrumMolecule = {
  id: 'swing-feathering-1',
  label: 'Bass drum feathering (все 4 доли)',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 1, max: 3 },
  atoms: [kick(B1, 0.55), kick(B2, 0.32), kick(B3, 0.45), kick(B4, 0.32)],
};

const swingFootChick: DrumMolecule = {
  id: 'swing-foot-chick',
  label: 'Hihat foot chick на 2 и 4',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['hihat_foot'],
  complexity: { min: 1, max: 3 },
  atoms: [footChick(B2, 0.32), footChick(B4, 0.32)],
};

const swingFeathering2: DrumMolecule = {
  id: 'swing-feathering-2',
  label: 'Bass drum только 1 и 3',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 1, max: 3 },
  atoms: [kick(B1, 0.55), kick(B3, 0.45)],
};

const swingFeathering3: DrumMolecule = {
  id: 'swing-feathering-3',
  label: 'Bass drum 1, 3&, 4 (syncopated)',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 2, max: 3 },
  atoms: [kick(B1, 0.58), kick(B3 + _8off, 0.48), kick(B4, 0.52)],
};

const swingSnareBackbeat: DrumMolecule = {
  id: 'swing-snare-backbeat',
  label: 'Snare на 2 и 4',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['snare'],
  complexity: { min: 1, max: 3 },
  atoms: [snare(B2, 0.58), snare(B4, 0.55)],
};

const swingSnareGhostPhrase: DrumMolecule = {
  id: 'swing-snare-ghost-phrase',
  label: 'Ghost-ноты на e и a 3-й и e 4-й доли',
  style: 'swing',
  bars: 1,
  category: 'texture',
  tags: ['snare', 'ghost'],
  complexity: { min: 2, max: 3 },
  conditions: { requireSnare: true },
  atoms: [ghostSnare(B3 + _16e, 0.14), ghostSnare(B3 + _16a, 0.18), ghostSnare(B4 + _16e, 0.22)],
};

const swingStirTexture: DrumMolecule = {
  id: 'swing-stir-texture',
  label: 'Stir на 2 и 4 (джазовая текстура)',
  style: 'swing',
  bars: 1,
  category: 'texture',
  tags: ['stir'],
  complexity: { min: 2, max: 3 },
  conditions: { requireStir: true },
  atoms: [stir(B2, 0.32), stir(B4, 0.38)],
};

const swingCrashAccent: DrumMolecule = {
  id: 'swing-crash-accent',
  label: 'Crash на 1-й доле',
  style: 'swing',
  bars: 1,
  category: 'accent',
  tags: ['crash'],
  complexity: { min: 1, max: 3 },
  conditions: { requireCrash: true },
  atoms: [crash(B1, 0.58)],
};

const swingFillTriplet1: DrumMolecule = {
  id: 'swing-fill-triplet-1',
  label: 'Триольный fill snare + kick',
  style: 'swing',
  bars: 1,
  category: 'fill',
  tags: ['snare', 'kick', 'fill'],
  complexity: { min: 1, max: 3 },
  atoms: [snare(B4, 0.45), snare(B4 + PPQ / 3, 0.5), kick(B4 + (PPQ * 2) / 3, 0.52)],
};

const swingFillTomRun: DrumMolecule = {
  id: 'swing-fill-tom-run',
  label: 'Томовый run 16-ми',
  style: 'swing',
  bars: 1,
  category: 'fill',
  tags: ['tom', 'fill'],
  complexity: { min: 3, max: 3 },
  conditions: { requireToms: true },
  atoms: [
    tomHi(B4, 0.45),
    tomLo(B4 + _16, 0.5),
    tomHi(B4 + _16 * 2, 0.52),
    tomLo(B4 + _16 * 3, 0.55),
  ],
};

const swingIntro4Clicks: DrumMolecule = {
  id: 'swing-intro-4clicks',
  label: '4 клика stick-click перед входом',
  style: 'swing',
  bars: 1,
  category: 'intro',
  tags: ['rim'],
  complexity: { min: 1, max: 3 },
  atoms: [rim(B1, 0.42), rim(B2, 0.42), rim(B3, 0.42), rim(B4, 0.5)],
};

const swingEndingCrash: DrumMolecule = {
  id: 'swing-ending-crash',
  label: 'Финальный crash + release',
  style: 'swing',
  bars: 1,
  category: 'ending',
  tags: ['crash'],
  complexity: { min: 1, max: 3 },
  conditions: { requireCrash: true },
  atoms: [crash(B1, 0.62, PPQ * 2)],
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOSSA NOVA molecules
// ═══════════════════════════════════════════════════════════════════════════════

const bossaClaveRim1: DrumMolecule = {
  id: 'bossa-clave-rim-1',
  label: 'Базовый clave: rim на 1, 2, 3',
  style: 'bossa',
  bars: 1,
  category: 'groove',
  tags: ['rim'],
  complexity: { min: 1, max: 3 },
  atoms: [rim(B1, 0.85), rim(B2, 0.75), rim(B3, 0.75)],
};

const bossaClaveRim2: DrumMolecule = {
  id: 'bossa-clave-rim-2',
  label: 'Clave с вариацией: rim на 1, 2&, 3, 4',
  style: 'bossa',
  bars: 1,
  category: 'groove',
  tags: ['rim'],
  complexity: { min: 2, max: 3 },
  atoms: [rim(B1, 0.85), rim(B2 + _8off, 0.7), rim(B3, 0.75), rim(B4, 0.7)],
};

const bossaClaveXstick: DrumMolecule = {
  id: 'bossa-clave-xstick',
  label: 'Cross-stick вариант clave',
  style: 'bossa',
  bars: 1,
  category: 'groove',
  tags: ['snare'],
  complexity: { min: 2, max: 3 },
  atoms: [
    { sound: 'snare_crossstick' as DrumSound, atTick: B1, velocity: 0.75, durationTicks: PPQ },
    { sound: 'snare_crossstick' as DrumSound, atTick: B2, velocity: 0.7, durationTicks: PPQ },
    { sound: 'snare_crossstick' as DrumSound, atTick: B3, velocity: 0.7, durationTicks: PPQ },
  ],
};

const bossaClave23: DrumMolecule = {
  id: 'bossa-clave-2-3',
  label: 'Clave 2-3: rim на 1&, 2a, 4',
  style: 'bossa',
  bars: 1,
  category: 'groove',
  tags: ['rim'],
  complexity: { min: 1, max: 3 },
  atoms: [rim(B1 + _8off, 0.8), rim(B2 + _16a, 0.7), rim(B4, 0.75)],
};

const bossaClaveSync: DrumMolecule = {
  id: 'bossa-clave-sync',
  label: 'Clave синкопированная: rim на 1&, 2a, 3&, 4a',
  style: 'bossa',
  bars: 1,
  category: 'groove',
  tags: ['rim'],
  complexity: { min: 2, max: 3 },
  atoms: [rim(B1 + _8off, 0.8), rim(B2 + _16a, 0.7), rim(B3 + _8off, 0.72), rim(B4 + _16a, 0.68)],
};

const bossaKickPartido: DrumMolecule = {
  id: 'bossa-kick-partido',
  label: 'Partido alto kick: 1, 2&, 3&',
  style: 'bossa',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 1, max: 3 },
  atoms: [kick(B1, 0.85), kick(B2 + _8off, 0.7), kick(B3 + _8off, 0.7)],
};

const bossaKickSyncopated: DrumMolecule = {
  id: 'bossa-kick-syncopated',
  label: 'Синкопированный kick: 1, 2&, 3, 4&',
  style: 'bossa',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 2, max: 3 },
  atoms: [kick(B1, 0.85), kick(B2 + _8off, 0.75), kick(B3, 0.8), kick(B4 + _8off, 0.7)],
};

const bossaKickLounge: DrumMolecule = {
  id: 'bossa-kick-lounge',
  label: 'Kick lounge: 1, 2&, 3 (без 4&)',
  style: 'bossa',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 1, max: 2 },
  atoms: [kick(B1, 0.82), kick(B2 + _8off, 0.7), kick(B3, 0.78)],
};
const bossaHihat8ths: DrumMolecule = {
  id: 'bossa-hihat-8ths',
  label: 'Восьмые hihat (закрытый + полуоткрытый)',
  style: 'bossa',
  bars: 1,
  category: 'groove',
  tags: ['hihat'],
  complexity: { min: 1, max: 3 },
  atoms: [
    hhClosed(B1, 0.55),
    hhClosed(B1 + _8off, 0.4),
    hhClosed(B2, 0.55),
    hhClosed(B2 + _8off, 0.4),
    hhClosed(B3, 0.55),
    hhClosed(B3 + _8off, 0.4),
    hhClosed(B4, 0.55),
    hhClosed(B4 + _8off, 0.4),
  ],
};

const bossaHihatChick: DrumMolecule = {
  id: 'bossa-hihat-chick',
  label: 'Hihat chick на 2 и 4',
  style: 'bossa',
  bars: 1,
  category: 'groove',
  tags: ['hihat'],
  complexity: { min: 1, max: 3 },
  atoms: [hhClosed(B2, 0.7), hhClosed(B4, 0.7)],
};

const bossaRideBossa: DrumMolecule = {
  id: 'bossa-ride-bossa',
  label: 'Ride bossa-паттерн',
  style: 'bossa',
  bars: 1,
  category: 'groove',
  tags: ['ride'],
  complexity: { min: 2, max: 3 },
  atoms: [
    ride(B1, 0.8),
    ride(B1 + _8off, 0.65),
    ride(B2 + _8off, 0.65),
    ride(B3, 0.8),
    ride(B3 + _8off, 0.65),
    ride(B4 + _8off, 0.65),
  ],
};

const bossaFillTomSamba: DrumMolecule = {
  id: 'bossa-fill-tom-samba',
  label: 'Томовый fill в стиле samba',
  style: 'bossa',
  bars: 1,
  category: 'fill',
  tags: ['tom', 'fill'],
  complexity: { min: 2, max: 3 },
  conditions: { requireToms: true },
  atoms: [tomHi(B4, 0.6), tomLo(B4 + _16, 0.65), tomHi(B4 + _16and, 0.7), tomLo(B4 + _16a, 0.75)],
};

const bossaFillRimVariation: DrumMolecule = {
  id: 'bossa-fill-rim-variation',
  label: 'Вариация clave с дополнительными rim',
  style: 'bossa',
  bars: 1,
  category: 'fill',
  tags: ['rim', 'fill'],
  complexity: { min: 2, max: 3 },
  atoms: [rim(B4, 0.7), rim(B4 + _8off, 0.65)],
};

const bossaCrashAccent: DrumMolecule = {
  id: 'bossa-crash-accent',
  label: 'Crash на 1-й доле',
  style: 'bossa',
  bars: 1,
  category: 'accent',
  tags: ['crash'],
  complexity: { min: 1, max: 3 },
  conditions: { requireCrash: true },
  atoms: [crash(B1, 0.9)],
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNK molecules
// ═══════════════════════════════════════════════════════════════════════════════

const funkKickLinear1: DrumMolecule = {
  id: 'funk-kick-linear-1',
  label: 'Linear kick: 1, 1e, 2&, 3, 3e',
  style: 'funk',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 1, max: 3 },
  atoms: [
    kick(B1, 0.9),
    kick(B1 + _16e, 0.55),
    kick(B2 + _16and, 0.75),
    kick(B3, 0.85),
    kick(B3 + _16e, 0.55),
  ],
};

const funkKickLinear2: DrumMolecule = {
  id: 'funk-kick-linear-2',
  label: 'Linear kick: 1, 1a, 2&, 3&, 4',
  style: 'funk',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 2, max: 3 },
  atoms: [
    kick(B1, 0.9),
    kick(B1 + _16a, 0.6),
    kick(B2 + _16and, 0.75),
    kick(B3 + _16and, 0.75),
    kick(B4, 0.85),
  ],
};

const funkKickGhosted: DrumMolecule = {
  id: 'funk-kick-ghosted',
  label: 'Kick с ghost-нотами на e и a',
  style: 'funk',
  bars: 1,
  category: 'groove',
  tags: ['kick', 'ghost'],
  complexity: { min: 2, max: 3 },
  atoms: [
    kick(B1, 0.85),
    kick(B1 + _16e, 0.3),
    kick(B2 + _16and, 0.7),
    kick(B3, 0.8),
    kick(B3 + _16e, 0.3),
    kick(B4, 0.75),
  ],
};

const funkSnareBackbeat: DrumMolecule = {
  id: 'funk-snare-backbeat',
  label: 'Snare accent на 2 и 4',
  style: 'funk',
  bars: 1,
  category: 'groove',
  tags: ['snare'],
  complexity: { min: 1, max: 3 },
  atoms: [snare(B2, 0.9), snare(B4, 0.9)],
};

const funkSnareRimshot: DrumMolecule = {
  id: 'funk-snare-rimshot',
  label: 'Rimshot на 2 и 4 (accent)',
  style: 'funk',
  bars: 1,
  category: 'groove',
  tags: ['snare'],
  complexity: { min: 2, max: 3 },
  conditions: { requireSnare: true },
  atoms: [
    { sound: 'snare_rimshot' as DrumSound, atTick: B2, velocity: 0.9, durationTicks: PPQ },
    { sound: 'snare_rimshot' as DrumSound, atTick: B4, velocity: 0.85, durationTicks: PPQ },
  ],
};

const funkSnareGhost16ths: DrumMolecule = {
  id: 'funk-snare-ghost-16ths',
  label: 'Ghost-ноты 16-ми между backbeat',
  style: 'funk',
  bars: 1,
  category: 'texture',
  tags: ['snare', 'ghost'],
  complexity: { min: 2, max: 3 },
  atoms: [
    ghostSnare(B1 + _16e, 0.2),
    ghostSnare(B1 + _16a, 0.2),
    ghostSnare(B3 + _16e, 0.25),
    ghostSnare(B3 + _16a, 0.25),
  ],
};

const funkSnareBuzzPhrase: DrumMolecule = {
  id: 'funk-snare-buzz-phrase',
  label: 'Buzz-roll фраза (2 такта)',
  style: 'funk',
  bars: 2,
  category: 'texture',
  tags: ['snare', 'buzz'],
  complexity: { min: 3, max: 3 },
  conditions: { requireSnare: true },
  atoms: [
    { sound: 'snare_buzz' as DrumSound, atTick: B1 + _16e, velocity: 0.2, durationTicks: 60 },
    { sound: 'snare_buzz' as DrumSound, atTick: B1 + _16a, velocity: 0.22, durationTicks: 60 },
    { sound: 'snare_buzz' as DrumSound, atTick: B2 + _16e, velocity: 0.18, durationTicks: 60 },
    { sound: 'snare_buzz' as DrumSound, atTick: B3 + _16e, velocity: 0.25, durationTicks: 60 },
    { sound: 'snare_buzz' as DrumSound, atTick: B3 + _16a, velocity: 0.28, durationTicks: 60 },
    { sound: 'snare_buzz' as DrumSound, atTick: B4 + _16e, velocity: 0.3, durationTicks: 60 },
  ],
};

const funkSnareFlamAccent: DrumMolecule = {
  id: 'funk-snare-flam-accent',
  label: 'Flam на 4-й доле → переход',
  style: 'funk',
  bars: 1,
  category: 'accent',
  tags: ['snare', 'flam'],
  complexity: { min: 2, max: 3 },
  conditions: { requireSnare: true },
  atoms: [
    { sound: 'snare_flam' as DrumSound, atTick: B4 - 20, velocity: 0.3, durationTicks: 40 },
    { sound: 'snare_flam' as DrumSound, atTick: B4, velocity: 0.85, durationTicks: PPQ },
  ],
};

const funkHihat16ths: DrumMolecule = {
  id: 'funk-hihat-16ths',
  label: 'Закрытый hihat 16-ми',
  style: 'funk',
  bars: 1,
  category: 'groove',
  tags: ['hihat'],
  complexity: { min: 1, max: 3 },
  atoms: [
    hhClosed(B1, 0.65),
    hhClosed(B1 + _16e, 0.4),
    hhClosed(B1 + _16and, 0.5),
    hhClosed(B1 + _16a, 0.4),
    hhClosed(B2, 0.65),
    hhClosed(B2 + _16e, 0.4),
    hhClosed(B2 + _16and, 0.5),
    hhClosed(B2 + _16a, 0.4),
    hhClosed(B3, 0.65),
    hhClosed(B3 + _16e, 0.4),
    hhClosed(B3 + _16and, 0.5),
    hhClosed(B3 + _16a, 0.4),
    hhClosed(B4, 0.65),
    hhClosed(B4 + _16e, 0.4),
    hhClosed(B4 + _16and, 0.5),
    hhClosed(B4 + _16a, 0.4),
  ],
};

const funkHihatOpenOffbeat: DrumMolecule = {
  id: 'funk-hihat-open-offbeat',
  label: 'Открытый hihat на offbeat-ах',
  style: 'funk',
  bars: 1,
  category: 'groove',
  tags: ['hihat'],
  complexity: { min: 2, max: 3 },
  atoms: [
    hhClosed(B1, 0.65),
    {
      sound: 'hihat_open' as DrumSound,
      atTick: B1 + _16and,
      velocity: 0.55,
      durationTicks: PPQ / 4,
    },
    hhClosed(B2, 0.65),
    {
      sound: 'hihat_open' as DrumSound,
      atTick: B2 + _16and,
      velocity: 0.55,
      durationTicks: PPQ / 4,
    },
    hhClosed(B3, 0.65),
    {
      sound: 'hihat_open' as DrumSound,
      atTick: B3 + _16and,
      velocity: 0.55,
      durationTicks: PPQ / 4,
    },
    hhClosed(B4, 0.65),
  ],
};

const funkHihatBark: DrumMolecule = {
  id: 'funk-hihat-bark',
  label: 'Hihat bark на 1&',
  style: 'funk',
  bars: 1,
  category: 'accent',
  tags: ['hihat'],
  complexity: { min: 2, max: 3 },
  atoms: [
    {
      sound: 'hihat_open' as DrumSound,
      atTick: B1 + _16and,
      velocity: 0.75,
      durationTicks: PPQ / 6,
    },
  ],
};

const funkRideBell: DrumMolecule = {
  id: 'funk-ride-bell',
  label: 'Ride bell на 1 и 3',
  style: 'funk',
  bars: 1,
  category: 'groove',
  tags: ['ride', 'ride_bell'],
  complexity: { min: 2, max: 3 },
  atoms: [rideBell(B1, 0.8), rideBell(B3, 0.8)],
};

const funkCrashSizzle: DrumMolecule = {
  id: 'funk-crash-sizzle',
  label: 'Sizzle crash на 1-й доле',
  style: 'funk',
  bars: 1,
  category: 'accent',
  tags: ['crash'],
  complexity: { min: 1, max: 3 },
  conditions: { requireCrash: true },
  atoms: [
    { sound: 'crash_sizzle' as DrumSound, atTick: B1, velocity: 0.85, durationTicks: PPQ * 2 },
  ],
};

const funkFill16ths: DrumMolecule = {
  id: 'funk-fill-16ths',
  label: '16-е snare fill + crash',
  style: 'funk',
  bars: 1,
  category: 'fill',
  tags: ['snare', 'crash', 'fill'],
  complexity: { min: 2, max: 3 },
  atoms: [snare(B4, 0.65), snare(B4 + _16e, 0.7), snare(B4 + _16and, 0.75), crash(B4 + _16a, 0.85)],
};

const funkFillTomBass: DrumMolecule = {
  id: 'funk-fill-tom-bass',
  label: 'Tom + kick fill перед crash',
  style: 'funk',
  bars: 1,
  category: 'fill',
  tags: ['tom', 'kick', 'fill'],
  complexity: { min: 2, max: 3 },
  conditions: { requireToms: true },
  atoms: [tomHi(B4, 0.65), tomLo(B4 + _16e, 0.7), kick(B4 + _16and, 0.75), tomLo(B4 + _16a, 0.8)],
};

const funkFillBuzzFlam: DrumMolecule = {
  id: 'funk-fill-buzz-flam',
  label: 'Fill с buzz + flam',
  style: 'funk',
  bars: 1,
  category: 'fill',
  tags: ['snare', 'buzz', 'flam', 'fill'],
  complexity: { min: 3, max: 3 },
  conditions: { requireSnare: true },
  atoms: [
    { sound: 'snare_buzz' as DrumSound, atTick: B4, velocity: 0.45, durationTicks: 80 },
    { sound: 'snare_buzz' as DrumSound, atTick: B4 + _16e, velocity: 0.5, durationTicks: 80 },
    { sound: 'snare_buzz' as DrumSound, atTick: B4 + _16and, velocity: 0.55, durationTicks: 80 },
    { sound: 'snare_flam' as DrumSound, atTick: B4 + _16a - 20, velocity: 0.3, durationTicks: 40 },
    { sound: 'snare_flam' as DrumSound, atTick: B4 + _16a, velocity: 0.8, durationTicks: PPQ },
  ],
};

const funkIntro4Bars: DrumMolecule = {
  id: 'funk-intro-4bars',
  label: '4-тактовое intro (kick build-up)',
  style: 'funk',
  bars: 2,
  category: 'intro',
  tags: ['kick'],
  complexity: { min: 2, max: 3 },
  atoms: [
    kick(B1, 0.6),
    kick(B3, 0.65),
    kick(B1 + PPQ * 4, 0.75),
    kick(B2 + PPQ * 4, 0.7),
    kick(B3 + PPQ * 4, 0.8),
    kick(B4 + PPQ * 4, 0.85),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// LATIN molecules
// ═══════════════════════════════════════════════════════════════════════════════

const latinCascara1: DrumMolecule = {
  id: 'latin-cascara-1',
  label: 'Cascara на ride/rim: 1, 1&, 2, 2&, 3, 3a, 4',
  style: 'latin',
  bars: 1,
  category: 'groove',
  tags: ['ride', 'rim'],
  complexity: { min: 1, max: 3 },
  atoms: [
    ride(B1, 0.8),
    ride(B1 + _8off, 0.7),
    ride(B2, 0.75),
    ride(B2 + _8off, 0.65),
    ride(B3, 0.8),
    ride(B3 + _16a, 0.7),
    ride(B4, 0.75),
  ],
};

const latinCascara2: DrumMolecule = {
  id: 'latin-cascara-2',
  label: 'Cascara вариация с акцентами',
  style: 'latin',
  bars: 1,
  category: 'groove',
  tags: ['ride', 'rim'],
  complexity: { min: 2, max: 3 },
  atoms: [
    ride(B1, 0.85),
    ride(B1 + _8off, 0.7),
    ride(B2, 0.75),
    ride(B2 + _16and, 0.7),
    ride(B3, 0.85),
    ride(B3 + _16a, 0.75),
    ride(B4 + _8off, 0.7),
  ],
};

const latinClaveSon23: DrumMolecule = {
  id: 'latin-clave-son-2-3',
  label: 'Son clave 2-3',
  style: 'latin',
  bars: 2,
  category: 'groove',
  tags: ['rim'],
  complexity: { min: 1, max: 3 },
  atoms: [
    // Bar 1 (2-side): beats 1, 2&
    rim(B1, 0.8),
    rim(B2 + _8off, 0.75),
    // Bar 2 (3-side): beats 1, 2& and 4
    rim(B1 + PPQ * 4, 0.8),
    rim(B2 + _8off + PPQ * 4, 0.75),
    rim(B4 + PPQ * 4, 0.75),
  ],
};

const latinClaveSon32: DrumMolecule = {
  id: 'latin-clave-son-3-2',
  label: 'Son clave 3-2',
  style: 'latin',
  bars: 2,
  category: 'groove',
  tags: ['rim'],
  complexity: { min: 2, max: 3 },
  atoms: [
    // Bar 1 (3-side): beats 1, 2&, 4
    rim(B1, 0.8),
    rim(B2 + _8off, 0.75),
    rim(B4, 0.75),
    // Bar 2 (2-side): beats 1, 2&
    rim(B1 + PPQ * 4, 0.8),
    rim(B2 + _8off + PPQ * 4, 0.75),
  ],
};

const latinClaveRumba32: DrumMolecule = {
  id: 'latin-clave-rumba-3-2',
  label: 'Rumba clave 3-2',
  style: 'latin',
  bars: 2,
  category: 'groove',
  tags: ['rim'],
  complexity: { min: 3, max: 3 },
  atoms: [
    // Bar 1 (3-side): beats 1, 3a, 4
    rim(B1, 0.8),
    rim(B3 + _16a, 0.7),
    rim(B4, 0.7),
    // Bar 2 (2-side): beats 1, 2&
    rim(B1 + PPQ * 4, 0.8),
    rim(B2 + _8off + PPQ * 4, 0.75),
  ],
};

const latinKickTumbao: DrumMolecule = {
  id: 'latin-kick-tumbao',
  label: 'Tumbao kick: 1, 2&, 3, 4',
  style: 'latin',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 1, max: 3 },
  atoms: [kick(B1, 0.85), kick(B2 + _8off, 0.75), kick(B3, 0.8), kick(B4, 0.75)],
};

const latinKickMontuno: DrumMolecule = {
  id: 'latin-kick-montuno',
  label: 'Montuno kick: синкопированный',
  style: 'latin',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 2, max: 3 },
  atoms: [
    kick(B1, 0.85),
    kick(B1 + _8off, 0.65),
    kick(B2 + _8off, 0.75),
    kick(B3 + _8off, 0.7),
    kick(B4, 0.8),
  ],
};

const latinHihatCascara: DrumMolecule = {
  id: 'latin-hihat-cascara',
  label: 'Hihat + cascara комбинация',
  style: 'latin',
  bars: 1,
  category: 'groove',
  tags: ['hihat'],
  complexity: { min: 1, max: 3 },
  atoms: [
    hhClosed(B1, 0.55),
    hhClosed(B1 + _8off, 0.4),
    hhClosed(B2, 0.55),
    hhClosed(B2 + _8off, 0.4),
    hhClosed(B3, 0.55),
    hhClosed(B3 + _16a, 0.4),
    hhClosed(B4, 0.55),
    hhClosed(B4 + _8off, 0.4),
  ],
};

const latinCrashAccent: DrumMolecule = {
  id: 'latin-crash-accent',
  label: 'Crash на 1',
  style: 'latin',
  bars: 1,
  category: 'accent',
  tags: ['crash'],
  complexity: { min: 1, max: 3 },
  conditions: { requireCrash: true },
  atoms: [crash(B1, 0.9)],
};

const latinFillTimbal: DrumMolecule = {
  id: 'latin-fill-timbal',
  label: 'Timbal-style fill',
  style: 'latin',
  bars: 1,
  category: 'fill',
  tags: ['tom', 'fill'],
  complexity: { min: 2, max: 3 },
  conditions: { requireToms: true },
  atoms: [tomHi(B4, 0.6), rim(B4 + _16e, 0.65), tomHi(B4 + _16and, 0.7), tomLo(B4 + _16a, 0.75)],
};

const latinFillConga: DrumMolecule = {
  id: 'latin-fill-conga',
  label: 'Conga-style томовый fill',
  style: 'latin',
  bars: 1,
  category: 'fill',
  tags: ['tom', 'fill'],
  complexity: { min: 3, max: 3 },
  conditions: { requireToms: true },
  atoms: [
    tomLo(B4, 0.6),
    tomHi(B4 + _16e, 0.65),
    tomLo(B4 + _16and, 0.7),
    tomHi(B4 + _16a, 0.75),
    tomLo(B4 + _16a + PPQ / 8, 0.8),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// BALLAD molecules
// ═══════════════════════════════════════════════════════════════════════════════

const balladRideSoft: DrumMolecule = {
  id: 'ballad-ride-soft',
  label: 'Мягкий ride (только доли)',
  style: 'ballad',
  bars: 1,
  category: 'groove',
  tags: ['ride'],
  complexity: { min: 1, max: 3 },
  atoms: [ride(B1, 0.65), ride(B2, 0.6), ride(B3, 0.65), ride(B4, 0.6)],
};

const balladRideBrushes: DrumMolecule = {
  id: 'ballad-ride-brushes',
  label: 'Ride + stir (имитация щёток)',
  style: 'ballad',
  bars: 1,
  category: 'groove',
  tags: ['ride', 'stir'],
  complexity: { min: 2, max: 3 },
  conditions: { requireStir: true },
  atoms: [
    ride(B1, 0.55),
    stir(B1 + _8off, 0.3),
    ride(B2, 0.5),
    stir(B2 + _8off, 0.3),
    ride(B3, 0.55),
    stir(B3 + _8off, 0.35),
    ride(B4, 0.5),
  ],
};

const balladKickFeathering: DrumMolecule = {
  id: 'ballad-kick-feathering',
  label: 'Bass drum feathering (очень мягко)',
  style: 'ballad',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 1, max: 3 },
  atoms: [kick(B1, 0.45), kick(B2, 0.3), kick(B3, 0.4), kick(B4, 0.3)],
};

const balladKickTwoFeel: DrumMolecule = {
  id: 'ballad-kick-two-feel',
  label: 'Kick на 1 и 3 (two-feel)',
  style: 'ballad',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 1, max: 3 },
  atoms: [kick(B1, 0.55), kick(B3, 0.5)],
};

const balladSnareCrossstick: DrumMolecule = {
  id: 'ballad-snare-crossstick',
  label: 'Cross-stick на 2 и 4',
  style: 'ballad',
  bars: 1,
  category: 'groove',
  tags: ['snare'],
  complexity: { min: 1, max: 3 },
  atoms: [
    { sound: 'snare_crossstick' as DrumSound, atTick: B2, velocity: 0.55, durationTicks: PPQ },
    { sound: 'snare_crossstick' as DrumSound, atTick: B4, velocity: 0.5, durationTicks: PPQ },
  ],
};

const balladSnareSoft: DrumMolecule = {
  id: 'ballad-snare-soft',
  label: 'Snare на 2 и 4 (мягко)',
  style: 'ballad',
  bars: 1,
  category: 'groove',
  tags: ['snare'],
  complexity: { min: 2, max: 3 },
  atoms: [snare(B2, 0.55), snare(B4, 0.5)],
};

const balladHihatChick: DrumMolecule = {
  id: 'ballad-hihat-chick',
  label: 'Hihat chick на 2 и 4 (очень тихо)',
  style: 'ballad',
  bars: 1,
  category: 'groove',
  tags: ['hihat'],
  complexity: { min: 1, max: 3 },
  atoms: [hhClosed(B2, 0.3), hhClosed(B4, 0.3)],
};

const balladStirTexture: DrumMolecule = {
  id: 'ballad-stir-texture',
  label: 'Stir текстурный слой',
  style: 'ballad',
  bars: 1,
  category: 'texture',
  tags: ['stir'],
  complexity: { min: 2, max: 3 },
  conditions: { requireStir: true },
  atoms: [
    stir(B1 + _8off, 0.35),
    stir(B2, 0.3),
    stir(B2 + _8off, 0.35),
    stir(B3, 0.3),
    stir(B3 + _8off, 0.35),
    stir(B4, 0.3),
  ],
};

const balladCrashSoft: DrumMolecule = {
  id: 'ballad-crash-soft',
  label: 'Мягкий crash (sizzle) на 1',
  style: 'ballad',
  bars: 1,
  category: 'accent',
  tags: ['crash'],
  complexity: { min: 1, max: 3 },
  conditions: { requireCrash: true },
  atoms: [
    { sound: 'crash_sizzle' as DrumSound, atTick: B1, velocity: 0.6, durationTicks: PPQ * 3 },
  ],
};

const balladFillBrush: DrumMolecule = {
  id: 'ballad-fill-brush',
  label: 'Мягкий fill (snare ghost + cross-stick)',
  style: 'ballad',
  bars: 1,
  category: 'fill',
  tags: ['snare', 'fill'],
  complexity: { min: 2, max: 3 },
  atoms: [
    ghostSnare(B4, 0.25),
    {
      sound: 'snare_crossstick' as DrumSound,
      atTick: B4 + _16and,
      velocity: 0.35,
      durationTicks: 60,
    },
    ghostSnare(B4 + _16a, 0.3),
  ],
};

const balladFillTomSwell: DrumMolecule = {
  id: 'ballad-fill-tom-swell',
  label: 'Томовый swell (крещендо)',
  style: 'ballad',
  bars: 2,
  category: 'fill',
  tags: ['tom', 'fill'],
  complexity: { min: 3, max: 3 },
  conditions: { requireToms: true },
  atoms: [
    tomLo(B1, 0.3),
    tomHi(B1 + PPQ, 0.35),
    tomLo(B2, 0.4),
    tomHi(B2 + PPQ, 0.45),
    tomLo(B3, 0.5),
    tomHi(B3 + PPQ, 0.55),
    tomLo(B4, 0.6),
    tomHi(B4 + PPQ, 0.7),
  ],
};

const balladEndingRitard: DrumMolecule = {
  id: 'ballad-ending-ritard',
  label: 'Замедляющийся ending',
  style: 'ballad',
  bars: 2,
  category: 'ending',
  tags: ['snare', 'crash'],
  complexity: { min: 1, max: 3 },
  atoms: [
    ride(B1, 0.4),
    ride(B3, 0.45),
    ride(B1 + PPQ * 4, 0.5),
    snare(B2 + PPQ * 4, 0.4),
    crash(B3 + PPQ * 4, 0.5, PPQ * 4),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SWING — additional molecules
// ═══════════════════════════════════════════════════════════════════════════════

const swingRideSkip: DrumMolecule = {
  id: 'swing-ride-skip',
  label: 'Ride с skip на 3-й доле (ding ding-a-ding вариация)',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['ride'],
  complexity: { min: 2, max: 3 },
  atoms: [
    ride(B1, 0.55),
    ride(B1 + _8off, 0.42),
    ride(B2, 0.48),
    ride(B2 + _8off, 0.4),
    ride(B3, 0.52),
    ride(B3 + _16e, 0.32),
    ride(B3 + _8off, 0.42),
    ride(B4, 0.48),
  ],
};

const swingFeathering4: DrumMolecule = {
  id: 'swing-feathering-4',
  label: 'Bass drum feathering: 1, 2&, 3, 4& (более синкопировано)',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 2, max: 3 },
  atoms: [kick(B1, 0.55), kick(B2 + _8off, 0.38), kick(B3, 0.48), kick(B4 + _8off, 0.32)],
};

const swingFeatheringVariation1: DrumMolecule = {
  id: 'swing-feathering-variation-1',
  label: 'Bass drum лёгкий на слабые доли (2 и 4)',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 1, max: 2 },
  atoms: [kick(B2, 0.28), kick(B4, 0.25)],
};

const swingFeatheringWeak1: DrumMolecule = {
  id: 'swing-feathering-weak-1',
  label: 'Bass drum слабые доли 2 и 4',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 1, max: 2 },
  atoms: [kick(B2, 0.32), kick(B4, 0.3)],
};

const swingFeatheringWeak2: DrumMolecule = {
  id: 'swing-feathering-weak-2',
  label: 'Bass drum слабые доли с pickup (1&, 2, 3&, 4)',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 2, max: 3 },
  atoms: [kick(B1 + _8off, 0.25), kick(B2, 0.34), kick(B3 + _8off, 0.24), kick(B4, 0.32)],
};

const swingFeatheringWeak3: DrumMolecule = {
  id: 'swing-feathering-weak-3',
  label: 'Bass drum слабые доли с оффбитом (2, 2&, 4)',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 2, max: 3 },
  atoms: [kick(B2, 0.32), kick(B2 + _8off, 0.22), kick(B4, 0.3)],
};

const swingFeatheringWeak4: DrumMolecule = {
  id: 'swing-feathering-weak-4',
  label: 'Bass drum только оффбиты (1&, 2&, 3&, 4&)',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 2, max: 3 },
  atoms: [
    kick(B1 + _8off, 0.24),
    kick(B2 + _8off, 0.22),
    kick(B3 + _8off, 0.26),
    kick(B4 + _8off, 0.24),
  ],
};

const swingHihatClave: DrumMolecule = {
  id: 'swing-hihat-clave',
  label: 'Hihat chick в ритме 3-side clave (1, 2&, 4)',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['hihat'],
  complexity: { min: 2, max: 3 },
  atoms: [hh(B1, 0.42), hh(B2 + _8off, 0.35), hh(B4, 0.38)],
};

const swingFillCrescendo: DrumMolecule = {
  id: 'swing-fill-crescendo',
  label: 'Snare crescendo fill (3 удара с нарастанием)',
  style: 'swing',
  bars: 1,
  category: 'fill',
  tags: ['snare', 'fill'],
  complexity: { min: 2, max: 3 },
  atoms: [snare(B4, 0.38), snare(B4 + _16e, 0.45), snare(B4 + _16and, 0.55)],
};

const swingFillSnareComp: DrumMolecule = {
  id: 'swing-fill-snare-comp',
  label: 'Snare comping fill (ghost-ноты + акцент на 4)',
  style: 'swing',
  bars: 1,
  category: 'fill',
  tags: ['snare', 'fill', 'ghost'],
  complexity: { min: 2, max: 3 },
  atoms: [
    ghostSnare(B1 + _16e, 0.16),
    ghostSnare(B2 + _16a, 0.14),
    ghostSnare(B3 + _16e, 0.18),
    ghostSnare(B3 + _16a, 0.2),
    snare(B4, 0.42),
  ],
};

const swingSnareHalfTime: DrumMolecule = {
  id: 'swing-snare-half-time',
  label: 'Snare на 3-й доле (half-time feel)',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['snare'],
  complexity: { min: 1, max: 2 },
  atoms: [snare(B3, 0.55)],
};

const swingStirAll4: DrumMolecule = {
  id: 'swing-stir-all4',
  label: 'Stir на всех 4 долях (щёточная текстура)',
  style: 'swing',
  bars: 1,
  category: 'texture',
  tags: ['stir'],
  complexity: { min: 2, max: 3 },
  conditions: { requireStir: true },
  atoms: [stir(B1, 0.32), stir(B2, 0.32), stir(B3, 0.32), stir(B4, 0.35)],
};

const swingSnareCrossstick: DrumMolecule = {
  id: 'swing-snare-crossstick',
  label: 'Cross-stick на 2 и 4 (для щёток/баллады)',
  style: 'swing',
  bars: 1,
  category: 'groove',
  tags: ['snare', 'crossstick'],
  complexity: { min: 1, max: 3 },
  conditions: { requireSnare: true },
  atoms: [
    { sound: 'snare_crossstick' as DrumSound, atTick: B2, velocity: 0.42, durationTicks: PPQ },
    { sound: 'snare_crossstick' as DrumSound, atTick: B4, velocity: 0.38, durationTicks: PPQ },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOSSA NOVA — additional molecules
// ═══════════════════════════════════════════════════════════════════════════════

const bossaKickBaiao: DrumMolecule = {
  id: 'bossa-kick-baiao',
  label: 'Baiao-style kick: 1, 3 (two-feel bossa)',
  style: 'bossa',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 1, max: 3 },
  atoms: [kick(B1, 0.9), kick(B3, 0.85)],
};

const bossaRideSamba: DrumMolecule = {
  id: 'bossa-ride-samba',
  label: 'Ride samba-паттерн: 1, 1&, 2, 2a, 3, 3&, 4, 4a',
  style: 'bossa',
  bars: 1,
  category: 'groove',
  tags: ['ride'],
  complexity: { min: 2, max: 3 },
  atoms: [
    ride(B1, 0.8),
    ride(B1 + _8off, 0.65),
    ride(B2, 0.75),
    ride(B2 + _16a, 0.6),
    ride(B3, 0.8),
    ride(B3 + _8off, 0.65),
    ride(B4, 0.75),
    ride(B4 + _16a, 0.6),
  ],
};

const bossaFillSurdo: DrumMolecule = {
  id: 'bossa-fill-surdo',
  label: 'Surdo-style fill (низкий том)',
  style: 'bossa',
  bars: 1,
  category: 'fill',
  tags: ['tom', 'fill'],
  complexity: { min: 2, max: 3 },
  conditions: { requireToms: true },
  atoms: [tomLo(B4, 0.7), tomLo(B4 + _8off, 0.75), tomLo(B4 + _16and, 0.8)],
};

// ─── BOSSA NOVA — 2-тактовый канонический son-clave / samba-kick ────────────
// Референс: rhythm-wheel диаграмма (Cross Stick = пентагон/5 акцентов = son
// clave 3-2; Bass Drum = семиугольник/7 акцентов = синкопированный surdo-kick;
// Hi-hat = непрерывная субдивизия, уже покрыта `bossaHihat8ths`). Клаве и kick
// живут в клетке КАЖДЫЙ в одиночном пуле клипа (не смешивать с другими
// молекулами в том же клипе — иначе движок независимо перевыбирает молекулу
// на КАЖДЫЙ такт и 2-тактовая фраза распадается на полутакты разных молекул).

const bossaClaveSon32: DrumMolecule = {
  id: 'bossa-clave-son-3-2',
  label: 'Son clave 3-2 (канонический bossa-клаве)',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['rim'],
  complexity: { min: 1, max: 3 },
  atoms: [
    // Bar 1 (3-side): beats 1, 2&, 4
    rim(B1, 0.85),
    rim(B2 + _8off, 0.75),
    rim(B4, 0.75),
    // Bar 2 (2-side): beats 1, 2&
    rim(B1 + PPQ * 4, 0.85),
    rim(B2 + _8off + PPQ * 4, 0.75),
  ],
};

const bossaKickSamba2Bar: DrumMolecule = {
  id: 'bossa-kick-samba-2bar',
  label: 'Samba-surdo kick 2-тактовый (call-response)',
  style: 'bossa',
  bars: 2,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 2, max: 3 },
  atoms: [
    // Bar 1 (call): 1, 2&, 3&, 4
    kick(B1, 0.9),
    kick(B2 + _8off, 0.7),
    kick(B3 + _8off, 0.75),
    kick(B4, 0.85),
    // Bar 2 (response): 1, 2&, 3&
    kick(B1 + PPQ * 4, 0.9),
    kick(B2 + _8off + PPQ * 4, 0.7),
    kick(B3 + _8off + PPQ * 4, 0.75),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNK — additional molecules
// ═══════════════════════════════════════════════════════════════════════════════

const funkKickPocket: DrumMolecule = {
  id: 'funk-kick-pocket',
  label: 'Pocket kick: 1, 1a, 3 (простой, но грувовый)',
  style: 'funk',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 1, max: 3 },
  atoms: [kick(B1, 0.9), kick(B1 + _16a, 0.55), kick(B3, 0.85)],
};

const funkSnareShuffle: DrumMolecule = {
  id: 'funk-snare-shuffle',
  label: 'Snare shuffle на 16-х (ghosted shuffle)',
  style: 'funk',
  bars: 1,
  category: 'texture',
  tags: ['snare', 'ghost'],
  complexity: { min: 2, max: 3 },
  atoms: [
    ghostSnare(B1 + _16a, 0.2),
    ghostSnare(B2 + _16e, 0.2),
    ghostSnare(B2 + _16a, 0.22),
    ghostSnare(B3 + _16e, 0.2),
    ghostSnare(B3 + _16a, 0.22),
    ghostSnare(B4 + _16e, 0.25),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// LATIN — additional molecules
// ═══════════════════════════════════════════════════════════════════════════════

const latinCascara3: DrumMolecule = {
  id: 'latin-cascara-3',
  label: 'Cascara вариация с усиленными акцентами',
  style: 'latin',
  bars: 1,
  category: 'groove',
  tags: ['ride', 'rim'],
  complexity: { min: 2, max: 3 },
  atoms: [
    ride(B1, 0.9),
    ride(B1 + _8off, 0.75),
    ride(B2 + _8off, 0.7),
    ride(B3, 0.85),
    ride(B3 + _8off, 0.75),
    ride(B4 + _16a, 0.7),
  ],
};

const latinKickBombo: DrumMolecule = {
  id: 'latin-kick-bombo',
  label: 'Bombo kick: 1, 3 (простой латино)',
  style: 'latin',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 1, max: 3 },
  atoms: [kick(B1, 0.9), kick(B3, 0.85)],
};

const latinFillBombo: DrumMolecule = {
  id: 'latin-fill-bombo',
  label: 'Bombo-style fill: том + kick',
  style: 'latin',
  bars: 1,
  category: 'fill',
  tags: ['tom', 'kick', 'fill'],
  complexity: { min: 2, max: 3 },
  conditions: { requireToms: true },
  atoms: [tomLo(B4, 0.65), kick(B4 + _8off, 0.7), tomLo(B4 + _16and, 0.75)],
};

// ═══════════════════════════════════════════════════════════════════════════════
// BALLAD — additional molecules
// ═══════════════════════════════════════════════════════════════════════════════

const balladRideTriplet: DrumMolecule = {
  id: 'ballad-ride-triplet',
  label: 'Ride триольный (мягкий)',
  style: 'ballad',
  bars: 1,
  category: 'groove',
  tags: ['ride'],
  complexity: { min: 2, max: 3 },
  atoms: [
    ride(B1, 0.5),
    ride(B1 + PPQ / 3, 0.35),
    ride(B1 + (PPQ * 2) / 3, 0.3),
    ride(B2, 0.45),
    ride(B2 + PPQ / 3, 0.3),
    ride(B2 + (PPQ * 2) / 3, 0.25),
    ride(B3, 0.5),
    ride(B3 + PPQ / 3, 0.35),
    ride(B3 + (PPQ * 2) / 3, 0.3),
    ride(B4, 0.45),
    ride(B4 + PPQ / 3, 0.3),
    ride(B4 + (PPQ * 2) / 3, 0.25),
  ],
};

const balladKickWaltz: DrumMolecule = {
  id: 'ballad-kick-waltz',
  label: 'Kick только на 1 (вальсовый feel)',
  style: 'ballad',
  bars: 1,
  category: 'groove',
  tags: ['kick'],
  complexity: { min: 1, max: 3 },
  atoms: [kick(B1, 0.55)],
};

const balladHihatSizzle: DrumMolecule = {
  id: 'ballad-hihat-sizzle',
  label: 'Hihat sizzle (чуть приоткрытый, постоянный)',
  style: 'ballad',
  bars: 1,
  category: 'groove',
  tags: ['hihat'],
  complexity: { min: 2, max: 3 },
  atoms: [
    hhClosed(B1, 0.25),
    hhClosed(B1 + _8off, 0.2),
    hhClosed(B2, 0.25),
    hhClosed(B2 + _8off, 0.2),
    hhClosed(B3, 0.25),
    hhClosed(B3 + _8off, 0.2),
    hhClosed(B4, 0.25),
    hhClosed(B4 + _8off, 0.2),
  ],
};

const balladFillTriplet: DrumMolecule = {
  id: 'ballad-fill-triplet',
  label: 'Триольный fill (snare + cross-stick)',
  style: 'ballad',
  bars: 1,
  category: 'fill',
  tags: ['snare', 'fill'],
  complexity: { min: 2, max: 3 },
  atoms: [
    ghostSnare(B4, 0.3),
    {
      sound: 'snare_crossstick' as DrumSound,
      atTick: B4 + PPQ / 3,
      velocity: 0.4,
      durationTicks: 60,
    },
    ghostSnare(B4 + (PPQ * 2) / 3, 0.35),
    ghostSnare(B4 + _16a, 0.3),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// Generic accent molecules (crash) — используются accent-лейнами клеток
// ═══════════════════════════════════════════════════════════════════════════════

const accentCrash: DrumMolecule = {
  id: 'accent-crash',
  label: 'Crash (accent)',
  style: 'swing',
  bars: 1,
  category: 'accent',
  tags: ['crash'],
  complexity: { min: 1, max: 3 },
  atoms: [crash(B1, 0.9)],
};

const accentCrashSizzle: DrumMolecule = {
  id: 'accent-crash-sizzle',
  label: 'Crash sizzle (accent)',
  style: 'funk',
  bars: 1,
  category: 'accent',
  tags: ['crash_sizzle'],
  complexity: { min: 1, max: 3 },
  atoms: [{ sound: 'crash_sizzle' as DrumSound, atTick: B1, velocity: 0.9, durationTicks: PPQ }],
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT: All molecules keyed by ID
// ═══════════════════════════════════════════════════════════════════════════════

const BASE_DRUM_MOLECULES: Record<string, DrumMolecule> = {
  // Swing
  'swing-ride-basic': swingRideBasic,
  'swing-ride-variation-1': swingRideVariation1,
  'swing-ride-variation-2': swingRideVariation2,
  'swing-feathering-1': swingFeathering1,
  'swing-foot-chick': swingFootChick,
  'swing-feathering-2': swingFeathering2,
  'swing-feathering-3': swingFeathering3,
  'swing-snare-backbeat': swingSnareBackbeat,
  'swing-snare-ghost-phrase': swingSnareGhostPhrase,
  'swing-stir-texture': swingStirTexture,
  'swing-crash-accent': swingCrashAccent,
  'swing-fill-triplet-1': swingFillTriplet1,
  'swing-fill-tom-run': swingFillTomRun,
  'swing-intro-4clicks': swingIntro4Clicks,
  'swing-ending-crash': swingEndingCrash,
  'swing-ride-skip': swingRideSkip,
  'swing-feathering-4': swingFeathering4,
  'swing-feathering-variation-1': swingFeatheringVariation1,
  'swing-feathering-weak-1': swingFeatheringWeak1,
  'swing-feathering-weak-2': swingFeatheringWeak2,
  'swing-feathering-weak-3': swingFeatheringWeak3,
  'swing-feathering-weak-4': swingFeatheringWeak4,
  'swing-hihat-clave': swingHihatClave,
  'swing-fill-crescendo': swingFillCrescendo,
  'swing-fill-snare-comp': swingFillSnareComp,
  'swing-snare-half-time': swingSnareHalfTime,
  'swing-stir-all4': swingStirAll4,
  'swing-snare-crossstick': swingSnareCrossstick,

  // Bossa Nova
  'bossa-clave-rim-1': bossaClaveRim1,
  'bossa-clave-rim-2': bossaClaveRim2,
  'bossa-clave-xstick': bossaClaveXstick,
  'bossa-clave-2-3': bossaClave23,
  'bossa-clave-sync': bossaClaveSync,
  'bossa-kick-partido': bossaKickPartido,
  'bossa-kick-syncopated': bossaKickSyncopated,
  'bossa-kick-lounge': bossaKickLounge,
  'bossa-hihat-8ths': bossaHihat8ths,
  'bossa-hihat-chick': bossaHihatChick,
  'bossa-ride-bossa': bossaRideBossa,
  'bossa-fill-tom-samba': bossaFillTomSamba,
  'bossa-fill-rim-variation': bossaFillRimVariation,
  'bossa-crash-accent': bossaCrashAccent,
  'bossa-kick-baiao': bossaKickBaiao,
  'bossa-ride-samba': bossaRideSamba,
  'bossa-fill-surdo': bossaFillSurdo,
  'bossa-clave-son-3-2': bossaClaveSon32,
  'bossa-kick-samba-2bar': bossaKickSamba2Bar,

  // Funk
  'funk-kick-linear-1': funkKickLinear1,
  'funk-kick-linear-2': funkKickLinear2,
  'funk-kick-ghosted': funkKickGhosted,
  'funk-snare-backbeat': funkSnareBackbeat,
  'funk-snare-rimshot': funkSnareRimshot,
  'funk-snare-ghost-16ths': funkSnareGhost16ths,
  'funk-snare-buzz-phrase': funkSnareBuzzPhrase,
  'funk-snare-flam-accent': funkSnareFlamAccent,
  'funk-hihat-16ths': funkHihat16ths,
  'funk-hihat-open-offbeat': funkHihatOpenOffbeat,
  'funk-hihat-bark': funkHihatBark,
  'funk-ride-bell': funkRideBell,
  'funk-crash-sizzle': funkCrashSizzle,
  'funk-fill-16ths': funkFill16ths,
  'funk-fill-tom-bass': funkFillTomBass,
  'funk-fill-buzz-flam': funkFillBuzzFlam,
  'funk-intro-4bars': funkIntro4Bars,
  'funk-kick-pocket': funkKickPocket,
  'funk-snare-shuffle': funkSnareShuffle,

  // Latin
  'latin-cascara-1': latinCascara1,
  'latin-cascara-2': latinCascara2,
  'latin-clave-son-2-3': latinClaveSon23,
  'latin-clave-son-3-2': latinClaveSon32,
  'latin-clave-rumba-3-2': latinClaveRumba32,
  'latin-kick-tumbao': latinKickTumbao,
  'latin-kick-montuno': latinKickMontuno,
  'latin-hihat-cascara': latinHihatCascara,
  'latin-crash-accent': latinCrashAccent,
  'latin-fill-timbal': latinFillTimbal,
  'latin-fill-conga': latinFillConga,
  'latin-cascara-3': latinCascara3,
  'latin-kick-bombo': latinKickBombo,
  'latin-fill-bombo': latinFillBombo,

  // Ballad
  'ballad-ride-soft': balladRideSoft,
  'ballad-ride-brushes': balladRideBrushes,
  'ballad-kick-feathering': balladKickFeathering,
  'ballad-kick-two-feel': balladKickTwoFeel,
  'ballad-snare-crossstick': balladSnareCrossstick,
  'ballad-snare-soft': balladSnareSoft,
  'ballad-hihat-chick': balladHihatChick,
  'ballad-stir-texture': balladStirTexture,
  'ballad-crash-soft': balladCrashSoft,
  'ballad-fill-brush': balladFillBrush,
  'ballad-fill-tom-swell': balladFillTomSwell,
  'ballad-ending-ritard': balladEndingRitard,
  'ballad-ride-triplet': balladRideTriplet,
  'ballad-kick-waltz': balladKickWaltz,
  'ballad-hihat-sizzle': balladHihatSizzle,
  'ballad-fill-triplet': balladFillTriplet,

  // Generic accents
  'accent-crash': accentCrash,
  'accent-crash-sizzle': accentCrashSizzle,
};

/**
 * Итоговый реестр молекул. Если сгенерированный (сохранённый из Конструктора)
 * реестр непуст — он ПОЛНОСТЬЮ замещает базовый (поддержка удаления молекул).
 */
export const DRUM_MOLECULES: Record<string, DrumMolecule> =
  Object.keys(GENERATED_DRUM_MOLECULES).length > 0
    ? (GENERATED_DRUM_MOLECULES as Record<string, DrumMolecule>)
    : BASE_DRUM_MOLECULES;

/** All molecules as an array (for iteration) */
export const DRUM_MOLECULE_LIST: DrumMolecule[] = Object.values(DRUM_MOLECULES);

/** Get molecules for a specific style */
export function getMoleculesForStyle(style: DrumMolecule['style']): DrumMolecule[] {
  return DRUM_MOLECULE_LIST.filter((m) => m.style === style);
}

/** Get molecules for a specific category within a style */
export function getMoleculesForCategory(
  style: DrumMolecule['style'],
  category: MoleculeCategory,
): DrumMolecule[] {
  return DRUM_MOLECULE_LIST.filter((m) => m.style === style && m.category === category);
}
