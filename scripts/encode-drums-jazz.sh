#!/bin/sh
# Encode Swirly Drums 1104 WAV samples → .m4a (AAC) + .mp3
#
# Source: Swirly.Drums_1104 (CC0) in _source/drums/Swirly.Drums_1104/
# Each articulation → 4 velocity layers (vl5, vl10, vl15, vl20) × 4 round-robin
#
# Velocity remapping (many articulations lack vl15+):
#   Source vl5  → dst vl5   (p)
#   Source vl10 → dst vl10  (mf)
#   Source vlN  → dst vl15  (f) — highest available layer
#   Source vlN  → dst vl20  (ff) — same, top layer ceiling
#
# Snare mics: uses _top (top mic) variant for all snare articulations.
# Kick: strips marching_ prefix and _beater suffix.
# Stir: source uses dl1–dl4 (dynamic layers), maps to rr1–rr4.
#
# Output:
#   apps/web/public/samples/aac/drums/jazz-drum-kit/   — AAC (primary)
#   apps/web/public/samples/mp3/drums/jazz-drum-kit/   — MP3 (fallback)

set -e

SRC="apps/web/public/samples/_source/drums/Swirly.Drums_1104"
DST_AAC="apps/web/public/samples/aac/drums/jazz-drum-kit"
DST_MP3="apps/web/public/samples/mp3/drums/jazz-drum-kit"

mkdir -p "$DST_AAC" "$DST_MP3"

# Remove previously generated files
rm -f "$DST_AAC"/*.m4a "$DST_MP3"/*.mp3

encode() {
  src="$1"
  dst_name="$2"
  aac_out="$DST_AAC/${dst_name}.m4a"
  mp3_out="$DST_MP3/${dst_name}.mp3"
  if [ ! -f "$src" ]; then
    echo "  SKIP (missing source): $src"
    return 0
  fi
  echo "  $dst_name"
  ffmpeg -y -i "$src" -codec:a aac -b:a 192k "$aac_out" 2>/dev/null
  ffmpeg -y -i "$src" -codec:a libmp3lame -b:a 192k "$mp3_out" 2>/dev/null
}

# Encode one articulation × velocity layer × 4 RR.
# Usage: encode_layer <src_path_pattern> <dst_prefix> <src_vl> <dst_vl>
# src_path_pattern uses {V} for velocity and {R} for round-robin.
encode_layer() {
  src_pattern="$1"
  dst_prefix="$2"
  src_vl="$3"
  dst_vl="$4"
  for rr in 1 2 3 4; do
    src_file=$(echo "$src_pattern" | sed "s/{V}/$src_vl/g; s/{R}/$rr/g")
    dst_file="${dst_prefix}_${dst_vl}_rr${rr}"
    encode "$src_file" "$dst_file"
  done
}

# Encode 4 layers for an articulation that has vl5/10/15/20 in source.
encode_full() {
  src_pattern="$1"
  dst="$2"
  encode_layer "$src_pattern" "$dst" "vl5"  "vl5"
  encode_layer "$src_pattern" "$dst" "vl10" "vl10"
  encode_layer "$src_pattern" "$dst" "vl15" "vl15"
  encode_layer "$src_pattern" "$dst" "vl20" "vl20"
}

# Encode 2+2 layers: vl5/vl10 direct, vl15/vl20 both from top available layer.
encode_2x2() {
  src_pattern="$1"
  dst="$2"
  top_vl="$3"
  encode_layer "$src_pattern" "$dst" "vl5"  "vl5"
  encode_layer "$src_pattern" "$dst" "vl10" "vl10"
  encode_layer "$src_pattern" "$dst" "$top_vl" "vl15"
  encode_layer "$src_pattern" "$dst" "$top_vl" "vl20"
}

# ═══════════════════════════════════════════════════════════════════════════════

echo "=== Kick (vl1–vl22) ==="
encode_full "$SRC/kick/marching_kick_{V}_rr{R}_beater.wav" "kick"

echo ""
echo "=== Ride Bow (vl1–vl15) ==="
# ride has vl15 but not vl20 → vl20 uses vl15
encode_layer "$SRC/ride/ride_{V}_rr{R}.wav" "bow" "vl5"  "vl5"
encode_layer "$SRC/ride/ride_{V}_rr{R}.wav" "bow" "vl10" "vl10"
encode_layer "$SRC/ride/ride_{V}_rr{R}.wav" "bow" "vl15" "vl15"
encode_layer "$SRC/ride/ride_{V}_rr{R}.wav" "bow" "vl15" "vl20"

echo ""
echo "=== Ride Bell (uses ride vl15) ==="
encode_layer "$SRC/ride/ride_{V}_rr{R}.wav" "bell" "vl10" "vl5"
encode_layer "$SRC/ride/ride_{V}_rr{R}.wav" "bell" "vl15" "vl10"
encode_layer "$SRC/ride/ride_{V}_rr{R}.wav" "bell" "vl15" "vl15"
encode_layer "$SRC/ride/ride_{V}_rr{R}.wav" "bell" "vl15" "vl20"

echo ""
echo "=== Snare Center (vl1–vl12, _top mic) ==="
encode_2x2 "$SRC/snare_main/snare_hit_{V}_rr{R}_top.wav" "center" "vl12"

echo ""
echo "=== Snare Edge (vl1–vl10, _top mic) ==="
encode_2x2 "$SRC/snare_edge/snare_edge_{V}_rr{R}_top.wav" "edge" "vl10"

echo ""
echo "=== Snare Dig (vl1–vl6, vl10, _top mic) ==="
encode_2x2 "$SRC/snare_dig/snare_dig_{V}_rr{R}_top.wav" "dig" "vl10"

echo ""
echo "=== Hi-hat Closed (vl1–vl12) ==="
encode_2x2 "$SRC/hat_closed/hh_closed_{V}_rr{R}.wav" "closed" "vl12"

echo ""
echo "=== Hi-hat Tight (vl1–vl15) ==="
encode_layer "$SRC/hat_tight/hh_tight_{V}_rr{R}.wav" "tight" "vl5"  "vl5"
encode_layer "$SRC/hat_tight/hh_tight_{V}_rr{R}.wav" "tight" "vl10" "vl10"
encode_layer "$SRC/hat_tight/hh_tight_{V}_rr{R}.wav" "tight" "vl15" "vl15"
encode_layer "$SRC/hat_tight/hh_tight_{V}_rr{R}.wav" "tight" "vl15" "vl20"

echo ""
echo "=== Hi-hat Open (vl1–vl14) ==="
encode_layer "$SRC/hat_open/hh_open_{V}_rr{R}.wav" "open" "vl5"  "vl5"
encode_layer "$SRC/hat_open/hh_open_{V}_rr{R}.wav" "open" "vl10" "vl10"
encode_layer "$SRC/hat_open/hh_open_{V}_rr{R}.wav" "open" "vl14" "vl15"
encode_layer "$SRC/hat_open/hh_open_{V}_rr{R}.wav" "open" "vl14" "vl20"

echo ""
echo "=== Hi-hat Foot (vl1–vl9) ==="
encode_layer "$SRC/hat_foot/hh_foot_{V}_rr{R}.wav" "foot" "vl5" "vl5"
encode_layer "$SRC/hat_foot/hh_foot_{V}_rr{R}.wav" "foot" "vl9" "vl10"
encode_layer "$SRC/hat_foot/hh_foot_{V}_rr{R}.wav" "foot" "vl9" "vl15"
encode_layer "$SRC/hat_foot/hh_foot_{V}_rr{R}.wav" "foot" "vl9" "vl20"

echo ""
echo "=== Hi-hat Stir (dl1–dl4 → rr1–rr4) ==="
for dl in 1 2 3 4; do
  src_file="$SRC/stir/s14_stir_dl${dl}_rr1.wav"
  encode "$src_file" "stir_rr${dl}"
done

echo ""
echo "=== Crash (vl1–vl12) ==="
encode_2x2 "$SRC/crash/crash_{V}_rr{R}.wav" "crash" "vl12"

echo ""
echo "=== Splash (vl1–vl12) ==="
encode_2x2 "$SRC/splash/splash_{V}_rr{R}.wav" "splash" "vl12"

echo ""
echo "=== Tom Mid-High (vl1–vl10) ==="
encode_2x2 "$SRC/tom_mhi/tom_mhi_{V}_rr{R}.wav" "mhi" "vl10"

echo ""
echo "=== Tom Mid-Low (vl1–vl12) ==="
encode_2x2 "$SRC/tom_mlow/tom_mlow_{V}_rr{R}.wav" "mlow" "vl12"

# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "Done."
echo "  AAC: $(ls "$DST_AAC"/*.m4a 2>/dev/null | wc -l | tr -d ' ') files"
echo "  MP3: $(ls "$DST_MP3"/*.mp3 2>/dev/null | wc -l | tr -d ' ') files"
