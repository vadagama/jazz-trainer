#!/bin/sh
# Encode organ samples from .wav to .m4a (AAC) and .mp3
#
# Source: FreePats Drawbar Organ Emulation (CC0)
#   http://freepats.zenvoid.org/Organ/electric-organ.html
#
# Anchors: C, E, G# at every octave from C2 to C7 (16 samples, major-third spacing).
# Single velocity layer → duplicated as soft/hard for 2-layer registry.

set -e

SRC="apps/web/public/samples/_source/organ/samples"
DST_AAC="apps/web/public/samples/aac/organ"
DST_MP3="apps/web/public/samples/mp3/organ"

mkdir -p "$DST_AAC" "$DST_MP3"

for f in "$SRC"/*.wav; do
  name="${f##*/}"
  base="${name%.wav}"
  # G# → Gs for filename safety (sharp → s)
  base_safe=$(echo "$base" | sed 's/#/s/g')
  echo "Encoding $base → organ_${base_safe}_soft + organ_${base_safe}_hard"

  ffmpeg -y -i "$f" -codec:a aac -b:a 192k "$DST_AAC/organ_${base_safe}_soft.m4a" 2>/dev/null
  cp "$DST_AAC/organ_${base_safe}_soft.m4a" "$DST_AAC/organ_${base_safe}_hard.m4a"

  ffmpeg -y -i "$f" -codec:a libmp3lame -b:a 192k "$DST_MP3/organ_${base_safe}_soft.mp3" 2>/dev/null
  cp "$DST_MP3/organ_${base_safe}_soft.mp3" "$DST_MP3/organ_${base_safe}_hard.mp3"
done

echo ""
echo "Done."
echo "  AAC: $DST_AAC/"
echo "  MP3: $DST_MP3/"
ls -lh "$DST_AAC/"
