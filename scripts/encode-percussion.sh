#!/bin/sh
# Encode Latin percussion WAV samples to .m4a (AAC) + .mp3
#
# Source: CC0 percussion library in _source/percussion/
# Each sound → 4 round-robin variants (RR1–RR4)
#
# Output:
#   apps/web/public/samples/aac/percussion/   — AAC (primary)
#   apps/web/public/samples/mp3/percussion/   — MP3 (fallback)

set -e

SRC="apps/web/public/samples/_source/percussion"
DST_AAC="apps/web/public/samples/aac/percussion"
DST_MP3="apps/web/public/samples/mp3/percussion"

mkdir -p "$DST_AAC" "$DST_MP3"

# Remove previously generated files
rm -f "$DST_AAC"/*.m4a "$DST_MP3"/*.mp3

encode() {
  src="$1"
  dst_name="$2"
  aac_out="$DST_AAC/${dst_name}.m4a"
  mp3_out="$DST_MP3/${dst_name}.mp3"
  echo "  $dst_name"
  ffmpeg -y -i "$src" -codec:a aac -b:a 192k "$aac_out" 2>/dev/null
  ffmpeg -y -i "$src" -codec:a libmp3lame -b:a 192k "$mp3_out" 2>/dev/null
}

encode4() {
  prefix="$1"
  src_pattern="$2"
  for rr in 1 2 3 4; do
    src_file=$(echo "$src_pattern" | sed "s/{N}/$rr/g")
    encode "$src_file" "${prefix}_rr${rr}"
  done
}

# ═══════════════════════════════════════════════════════════════════════════════

echo "=== Clave (claves) ==="
encode4 "clave" "$SRC/claves/Claves1_Hit_v2_rr{N}_Close.wav"

echo ""
echo "=== Cowbell ==="
encode4 "cowbell" "$SRC/cowbell/Cowbell1_Normal_v2_rr{N}_Close.wav"

echo ""
echo "=== Shaker ==="
encode4 "shaker" "$SRC/shaker/LShaker_Shake1U_rr{N}_Close.wav"

echo ""
echo "=== Conga High (bongoh) ==="
encode4 "conga_hi" "$SRC/bongoh/BongoH_Hit1_v2_rr{N}_Close.wav"

echo ""
echo "=== Conga Low (conga) ==="
encode4 "conga_lo" "$SRC/conga/Conga_22_HitN_51_100_rr{N}_Close.wav"

echo ""
echo "=== Bongo Low (bongol) ==="
encode4 "bongo_lo" "$SRC/bongol/BongoL_Hit1_v2_rr{N}_Close.wav"

echo ""
echo "=== Tumba (low conga) ==="
encode4 "tumba" "$SRC/tumba/Tumba_24_HitN_71_100_rr{N}_Close.wav"

echo ""
echo "=== Timbales (agogo) ==="
encode4 "timbales" "$SRC/agogo/Agogo_High_v2_rr{N}_Close.wav"

echo ""
echo "=== Guiro ==="
encode4 "guiro" "$SRC/guiro/Guiro_Fast_rr{N}_Close.wav"

echo ""
echo "=== Cabasa ==="
encode4 "cabasa" "$SRC/cabasa/Cabasa1_Rub_v2_rr{N}_Close.wav"

echo ""
echo "=== Triangle ==="
encode4 "triangle" "$SRC/triangle/Triangle1_Hit_v1_rr{N}_Close.wav"

echo ""
echo "=== Tambourine ==="
encode4 "tambourine" "$SRC/tambourine/Tamb1_Shake_rr{N}_Close.wav"

echo ""
echo "=== Vibraslap ==="
encode4 "vibraslap" "$SRC/vibraslap/Vibraslap1_1_Hit_71_127_rr{N}_Close.wav"

echo ""
echo "=== Belltree ==="
encode4 "belltree" "$SRC/belltree/BellTree_Stroke_rr{N}_Close.wav"

echo ""
echo "=== Whistle ==="
for rr in 1 2 3 4; do
  src_file="$SRC/whistle/Close_BallWhistle_Short-00${rr}.wav"
  encode "$src_file" "whistle_rr${rr}"
done

echo ""
echo "=== Sleigh Bells ==="
encode4 "sleigh_bells" "$SRC/sleighbells/Sleighbells_Hit_rr{N}_Close.wav"

# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo "Done."
echo "  AAC: $(ls "$DST_AAC"/*.m4a 2>/dev/null | wc -l | tr -d ' ') files"
echo "  MP3: $(ls "$DST_MP3"/*.mp3 2>/dev/null | wc -l | tr -d ' ') files"
