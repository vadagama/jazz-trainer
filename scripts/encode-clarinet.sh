#!/bin/sh
# Encode clarinet samples from .wav to .m4a (AAC) and .mp3
#
# Source: CC0 clarinet samples, single velocity layer.
#   Files named {Note}.wav (e.g. D3.wav, F3.wav, Bb3.wav)
#
# Target naming: clarinet_{Note}_{layer}.m4a/.mp3
#   Single source → duplicated as soft + hard for 2-layer registry.
#
# Range: D3–Bb5, 9 anchor notes, minor-3rd spacing.

set -e

SRC="apps/web/public/samples/_source/clarinet"
DST_AAC="apps/web/public/samples/aac/clarinet"
DST_MP3="apps/web/public/samples/mp3/clarinet"

mkdir -p "$DST_AAC" "$DST_MP3"

for f in "$SRC"/*.wav; do
  [ -f "$f" ] || continue
  name="${f##*/}"
  base="${name%.wav}"
  echo "Encoding $base → clarinet_${base}_soft + clarinet_${base}_hard"

  ffmpeg -y -i "$f" -codec:a aac -b:a 192k "$DST_AAC/clarinet_${base}_soft.m4a" 2>/dev/null
  cp "$DST_AAC/clarinet_${base}_soft.m4a" "$DST_AAC/clarinet_${base}_hard.m4a"

  ffmpeg -y -i "$f" -codec:a libmp3lame -b:a 192k "$DST_MP3/clarinet_${base}_soft.mp3" 2>/dev/null
  cp "$DST_MP3/clarinet_${base}_soft.mp3" "$DST_MP3/clarinet_${base}_hard.mp3"
done

echo ""
echo "Done."
echo "  AAC: $DST_AAC/"
echo "  MP3: $DST_MP3/"
ls -lh "$DST_AAC/"
