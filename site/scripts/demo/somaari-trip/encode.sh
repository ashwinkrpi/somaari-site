#!/usr/bin/env bash
# Build the somaari-trip demo loop from the repo's guide screenshots (sample data from a
# SEED_SAMPLE_DATA=true server, so no real location history), not a screen recording:
# overview -> colour by speed -> trip list -> stop popup, crossfaded, ending back on the overview
# for a clean seam. Each 1280x800 shot is cropped to 1280x720 (16:9, like the other cards) starting
# CROP_Y px down: the default 66 drops the app's header row, whose "Self-Hosted" label the site
# must not show (the site doesn't mention self-hosting).
#   scripts/demo/somaari-trip/encode.sh
set -euo pipefail
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO="${SOMAARI_TRIP_DIR:-${AI_PROJECTS:-$HOME/code/ai-projects}/somaari-trip}"
IMG="$REPO/docs/images"
SHOTS=(overview speed trips stop-popup overview)
HOLD="${HOLD:-2.4}"   # seconds each shot is fully visible
FADE="${FADE:-0.6}"
CROP_Y="${CROP_Y:-66}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

inputs=(); fc=""
for i in "${!SHOTS[@]}"; do
  inputs+=(-loop 1 -t "$(awk -v h="$HOLD" -v f="$FADE" 'BEGIN { print h + f }')" -i "$IMG/${SHOTS[$i]}.jpg")
  fc+="[$i:v]crop=1280:720:0:$CROP_Y,fps=30,format=yuv420p,setsar=1[v$i];"
done
prev="v0"; off=0
for ((i = 1; i < ${#SHOTS[@]}; i++)); do
  off="$(awk -v o="$off" -v h="$HOLD" 'BEGIN { print o + h }')"
  fc+="[$prev][v$i]xfade=transition=fade:duration=$FADE:offset=$off[x$i];"
  prev="x$i"
done
# Drop the final overview's hold: the loop restarts on the first one.
END="$(awk -v o="$off" -v f="$FADE" 'BEGIN { print o + f }')"
fc+="[$prev]trim=0:$END[out]"
ffmpeg -loglevel error -y "${inputs[@]}" -filter_complex "$fc" -map "[out]" -c:v libx264 -crf 4 \
  -preset fast -pix_fmt yuv420p "$TMP/slides.mkv"
export POSTER_AT="${POSTER_AT:-0.5}"
"$HERE/../encode.sh" "$TMP/slides.mkv" somaari-trip
