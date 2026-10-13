#!/usr/bin/env bash
# Encode the newest somaari-plan raw recording into assets/demos/somaari-plan/.
# Spans follow record.sh's fixed timeline (check the frames after re-recording):
#   1.3-2.4  click into the text box (2x) | 2.4-5.6 paste + Generate | 5.6-8.6 preview (2x)
#   8.6-10.4 End, Add 8 tasks, back to top | 10.6-END Calendar week view
#   scripts/demo/somaari-plan/encode.sh [raw.mkv]
set -euo pipefail
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO="${SOMAARI_PLAN_DIR:-${AI_PROJECTS:-$HOME/code/ai-projects}/somaari-plan}"
RAW="${1:-$(ls -t "$REPO"/docs/demo/raw-*.mkv | head -1)}"
# shellcheck source=/dev/null
source "${RAW%.mkv}.times"
E="$(awk -v e="$END" 'BEGIN { printf "%.2f", e - 0.2 }')"
export SEGMENTS="${SEGMENTS:-1.3-2.4@2 2.4-5.6 5.6-8.6@2 8.6-10.4 10.6-$E}"
export POSTER_AT="${POSTER_AT:--1}"
if [[ "$POSTER_AT" == -* ]]; then POSTER_AT="$(awk -v e="$E" -v p="$POSTER_AT" 'BEGIN { printf "%.2f", 0.55 + 3.2 + 1.5 + 1.8 + (e - 10.6) + p }')"; fi
exec "$HERE/../encode.sh" "$RAW" somaari-plan
