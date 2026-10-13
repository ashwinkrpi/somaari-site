#!/usr/bin/env bash
# Record the somaari-ai demo: a plain-English request -> AI-proposed command -> safety
# confirmation -> Run once -> output. Runs as pi@somaari in a fresh temp HOME; the app's own
# .env supplies the AI keys (never printed). Writes <repo>/docs/demo/raw-<date>.mkv and a .times
# file of edit points for encode.sh (approximate: check the frames, adjust by hand if needed).
#
#   scripts/demo/somaari-ai/record.sh && scripts/demo/somaari-ai/encode.sh
#
# The AI is openrouter/free, so the proposed command varies between runs. Re-record if you get a
# command that is wrong or less interesting (the best takes show the confirmation dialog).
source "$(dirname -- "${BASH_SOURCE[0]}")/../lib.sh"

REPO="${SOMAARI_AI_DIR:-$AI_PROJECTS/somaari-ai}"
REQUEST="${REQUEST:-what are the 5 biggest files in /tmp/somaari-demo, with human-readable sizes?}"
OUT="$REPO/docs/demo/raw-$(date +%F).mkv"
[[ -x "$REPO/run.sh" ]] || { echo "somaari-ai not found at $REPO" >&2; exit 1; }

fresh_home
[[ -d "$DEMO_TREE" ]] || make_demo_tree
mkdir -p "$DEMO_HOME/.config/somaari-ai"
cat >"$DEMO_HOME/.config/somaari-ai/config.yaml" <<'EOF'
ui:
  font_size: 13
  side_panel: false
history:
  persist: false
  save_commands: false
EOF
ensure_ignored "$REPO" "docs/demo/"

warn_countdown somaari-ai
notify_quiet
cleanup() {
  stop_rec 2>/dev/null || true
  pkill -f '^python -m somaari_ai' 2>/dev/null || true
  notify_restore
}
trap cleanup EXIT

(cd "$DEMO_HOME" && as_pi "$REPO/run.sh" >/dev/null 2>&1) &
WIN="$(wait_window '^somaari-ai$')"
place_window "$WIN"
sleep 1.5

# The status bar's left cell ("Idle" / "Thinking...") says when the app is busy.
status_hash() {
  ffmpeg -loglevel error -f x11grab -video_size 90x30 -i "$DISPLAY+$((WIN_X + 8)),$((WIN_Y + WIN_H - 36))" \
    -frames:v 1 -f rawvideo - | md5sum
}
IDLE_HASH="$(status_hash)"
dialog_up() { wmctrl -l | grep -q 'Run this command?'; }

start_rec "$OUT"
sleep 0.8
TYPE_FROM="$(rec_t)"
xdotool type --delay 25 "$REQUEST"
sleep 0.4
TYPE_TO="$(rec_t)"
xdotool key Return

# Wait for the safety confirmation, or for "Idle" again (command allowed outright, already ran).
T_DIALOG=""; T_IDLE=""; busy=0; last=0
for ((i = 0; i < 600; i++)); do
  dialog_up && { T_DIALOG="$(rec_t)"; break; }
  if ((i - last >= 8)); then           # the hash costs ~0.5 s, so check it about once a second
    last=$i
    if [[ "$(status_hash)" != "$IDLE_HASH" ]]; then busy=1; elif ((busy)); then T_IDLE="$(rec_t)"; break; fi
  fi
  sleep 0.1
done
if [[ -n "$T_DIALOG" ]]; then
  sleep 3.0           # the dialog settles (~0.5 s), then the viewer reads the proposal and the "why"
  xdotool key alt+r   # Run once
fi
sleep 3.2
END="$(rec_t)"
stop_rec

# Edit points: typing (sped up), the AI wait (squeezed), then from the settled proposal on.
{
  echo "TYPE_FROM=$TYPE_FROM"
  echo "TYPE_TO=$TYPE_TO"
  if [[ -n "$T_DIALOG" ]]; then
    echo "THINK_TO=$(awk -v d="$T_DIALOG" 'BEGIN { printf "%.2f", d - 0.6 }')"
    echo "SHOW_FROM=$(awk -v d="$T_DIALOG" 'BEGIN { printf "%.2f", d + 0.6 }')"
  else
    echo "THINK_TO=$(awk -v d="${T_IDLE:-$END}" 'BEGIN { printf "%.2f", d - 1.2 }')"
    echo "SHOW_FROM=$(awk -v d="${T_IDLE:-$END}" 'BEGIN { printf "%.2f", d - 1.0 }')"
  fi
  echo "END=$(awk -v d="$END" 'BEGIN { printf "%.2f", d - 0.3 }')"
} >"${OUT%.mkv}.times"
echo "raw: $OUT"; cat "${OUT%.mkv}.times"
