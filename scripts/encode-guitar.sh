#!/bin/sh
# Convert Spanish Classical Guitar FLAC samples to AAC (.m4a) + MP3
#
# Source: FreePats CC0 — Spanish classical guitar (roberto@zenvoid.org)
# Output: apps/web/public/samples/{aac,mp3}/guitar/nylon-guitar/
#
# Usage: sh scripts/encode-guitar.sh

set -e

SRC="apps/web/public/samples/_source/nylon-guitar/samples"
DST_AAC="apps/web/public/samples/aac/guitar/nylon-guitar"
DST_MP3="apps/web/public/samples/mp3/guitar/nylon-guitar"

mkdir -p "$DST_AAC" "$DST_MP3"

echo "=== Spanish Classical Guitar (FreePats CC0) ==="
echo "Source: $SRC/"
echo "Output AAC: $DST_AAC/"
echo "Output MP3: $DST_MP3/"
echo ""

count=0
for f in "$SRC"/*.flac; do
  name="${f##*/}"
  base_lower="$(echo "${name%.flac}" | tr '[:upper:]' '[:lower:]')"

  # Convert # to s for URL-safe filenames (e.g. F#3 → fs3)
  base="$(echo "$base_lower" | sed 's/#/s/g')"

  echo "  $name → ${base}.m4a / ${base}.mp3"

  ffmpeg -y -i "$f" -codec:a aac -b:a 192k "$DST_AAC/${base}.m4a" 2>/dev/null
  ffmpeg -y -i "$f" -codec:a libmp3lame -b:a 192k "$DST_MP3/${base}.mp3" 2>/dev/null
  count=$((count + 1))
done

echo ""
echo "Done: $count samples converted."
