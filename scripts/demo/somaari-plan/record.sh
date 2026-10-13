#!/usr/bin/env bash
# Record the somaari-plan demo: paste a Markdown plan -> Generate plan -> preview of dated tasks
# -> Add to plan -> Calendar week view with the tasks on their days.
#
# The app's database is fixed at <repo>/data/somaari.db (real data), so this runs a throwaway copy
# of app/ and web/ in /tmp with an empty data/ dir, a demo config (127.0.0.1:8790) and the repo's
# .env (mode 600, for Jev). The browser is a temp-profile Chromium app window. The sample plan's
# dates are filled in relative to today, so the week view always has tasks.
#
#   scripts/demo/somaari-plan/record.sh && scripts/demo/somaari-plan/encode.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/../lib.sh"

REPO="${SOMAARI_PLAN_DIR:-$AI_PROJECTS/somaari-plan}"
OUT="$REPO/docs/demo/raw-$(date +%F).mkv"
PY="$REPO/.venv/bin/python"
CLIP_PY="${CLIP_PY:-$AI_PROJECTS/somaari-ai/.venv/bin/python}"   # any python with PySide6
COPY="${PLAN_COPY:-/tmp/somaari-plan-demo}"
PROFILE="${PLAN_PROFILE:-/tmp/somaari-plan-profile}"
PORT="${PLAN_PORT:-8790}"
HERE="$DEMO_DIR_SCRIPTS/somaari-plan"
[[ -x "$PY" ]] || { echo "somaari-plan venv not found at $REPO/.venv" >&2; exit 1; }
"$CLIP_PY" -c 'import PySide6' 2>/dev/null || { echo "need PySide6 at CLIP_PY=$CLIP_PY" >&2; exit 1; }

# Throwaway copy with an empty database.
rm -rf "$COPY" "$PROFILE"; mkdir -p "$COPY/data"
cp -a "$REPO/app" "$REPO/web" "$COPY/"
[[ -f "$REPO/.env" ]] && install -m 600 "$REPO/.env" "$COPY/.env"
cat >"$COPY/config.demo.toml" <<EOF
[server]
host = "127.0.0.1"
port = $PORT
threads = 4

[ai]
mode = "jev"
jev_model = "jev-latest"
generate_chain = ["openrouter_free"]
rewrite_prose = true
timeout_s = 60

[ai.thresholds]
task_accept = 0.7
task_review = 0.4
confidence_review = 0.6

[ui]
date_format = "dd/mm/yyyy"
EOF
d() { date -d "+$1 day" '+%a %-d %b'; }
sed -e "s/{D0}/$(d 0)/g" -e "s/{D1}/$(d 1)/g" -e "s/{D2}/$(d 2)/g" -e "s/{D4}/$(d 4)/g" -e "s/{D5}/$(d 5)/g" \
  "$HERE/sample-plan.md.in" >"$COPY/sample-plan.md"
ensure_ignored "$REPO" "docs/demo/"

warn_countdown somaari-plan
notify_quiet
SERVER_PID=""; CLIP_PID=""
cleanup() {
  stop_rec 2>/dev/null || true
  pkill -f "[u]ser-data-dir=$PROFILE" 2>/dev/null || true
  [[ -n "$CLIP_PID" ]] && kill "$CLIP_PID" 2>/dev/null || true
  [[ -n "$SERVER_PID" ]] && kill "$SERVER_PID" 2>/dev/null || true
  notify_restore
}
trap cleanup EXIT

(cd "$COPY" && SOMAARI_CONFIG="$COPY/config.demo.toml" exec "$PY" -m app >"$COPY/server.log" 2>&1) &
SERVER_PID=$!
for ((i = 0; i < 40; i++)); do curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null && break; sleep 0.25; done

chromium --user-data-dir="$PROFILE" --no-first-run --no-default-browser-check --disable-sync \
  --password-store=basic --disable-features=Translate,MediaRouter --disable-notifications \
  --force-device-scale-factor=1 --app="http://127.0.0.1:$PORT/#/new" >/dev/null 2>&1 &
place_window "$(wait_window '^somaari-plan$')"
sleep 2.5

"$CLIP_PY" "$HERE/clip.py" "$COPY/sample-plan.md" 120 >/dev/null &
CLIP_PID=$!
sleep 1

# Layout coordinates below are for a 1280x720 window at device scale 1 (two-column New plan page).
click() { xdotool mousemove "$((WIN_X + $1))" "$((WIN_Y + $2))" click 1; }
start_rec "$OUT"
sleep 0.8
click 560 500                    # Plan text box
sleep 0.4
xdotool key ctrl+v
sleep 1.4
xdotool key Tab Tab Tab Tab      # Schedule, Tasks per day, Step, Generate plan
sleep 0.4
xdotool key Return
sleep 2.4                        # preview of dated tasks
xdotool key End
sleep 1.0
click 365 635                    # "Add 8 tasks to plan"
sleep 1.2
xdotool key Home
sleep 0.5
click 74 267                     # Calendar (opens in Week view)
sleep 3.2
END="$(rec_t)"
stop_rec

echo "END=$END" >"${OUT%.mkv}.times"
echo "raw: $OUT"; cat "${OUT%.mkv}.times"
