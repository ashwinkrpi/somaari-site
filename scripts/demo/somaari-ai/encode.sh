#!/usr/bin/env bash
# Encode the newest somaari-ai raw recording into assets/demos/somaari-ai/ using its .times
# edit points: typing at 3x, the AI wait squeezed to 0.8 s, then proposal + output at 1x.
#   scripts/demo/somaari-ai/encode.sh [raw.mkv]
set -euo pipefail
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO="${SOMAARI_AI_DIR:-${AI_PROJECTS:-$HOME/code/ai-projects}/somaari-ai}"
RAW="${1:-$(ls -t "$REPO"/docs/demo/raw-*.mkv | head -1)}"
# shellcheck source=/dev/null
source "${RAW%.mkv}.times"
export SEGMENTS="$TYPE_FROM-$TYPE_TO@3 $TYPE_TO-$THINK_TO=0.8 $SHOW_FROM-$END"
export POSTER_AT="${POSTER_AT:--0.6}"   # negative: seconds before the end (output on screen)
if [[ "$POSTER_AT" == -* ]]; then
  POSTER_AT="$(awk -v a="$TYPE_FROM" -v b="$TYPE_TO" -v c="$SHOW_FROM" -v d="$END" -v p="$POSTER_AT" \
    'BEGIN { printf "%.2f", (b - a) / 3 + 0.8 + (d - c) + p }')"
fi
exec "$HERE/../encode.sh" "$RAW" somaari-ai
