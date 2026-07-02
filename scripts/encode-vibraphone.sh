#!/bin/sh
# Encode vibraphone samples from .wav to .m4a (AAC) and .mp3
#
# Source naming: Vibes_soft_{NOTE}_{VEL}_rr{RR}_Main.wav
#   {VEL}:  v1 = soft velocity,  v2 = hard velocity
#
# Target naming: vibraphone_{NOTE}_{layer}.m4a/.mp3
#   {layer}: soft (from v1), hard (from v2)
#
# Range: F2–E5, 11 notes, major-second/minor-third spacing.

set -e

SRC="apps/web/public/samples/_source/vibraphone"
DST_AAC="apps/web/public/samples/aac/vibraphone"
DST_MP3="apps/web/public/samples/mp3/vibraphone"

mkdir -p "$DST_AAC" "$DST_MP3"

for f in "$SRC"/Vibes_soft_*_v1_rr1_Main.wav; do
  [ -f "$f" ] || continue
  name="${f##*/}"
  # Vibes_soft_F2_v1_rr1_Main.wav → F2
  base=$(echo "$name" | sed 's/Vibes_soft_\(.*\)_v1_rr1_Main\.wav/\1/')
  echo "Encoding $base (soft)"

  ffmpeg -y -i "$f" -codec:a aac -b:a 192k "$DST_AAC/vibraphone_${base}_soft.m4a" 2>/dev/null
  ffmpeg -y -i "$f" -codec:a libmp3lame -b:a 192k "$DST_MP3/vibraphone_${base}_soft.mp3" 2>/dev/null
done

for f in "$SRC"/Vibes_soft_*_v2_rr1_Main.wav; do
  [ -f "$f" ] || continue
  name="${f##*/}"
  base=$(echo "$name" | sed 's/Vibes_soft_\(.*\)_v2_rr1_Main\.wav/\1/')
  echo "Encoding $base (hard)"

  ffmpeg -y -i "$f" -codec:a aac -b:a 192k "$DST_AAC/vibraphone_${base}_hard.m4a" 2>/dev/null
  ffmpeg -y -i "$f" -codec:a libmp3lame -b:a 192k "$DST_MP3/vibraphone_${base}_hard.mp3" 2>/dev/null
done

echo ""
echo "Done."
echo "  AAC: $DST_AAC/"
echo "  MP3: $DST_MP3/"
ls -lh "$DST_AAC/"
