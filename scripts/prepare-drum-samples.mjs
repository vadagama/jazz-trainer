#!/usr/bin/env node
/**
 * prepare-drum-samples.mjs — Конвертация драм-сэмплов (Jazz Kit + Funk Kit)
 */
import { execSync } from 'child_process';
import { mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SOURCE = join(ROOT, 'apps/web/public/samples/_source/drums');
const AAC = join(ROOT, 'apps/web/public/samples/aac/drums');
const MP3 = join(ROOT, 'apps/web/public/samples/mp3/drums');

function ff(codec, bitrate, ext) {
  return (input, output) => {
    const dir = dirname(output);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (existsSync(output)) {
      console.log('  skip:', output);
      return;
    }
    console.log('  ' + ext + ':', output);
    execSync(`ffmpeg -y -i "${input}" -c:a ${codec} -b:a ${bitrate} "${output}" 2>/dev/null`, {
      stdio: 'pipe',
    });
  };
}
const aac = ff('aac', '128k', 'aac');
const mp3 = ff('libmp3lame', '128k', 'mp3');

/**
 * Find a source file matching a pattern.
 * Tries suffixes in order, returns first match.
 */
function findSrc(folder, prefix, vl, rr, suffixes) {
  for (const sfx of suffixes) {
    const name = `${prefix}_vl${vl}_rr${rr}${sfx}`;
    const path = join(folder, name);
    if (existsSync(path)) return path;
  }
  return null;
}

/**
 * Find any file matching vl+rr in a folder (for irregular naming).
 */
function findAny(folder, vl, rr) {
  const files = readdirSync(folder).filter(
    (f) => f.includes(`_vl${vl}_rr${rr}`) && !f.startsWith('.'),
  );
  return files.length > 0 ? join(folder, files[0]) : null;
}

// ══════════════════════════════════════════════════════════════════════════════
// Jazz Kit
// ══════════════════════════════════════════════════════════════════════════════

function jazzKit() {
  console.log('\n=== Jazz Kit ===');
  const S = join(SOURCE, 'Swirly.Drums_1104');
  const A = join(AAC, 'jazz-drum-kit');
  const M = join(MP3, 'jazz-drum-kit');
  let count = 0;

  function convert(srcFolder, prefix, vl, rr, outName, suffixes) {
    const src = findSrc(srcFolder, prefix, vl, rr, suffixes);
    if (!src) {
      console.error(`  MISSING: ${prefix}_vl${vl}_rr${rr} in ${srcFolder}`);
      return false;
    }
    aac(src, join(A, outName + '.m4a'));
    mp3(src, join(M, outName + '.mp3'));
    count++;
    return true;
  }

  const SRC = S;

  // kick: marching_kick_vl{N}_rr{N}_beater.wav (some _reso)
  const kickSfx = ['_beater.wav', '_reso.wav', '.wav'];
  const kickVls = [
    ['1', 'vl1'],
    ['5', 'vl5'],
    ['10', 'vl10'],
    ['15', 'vl15'],
    ['20', 'vl20'],
  ];
  for (const [sv, ov] of kickVls)
    for (let r = 1; r <= 4; r++)
      convert(join(SRC, 'kick'), 'marching_kick', sv, r, `kick_${ov}_rr${r}`, kickSfx);

  // snare_center: snare_hit_vl{N}_rr{N}_{top,btm}.wav
  const snSfx = ['_top.wav', '_btm.wav', '.wav'];
  const snVls = [
    ['1', 'vl1'],
    ['5', 'vl5'],
    ['10', 'vl10'],
    ['15', 'vl15'],
    ['20', 'vl20'],
  ];
  for (const [sv, ov] of snVls)
    for (let r = 1; r <= 4; r++)
      convert(join(SRC, 'snare_main'), 'snare_hit', sv, r, `center_${ov}_rr${r}`, snSfx);

  // snare_edge
  const edgeSfx = ['_top.wav', '_btm.wav', '.wav'];
  for (const [sv, ov] of [
    ['1', 'vl1'],
    ['10', 'vl10'],
    ['20', 'vl20'],
  ])
    for (let r = 1; r <= 4; r++)
      convert(join(SRC, 'snare_edge'), 'snare_edge', sv, r, `edge_${ov}_rr${r}`, edgeSfx);

  // snare_dig
  for (const [sv, ov] of [
    ['1', 'vl1'],
    ['10', 'vl10'],
    ['20', 'vl20'],
  ])
    for (let r = 1; r <= 4; r++)
      convert(join(SRC, 'snare_dig'), 'snare_dig', sv, r, `dig_${ov}_rr${r}`, [
        '_top.wav',
        '_btm.wav',
        '.wav',
      ]);

  // hihat_closed: hh_closed_vl{N}_rr{N}.wav
  const hhSfx = ['.wav'];
  for (const [sv, ov] of [
    ['1', 'vl1'],
    ['5', 'vl5'],
    ['10', 'vl10'],
    ['12', 'vl15'],
    ['12', 'vl20'],
  ])
    for (let r = 1; r <= 4; r++)
      convert(join(SRC, 'hat_closed'), 'hh_closed', sv, r, `closed_${ov}_rr${r}`, hhSfx);

  // hihat_open
  for (const [sv, ov] of [
    ['1', 'vl1'],
    ['10', 'vl10'],
    ['20', 'vl20'],
  ])
    for (let r = 1; r <= 4; r++)
      convert(join(SRC, 'hat_open'), 'hh_open', sv, r, `open_${ov}_rr${r}`, hhSfx);

  // hihat_foot
  for (const [sv, ov] of [
    ['1', 'vl1'],
    ['5', 'vl10'],
    ['9', 'vl20'],
  ])
    for (let r = 1; r <= 4; r++)
      convert(join(SRC, 'hat_foot'), 'hh_foot', sv, r, `foot_${ov}_rr${r}`, hhSfx);

  // ride_bow
  const rideSfx = ['.wav'];
  for (const [sv, ov] of [
    ['1', 'vl1'],
    ['5', 'vl5'],
    ['10', 'vl10'],
    ['15', 'vl15'],
    ['15', 'vl20'],
  ])
    for (let r = 1; r <= 4; r++)
      convert(join(SRC, 'ride'), 'ride', sv, r, `bow_${ov}_rr${r}`, rideSfx);

  // crash
  for (const [sv, ov] of [
    ['1', 'vl1'],
    ['10', 'vl10'],
    ['12', 'vl20'],
  ])
    for (let r = 1; r <= 4; r++)
      convert(join(SRC, 'crash'), 'crash', sv, r, `crash_${ov}_rr${r}`, ['.wav']);

  // splash
  for (const [sv, ov] of [
    ['1', 'vl1'],
    ['10', 'vl10'],
  ])
    for (let r = 1; r <= 4; r++)
      convert(join(SRC, 'splash'), 'splash', sv, r, `splash_${ov}_rr${r}`, ['.wav']);

  // tom_mhi
  for (const [sv, ov] of [
    ['1', 'vl1'],
    ['10', 'vl10'],
    ['20', 'vl20'],
  ])
    for (let r = 1; r <= 4; r++)
      convert(join(SRC, 'tom_mhi'), 'tom_mhi', sv, r, `mhi_${ov}_rr${r}`, ['.wav']);

  // tom_mlow
  for (const [sv, ov] of [
    ['1', 'vl1'],
    ['10', 'vl10'],
    ['20', 'vl20'],
  ])
    for (let r = 1; r <= 4; r++)
      convert(join(SRC, 'tom_mlow'), 'tom_mlow', sv, r, `mlow_${ov}_rr${r}`, ['.wav']);

  // stir: s14_stir_dl{N}_rr1.wav → 4 RR
  console.log('  stir...');
  const stirMap = { rr1: 'dl1', rr2: 'dl2', rr3: 'dl3', rr4: 'dl4' };
  for (const [rr, dl] of Object.entries(stirMap)) {
    const src = join(SRC, 'stir', `s14_stir_${dl}_rr1.wav`);
    const altSrc = join(SRC, 'stir', `s14_stir_${dl}_rr1.flac`);
    const realSrc = existsSync(src) ? src : altSrc;
    if (existsSync(realSrc)) {
      aac(realSrc, join(A, `stir_${rr}.m4a`));
      mp3(realSrc, join(M, `stir_${rr}.mp3`));
      count++;
    }
  }

  console.log(`  Jazz Kit: ${count} files converted`);
}

// ══════════════════════════════════════════════════════════════════════════════
// Funk Kit
// ══════════════════════════════════════════════════════════════════════════════

function funkKit() {
  console.log('\n=== Funk Kit ===');
  const S = join(SOURCE, 'virtuosity-drums');
  const A = join(AAC, 'funk-drum-kit');
  const M = join(MP3, 'funk-drum-kit');
  let count = 0;

  function job(srcRel, outName) {
    const src = join(S, srcRel);
    if (!existsSync(src)) {
      console.error(`  MISSING: ${srcRel}`);
      return;
    }
    aac(src, join(A, outName + '.m4a'));
    mp3(src, join(M, outName + '.mp3'));
    count++;
  }

  // kick
  for (const [ov, sv] of Object.entries({ vl1: '1', vl2: '3', vl3: '5' }))
    for (let r = 1; r <= 4; r++) job(`kick/ks_vl${sv}_rr${r}.wav`, `kick_${ov}_rr${r}`);

  // snare_center: 5 слоёв, соседние vl как RR
  for (const { ov, base } of [
    { ov: 'vl1', base: 1 },
    { ov: 'vl2', base: 8 },
    { ov: 'vl3', base: 18 },
    { ov: 'vl4', base: 28 },
    { ov: 'vl5', base: 33 },
  ])
    for (let r = 1; r <= 4; r++)
      job(`snare/mid_snare_center_vl${base + r - 1}.flac`, `center_${ov}_rr${r}`);

  // snare_buzz, snare_flam: одинаковые слои
  const buzz = [
    { ov: 'vl1', base: 1 },
    { ov: 'vl2', base: 6 },
    { ov: 'vl3', base: 9 },
  ];
  for (const { ov, base } of buzz) {
    for (let r = 1; r <= 4; r++) {
      job(`snare/mid_snare_buzz_vl${base + r - 1}.flac`, `buzz_${ov}_rr${r}`);
      job(`snare/mid_snare_flam_vl${base + r - 1}.flac`, `flam_${ov}_rr${r}`);
    }
  }

  // snare_crossstick, snare_muted
  const cs = [
    { ov: 'vl1', base: 1 },
    { ov: 'vl2', base: 13 },
  ];
  for (const { ov, base } of cs) {
    for (let r = 1; r <= 4; r++) {
      job(`snare/mid_snare_crossstick_vl${base + r - 1}.flac`, `crossstick_${ov}_rr${r}`);
      job(`snare/mid_snare_muted_vl${base + r - 1}.flac`, `muted_${ov}_rr${r}`);
    }
  }

  // snare_rimshot
  for (const { ov, base } of [
    { ov: 'vl1', base: 1 },
    { ov: 'vl2', base: 5 },
    { ov: 'vl3', base: 9 },
  ])
    for (let r = 1; r <= 4; r++)
      job(`snare/mid_snare_rimshot_vl${base + r - 1}.flac`, `rimshot_${ov}_rr${r}`);

  // hihat
  for (const [ov, sv] of Object.entries({ vl1: '1', vl2: '2', vl3: '4' }))
    for (let r = 1; r <= 4; r++) job(`hh/mid_hh_closed_vl${sv}_rr${r}.flac`, `closed_${ov}_rr${r}`);

  for (const [ov, sv] of Object.entries({ vl1: '1', vl2: '3' }))
    for (let r = 1; r <= 3; r++) job(`hh/mid_hh_open_vl${sv}_rr${r}.flac`, `open_${ov}_rr${r}`);

  for (const [ov, sv] of Object.entries({ vl1: '1', vl2: '2' }))
    for (let r = 1; r <= 4; r++) job(`hh/mid_hh_pedal_vl${sv}_rr${r}.flac`, `pedal_${ov}_rr${r}`);

  // ride
  for (const [ov, sv] of Object.entries({ vl1: '1', vl2: '2', vl3: '4' }))
    for (let r = 1; r <= 4; r++) job(`ride/mid_ride_ride_vl${sv}_rr${r}.flac`, `bow_${ov}_rr${r}`);

  for (const [ov, sv] of Object.entries({ vl1: '1', vl2: '2', vl3: '3' }))
    for (let r = 1; r <= 3; r++) job(`ride/mid_ride_bell_vl${sv}_rr${r}.flac`, `bell_${ov}_rr${r}`);

  // crash + sizzle
  for (const [ov, sv] of Object.entries({ vl1: '1', vl2: '2', vl3: '3' })) {
    for (let r = 1; r <= 4; r++) {
      job(`crash/mid_crash_crash_vl${sv}_rr${r}.flac`, `crash_${ov}_rr${r}`);
      job(`crash/mid_crash_sizzle_vl${sv}_rr${r}.flac`, `sizzle_${ov}_rr${r}`);
    }
  }

  // toms (no RR)
  for (const [ov, sv] of Object.entries({ vl1: '1', vl2: '8', vl3: '16' }))
    job(`htom/mid_htom_center_vl${sv}.flac`, `htom_${ov}`);

  for (const [ov, sv] of Object.entries({ vl1: '2', vl2: '8', vl3: '16' }))
    job(`ltom/mid_ltom_center_vl${sv}.flac`, `ltom_${ov}`);

  console.log(`  Funk Kit: ${count} files converted`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

try {
  jazzKit();
  funkKit();
  console.log('\n=== Done! ===');
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
