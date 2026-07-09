/**
 * All drum sounds addressable across every kit.
 *
 * The first block is the abstract sound-role vocabulary emitted by
 * {@link DrumInstrument} (kit-agnostic). The second block is the concrete
 * articulation vocabulary of the velocity-layered jazz / funk kits; the
 * per-kit articulation maps route abstract roles → concrete articulations.
 */
export type DrumSound =
  // ── Abstract (legacy) sound roles ──
  | 'bassDrum'
  | 'snare'
  | 'hihat'
  | 'hihatHalf'
  | 'hihatOpen'
  | 'ride'
  | 'crash'
  | 'rim'
  | 'highTom'
  | 'lowTom'
  // ── Concrete articulations (jazz / funk kits) ──
  | 'kick'
  | 'snare_center'
  | 'snare_edge'
  | 'snare_dig'
  | 'snare_buzz'
  | 'snare_flam'
  | 'snare_crossstick'
  | 'snare_muted'
  | 'snare_rimshot'
  | 'hihat_closed'
  | 'hihat_tight'
  | 'hihat_open'
  | 'hihat_foot'
  | 'hihat_stir'
  | 'ride_bow'
  | 'ride_bell'
  | 'crash_sizzle'
  | 'splash'
  | 'tom_mhi'
  | 'tom_mlow'
  | 'tom_hi'
  | 'tom_lo';
