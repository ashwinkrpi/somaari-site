#!/usr/bin/env bash
# Record the somaari-disk demo: the window opens and scans the dummy tree /tmp/somaari-demo
# (largest first, filling in), then drills into one folder with the keyboard.
# The app scans the home folder on launch, so it runs with HOME=/tmp/somaari-demo (config and
# cache go to the temp XDG dirs). A warm-up launch saves the window position; the scan cache is
# then wiped so the recorded launch scans from cold.
#
#   scripts/demo/somaari-disk/record.sh && scripts/demo/somaari-disk/encode.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/../lib.sh"

REPO="${SOMAARI_DISK_DIR:-$AI_PROJECTS/somaari-disk}"
OUT="$REPO/docs/demo/raw-$(date +%F).mkv"
PY="$REPO/.venv/bin/python"
DRILL_DOWNS="${DRILL_DOWNS:-1}"   # rows below the first to move before Enter (1 = Videos)
export GDK_DPI_SCALE="${GDK_DPI_SCALE:-0.83}"   # HiDPI desktop: show more rows in 720 px
[[ -x "$PY" ]] || { echo "somaari-disk venv not found at $REPO/.venv" >&2; exit 1; }

fresh_home
[[ -d "$DEMO_TREE/Photos/thumbnails" ]] || make_demo_tree
ensure_ignored "$REPO" "docs/demo/"

launch() { (cd "$DEMO_TREE" && as_pi env HOME="$DEMO_TREE" GDK_DPI_SCALE="$GDK_DPI_SCALE" "$PY" -m somaari_disk >/dev/null 2>&1) & }
close_app() {
  local w; w="$(wmctrl -l | awk '/ Somaari Disk$/{print $1; exit}')"
  [[ -n "$w" ]] && wmctrl -i -c "$w"
  local i; for ((i = 0; i < 40; i++)); do pgrep -f '^\S*python -m somaari_disk' >/dev/null || return 0; sleep 0.25; done
  pkill -f '^\S*python -m somaari_disk' || true
}

warn_countdown somaari-disk
notify_quiet
cleanup() { stop_rec 2>/dev/null || true; close_app; notify_restore; }
trap cleanup EXIT

# Warm-up: place the window so window.json remembers it, then forget the scan.
launch
place_window "$(wait_window '^Somaari Disk$')"
sleep 2
close_app
# The restored window can land a title bar away from where it was placed: launch once more and
# measure where it really opens, so the recording region matches the cold launch below.
launch
WIN="$(wait_window '^Somaari Disk$')"
sleep 2
g="$(xwininfo -id "$WIN")"
WIN_X="$(awk '/Absolute upper-left X/{print $4}' <<<"$g")"
WIN_Y="$(awk '/Absolute upper-left Y/{print $4}' <<<"$g")"
close_app
find "$DEMO_HOME" -mindepth 1 -not -name window.json -not -path '*/.config' -not -path '*/.config/somaari-disk' -delete

# Recorded cold launch. Desktop shows first; trimmed at encode time.
start_rec "$OUT"
launch
WIN="$(wait_window '^Somaari Disk$')"
wmctrl -i -a "$WIN"
APPEARED="$(rec_t)"
sleep 4.0             # scan (~1-2 s on 100k files) and the result list
# Select the first row, step down, open that folder.
xdotool mousemove "$((WIN_X + 200))" "$((WIN_Y + 384))" click 1 2>/dev/null || true
sleep 0.2
xdotool mousemove "$((WIN_X + WIN_W + 400))" "$((WIN_Y + WIN_H + 300))"
sleep 0.6
for ((k = 0; k < DRILL_DOWNS; k++)); do xdotool key Down; sleep 0.6; done
sleep 0.4
xdotool key Return
sleep 3.0
END="$(rec_t)"
stop_rec

{ echo "APPEARED=$APPEARED"; echo "END=$END"; } >"${OUT%.mkv}.times"
echo "raw: $OUT"; cat "${OUT%.mkv}.times"
