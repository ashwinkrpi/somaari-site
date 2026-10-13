#!/usr/bin/env bash
# encode.sh <input> <app-slug>
# Turn a raw recording into the card loop: assets/demos/<slug>/{loop.webm,loop.mp4,poster.webp}
# (720 px wide, 24 fps, no audio, each video < 1 MB; CRF is raised until it fits).
#
# Optional env:
#   SEGMENTS  space-separated input-time spans to keep, in order. Each is
#             FROM-TO        (normal speed)
#             FROM-TO@N      (N times faster, e.g. typing)
#             FROM-TO=D      (squeezed to D seconds, e.g. a "Thinking..." wait)
#             Default: the whole input. Use it to trim dead time at start/end for a clean seam.
#   CROP      ffmpeg crop=W:H:X:Y applied to the raw first (e.g. to drop a window title bar).
#   POSTER_AT seconds into the *output* loop for the poster frame (default: 70% of the loop).
#   MAX_BYTES size limit per video (default 1000000).
set -euo pipefail

IN="${1:?usage: encode.sh <input> <app-slug>}"
SLUG="${2:?usage: encode.sh <input> <app-slug>}"
SITE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)"
OUT="$SITE_DIR/assets/demos/$SLUG"
MAX_BYTES="${MAX_BYTES:-1000000}"
VF="scale=720:-2,fps=24"
PRE="${CROP:+crop=$CROP,}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

# 1. Cut/speed segments into a near-lossless 720p intermediate.
if [[ -n "${SEGMENTS:-}" ]]; then
  fc=""; labels=""; n=0
  for seg in $SEGMENTS; do
    span="${seg%%[@=]*}"; a="${span%-*}"; b="${span#*-}"
    case "$seg" in
      *@*) pts="(PTS-STARTPTS)/${seg#*@}" ;;
      *=*) pts="(PTS-STARTPTS)*${seg#*=}/($b-$a)" ;;
      *)   pts="PTS-STARTPTS" ;;
    esac
    fc+="[0:v]${PRE}trim=$a:$b,setpts=$pts,fps=24[s$n];"; labels+="[s$n]"; n=$((n + 1))
  done
  fc+="${labels}concat=n=$n:v=1:a=0,$VF[v]"
  ffmpeg -loglevel error -y -i "$IN" -filter_complex "$fc" -map "[v]" -c:v libx264 -crf 4 -preset fast \
    -pix_fmt yuv420p "$TMP/cut.mkv"
else
  ffmpeg -loglevel error -y -i "$IN" -vf "$PRE$VF" -an -c:v libx264 -crf 4 -preset fast -pix_fmt yuv420p "$TMP/cut.mkv"
fi
DUR="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/cut.mkv")"

# 2. Videos, raising CRF until each is under the limit.
fits() { (($(stat -c %s "$1") < MAX_BYTES)); }
crf=28
while :; do
  ffmpeg -loglevel error -y -i "$TMP/cut.mkv" -vf "$VF" -c:v libx264 -crf "$crf" -preset slow \
    -pix_fmt yuv420p -movflags +faststart -an "$OUT/loop.mp4"
  fits "$OUT/loop.mp4" && break
  ((crf >= 40)) && { echo "loop.mp4 still over $MAX_BYTES at CRF 40: trim the input" >&2; exit 1; }
  crf=$((crf + 2))
done
MP4_CRF=$crf
crf=38
while :; do
  ffmpeg -loglevel error -y -i "$TMP/cut.mkv" -vf "$VF" -c:v libvpx-vp9 -crf "$crf" -b:v 0 -row-mt 1 \
    -an "$OUT/loop.webm"
  fits "$OUT/loop.webm" && break
  ((crf >= 56)) && { echo "loop.webm still over $MAX_BYTES at CRF 56: trim the input" >&2; exit 1; }
  crf=$((crf + 3))
done
WEBM_CRF=$crf

# 3. Poster: one frame of the loop, same dimensions.
POSTER_AT="${POSTER_AT:-$(awk -v d="$DUR" 'BEGIN { printf "%.2f", d * 0.7 }')}"
ffmpeg -loglevel error -y -ss "$POSTER_AT" -i "$TMP/cut.mkv" -frames:v 1 -c:v libwebp -quality 82 \
  "$OUT/poster.webp"

WH="$(ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=s=x:p=0 "$OUT/loop.mp4")"
printf '%s: %s, %.1fs | mp4 %s B (crf %s) | webm %s B (crf %s) | poster %s B @ %ss\n' "$SLUG" "$WH" "$DUR" \
  "$(stat -c %s "$OUT/loop.mp4")" "$MP4_CRF" "$(stat -c %s "$OUT/loop.webm")" "$WEBM_CRF" \
  "$(stat -c %s "$OUT/poster.webp")" "$POSTER_AT"
