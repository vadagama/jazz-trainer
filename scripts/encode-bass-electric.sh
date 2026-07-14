#!/bin/sh
# Encode Electric Bass samples (darkblack) to AAC (.m4a) + MP3.
#
# Source: apps/web/public/samples/_source/bass/electric-bass/
#   reg   — darkblack_<note>_<vel>_rr<n>.wav   (4 velocity layers: p/mp/mf/f)
#   stac  — darkblack_<note>_stac_rr<n>.wav
#   rel   — darkblack_<note>_rel_rr<n>.wav
#   ghost — darkblack_<note>_ghost_<vel>_rr<n>.wav (2 layers: p/f)
#
# We use only the `f` (forte) velocity layer for reg and ghost (one layer per
# note/articulation/RR), matching the BassSampleRegistry layer builders. The
# output filename keeps the source name verbatim (already lowercase); only the
# extension changes (.wav → .m4a / .mp3).
#
# Output: apps/web/public/samples/{aac,mp3}/bass/electric/<artic>/
#
# Usage: sh scripts/encode-bass-electric.sh

set -e

SRC="apps/web/public/samples/_source/bass/electric-bass"
DST_AAC="apps/web/public/samples/aac/bass/electric"
DST_MP3="apps/web/public/samples/mp3/bass/electric"

mkdir -p "$DST_AAC/reg" "$DST_AAC/stac" "$DST_AAC/rel" "$DST_AAC/ghost" \
         "$DST_MP3/reg" "$DST_MP3/stac" "$DST_MP3/rel" "$DST_MP3/ghost"

echo "=== Electric Bass (darkblack) ==="
echo "Source: $SRC/"
echo "Output AAC: $DST_AAC/"
echo "Output MP3: $DST_MP3/"
echo ""

count=0

# reg: use only the `_f_` (forte) velocity layer.
for f in "$SRC"/reg/darkblack_*_f_rr[0-9].wav; do
  name="${f##*/}"
  base="${name%.wav}"
  ffmpeg -y -i "$f" -codec:a aac -b:a 192k "$DST_AAC/reg/${base}.m4a" 2>/dev/null
  ffmpeg -y -i "$f" -codec:a libmp3lame -b:a 192k "$DST_MP3/reg/${base}.mp3" 2>/dev/null
  count=$((count + 1))
done

# stac: art token only (no velocity layer).
for f in "$SRC"/stac/darkblack_*_stac_rr[0-9].wav; do
  name="${f##*/}"
  base="${name%.wav}"
  ffmpeg -y -i "$f" -codec:a aac -b:a 192k "$DST_AAC/stac/${base}.m4a" 2>/dev/null
  ffmpeg -y -i "$f" -codec:a libmp3lame -b:a 192k "$DST_MP3/stac/${base}.mp3" 2>/dev/null
  count=$((count + 1))
done

# rel: art token only (no velocity layer).
for f in "$SRC"/rel/darkblack_*_rel_rr[0-9].wav; do
  name="${f##*/}"
  base="${name%.wav}"
  ffmpeg -y -i "$f" -codec:a aac -b:a 192k "$DST_AAC/rel/${base}.m4a" 2>/dev/null
  ffmpeg -y -i "$f" -codec:a libmp3lame -b:a 192k "$DST_MP3/rel/${base}.mp3" 2>/dev/null
  count=$((count + 1))
done

# ghost: use only the `_f_` (forte) velocity layer.
for f in "$SRC"/ghost/darkblack_*_ghost_f_rr[0-9].wav; do
  name="${f##*/}"
  base="${name%.wav}"
  ffmpeg -y -i "$f" -codec:a aac -b:a 192k "$DST_AAC/ghost/${base}.m4a" 2>/dev/null
  ffmpeg -y -i "$f" -codec:a libmp3lame -b:a 192k "$DST_MP3/ghost/${base}.mp3" 2>/dev/null
  count=$((count + 1))
done

echo ""
echo "Done: $count samples converted (×2 formats)."
