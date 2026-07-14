/**
 * Bass instrument manifests — re-exported from @jazz/music-core.
 *
 * The engine (`BassInstrument`), pattern-engine molecules/cells/organisms and
 * the sample-layer builders all live in music-core (pure, no browser APIs),
 * following the INSTRUMENT-PLUGIN.md target architecture: "the engine lives in
 * core, the plugin supplies only manifest + sample routing."
 *
 * Two manifests are contributed:
 *  - {@link uprightBassManifest}  (id `upright-bass`) — swing / bossa / ballad
 *  - {@link electricBassManifest} (id `electric-bass`) — funk / latin
 *
 * Both share a single {@link BassInstrument} class that adapts its variant
 * (and thus its articulation palette + sample library) to the active style.
 */
export { uprightBassManifest, electricBassManifest } from '@jazz/music-core';
