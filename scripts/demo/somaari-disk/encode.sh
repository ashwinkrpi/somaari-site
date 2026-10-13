#!/usr/bin/env bash
# Encode the newest somaari-disk raw recording into assets/demos/somaari-disk/.
# Keeps from just after the window paints (skips the desktop and the white first paint) to the end.
#   scripts/demo/somaari-disk/encode.sh [raw.mkv]
set -euo pipefail
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO="${SOMAARI_DISK_DIR:-${AI_PROJECTS:-$HOME/code/ai-projects}/somaari-disk}"
RAW="${1:-$(ls -t "$REPO"/docs/demo/raw-*.mkv | head -1)}"
# shellcheck source=/dev/null
source "${RAW%.mkv}.times"
START="${START:-$(awk -v a="$APPEARED" 'BEGIN { printf "%.2f", a + 0.85 }')}"
export SEGMENTS="$START-$(awk -v e="$END" 'BEGIN { printf "%.2f", e - 0.6 }')"
# The GTK window's xwininfo origin includes the 28 px title bar + 2 px border: crop them off.
export CROP="${CROP:-1276:692:2:28}"
export POSTER_AT="${POSTER_AT:-4.0}"   # the finished top-level list, largest first
exec "$HERE/../encode.sh" "$RAW" somaari-disk
