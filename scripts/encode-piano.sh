#!/bin/sh
# Encode piano samples from .wav/.flac to .m4a (AAC) and .mp3
#
# Upright Piano KW: 2 velocity layers already named vL/vH.
# Salamander Grand Piano V3: 16 velocity layers → pick v4 (soft) and v12 (hard).

set -e

# ─── Upright Piano KW ──────────────────────────────────────────────────────────

SRC_UPRIGHT="apps/web/public/samples/_source/piano/UprightPianoKW-SFZ-20220221"
DST_UPRIGHT_AAC="apps/web/public/samples/aac/piano/upright"
DST_UPRIGHT_MP3="apps/web/public/samples/mp3/piano/upright"

mkdir -p "$DST_UPRIGHT_AAC" "$DST_UPRIGHT_MP3"

echo "=== Upright Piano KW ==="
for f in "$SRC_UPRIGHT"/*.wav; do
  name="${f##*/}"
  base="$(echo "${name%.wav}" | sed 's/D#/Ds/g; s/F#/Fs/g')"
  echo "  $base"
  ffmpeg -y -i "$f" -codec:a aac -b:a 192k "$DST_UPRIGHT_AAC/${base}.m4a" 2>/dev/null
  ffmpeg -y -i "$f" -codec:a libmp3lame -b:a 192k "$DST_UPRIGHT_MP3/${base}.mp3" 2>/dev/null
done

# ─── Salamander Grand Piano V3 ────────────────────────────────────────────────

SRC_SALAMANDER="apps/web/public/samples/_source/piano/SalamanderGrandPianoV3_44.1khz16bit"
DST_SALAMANDER_AAC="apps/web/public/samples/aac/piano/salamander"
DST_SALAMANDER_MP3="apps/web/public/samples/mp3/piano/salamander"

mkdir -p "$DST_SALAMANDER_AAC" "$DST_SALAMANDER_MP3"

# Salamander has 16 velocity layers (v1–v16) per note.
# We pick v4 (soft, ~mp) and v12 (hard, ~f).
# Filename pattern: {Note}v{layer}.wav → {Note}v{layer}.m4a/.mp3
# Notes: A, C, D#, F# at chromatic anchor points (minor-third spacing).

echo ""
echo "=== Salamander Grand Piano V3 (v4 + v12 layers) ==="
for f in "$SRC_SALAMANDER"/*v4.wav "$SRC_SALAMANDER"/*v12.wav; do
  [ -f "$f" ] || continue
  name="${f##*/}"
  base="$(echo "${name%.wav}" | sed 's/D#/Ds/g; s/F#/Fs/g')"
  echo "  $base"
  ffmpeg -y -i "$f" -codec:a aac -b:a 192k "$DST_SALAMANDER_AAC/${base}.m4a" 2>/dev/null
  ffmpeg -y -i "$f" -codec:a libmp3lame -b:a 192k "$DST_SALAMANDER_MP3/${base}.mp3" 2>/dev/null
done

# ─── VSUpright1 (Versilian Studios Upright #1) ────────────────────────────────

SRC_VSUPRIGHT="apps/web/public/samples/_source/piano/VSUpright1_SFZ/Samples/Sustains"
DST_VSUPRIGHT_AAC="apps/web/public/samples/aac/piano/upright"
DST_VSUPRIGHT_MP3="apps/web/public/samples/mp3/piano/upright"

# Clear destination dirs to remove old KW samples
rm -rf "$DST_VSUPRIGHT_AAC" "$DST_VSUPRIGHT_MP3"
mkdir -p "$DST_VSUPRIGHT_AAC" "$DST_VSUPRIGHT_MP3"

echo ""
echo "=== VSUpright1 (3 velocity layers × 2 round-robins) ==="
for f in "$SRC_VSUPRIGHT"/*.flac; do
  name="${f##*/}"
  # Upright1_Sus_C0_vl1_rr1.flac → C0_vl1_rr1
  base="$(echo "${name%.flac}" | sed 's/^Upright1_Sus_//')"
  echo "  $base"
  ffmpeg -y -i "$f" -codec:a aac -b:a 192k "$DST_VSUPRIGHT_AAC/${base}.m4a" 2>/dev/null
  ffmpeg -y -i "$f" -codec:a libmp3lame -b:a 192k "$DST_VSUPRIGHT_MP3/${base}.mp3" 2>/dev/null
done

echo ""
echo "Done."
