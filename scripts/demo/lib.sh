# Shared helpers for the demo recorders. Source it; don't run it.
# Needs: ffmpeg, xdotool, wmctrl, xdpyinfo, an X11 session (DISPLAY, default :0).

set -euo pipefail

DEMO_DIR_SCRIPTS="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
SITE_DIR="$(cd -- "$DEMO_DIR_SCRIPTS/../.." && pwd -P)"
AI_PROJECTS="${AI_PROJECTS:-$HOME/code/ai-projects}"
DEMO_TREE="${DEMO_TREE:-/tmp/somaari-demo}"
DEMO_HOME="${DEMO_HOME:-/tmp/somaari-home}"
REC_W="${REC_W:-1280}"
REC_H="${REC_H:-720}"
REC_X="${REC_X:-200}"
REC_Y="${REC_Y:-300}"

export DISPLAY="${DISPLAY:-:0}"
xdpyinfo >/dev/null 2>&1 || { DISPLAY=:0; xdpyinfo >/dev/null || { echo "no X display" >&2; exit 1; }; }

for t in ffmpeg xdotool wmctrl xdpyinfo unshare; do
  command -v "$t" >/dev/null || { echo "missing tool: $t" >&2; exit 1; }
done

# Run a command as user "pi" (uid 1000) on host "somaari" in a private user+UTS namespace, so
# prompts, `ls -l` owners and hostnames on screen are neutral. No sudo needed.
as_pi() {
  unshare --map-root-user --uts sh -c 'hostname somaari; exec unshare --map-user=1000 --map-group=1000 "$@"' sh \
    env HOME="$DEMO_HOME" USER=pi LOGNAME=pi XDG_CONFIG_HOME="$DEMO_HOME/.config" \
    XDG_DATA_HOME="$DEMO_HOME/.local/share" XDG_CACHE_HOME="$DEMO_HOME/.cache" \
    XDG_STATE_HOME="$DEMO_HOME/.local/state" "$@"
}

# Dummy tree of fallocate'd files with realistic names and sizes. Never real data.
make_demo_tree() {
  local d="$DEMO_TREE"
  rm -rf "$d"; mkdir -p "$d"
  mk() { mkdir -p "$(dirname "$d/$1")"; fallocate -l "$2" "$d/$1"; }
  mk Downloads/ubuntu-24.04-arm64.iso 2600M
  mk Downloads/kicad-installer.tar.xz 340M
  mk Downloads/fonts.zip 18M
  mk Backups/pi-image-2026-08.img.xz 620M
  mk Backups/pi-image-2026-05.img.xz 590M
  mk Backups/configs/dotfiles.tar.gz 3M
  mk Videos/holiday-2025/beach-sunset.mp4 410M
  mk Videos/holiday-2025/hill-trek.mp4 265M
  mk Videos/holiday-2025/clips/drone-01.mov 120M
  mk Videos/holiday-2025/clips/drone-02.mov 96M
  mk Videos/tutorials/pi-setup-part1.mkv 180M
  mk Videos/tutorials/pi-setup-part2.mkv 154M
  mk Projects/weather-station/data/readings-2025.csv 48M
  mk Projects/weather-station/data/readings-2026.csv 31M
  mk Projects/weather-station/firmware/build.bin 2M
  mk Projects/robot-arm/models/arm-v2.stl 22M
  mk Projects/robot-arm/models/gripper.stl 9M
  mk Projects/robot-arm/src/main.py 12K
  mk Projects/site/assets/hero.png 4M
  mk Music/albums/ambient/track-01.flac 38M
  mk Music/albums/ambient/track-02.flac 41M
  mk Music/albums/ambient/track-03.flac 35M
  mk Music/albums/jazz/track-01.flac 44M
  mk Music/albums/jazz/track-02.flac 39M
  mk Music/podcasts/episode-112.mp3 62M
  mk Music/podcasts/episode-113.mp3 58M
  mk Photos/2026/jan/IMG_0101.jpg 6M
  mk Photos/2026/jan/IMG_0102.jpg 5M
  mk Photos/2026/mar/IMG_0310.jpg 7M
  mk Photos/2026/raw/DSC_4410.nef 28M
  mk Photos/2026/raw/DSC_4411.nef 27M
  mk Photos/2026/raw/DSC_4412.nef 29M
  mk Documents/manuals/router-manual.pdf 12M
  mk Documents/manuals/pi5-datasheet.pdf 3M
  mk Documents/notes/garden-plan.md 8K
  local i
  for i in $(seq 1 40); do mk "Photos/2026/jun/IMG_06$(printf %02d "$i").jpg" "$((3 + i % 5))M"; done
  # Lots of small files so a scan takes a moment and visibly fills in.
  python3 - "$d/Photos/thumbnails" <<'PY'
import os, sys
root = sys.argv[1]
for a in range(100):
    sub = os.path.join(root, f"{2000 + a * 25:05d}")
    os.makedirs(sub, exist_ok=True)
    for b in range(1000):
        fd = os.open(os.path.join(sub, f"thumb_{a * 1000 + b:05d}.jpg"), os.O_CREAT | os.O_WRONLY, 0o644)
        os.posix_fallocate(fd, 0, 4096 * (1 + b % 3))
        os.close(fd)
PY
}

fresh_home() { rm -rf "$DEMO_HOME"; mkdir -p "$DEMO_HOME"; }

# Silence desktop notifications while recording (xfce4-notifyd); restored by notify_restore.
_DND_PREV=""
notify_quiet() {
  _DND_PREV="$(xfconf-query -c xfce4-notifyd -p /do-not-disturb 2>/dev/null || echo unset)"
  xfconf-query -c xfce4-notifyd -p /do-not-disturb -n -t bool -s true 2>/dev/null || true
}
notify_restore() {
  if [[ "$_DND_PREV" == unset ]]; then xfconf-query -c xfce4-notifyd -p /do-not-disturb -r 2>/dev/null || true
  elif [[ -n "$_DND_PREV" ]]; then xfconf-query -c xfce4-notifyd -p /do-not-disturb -s "$_DND_PREV" 2>/dev/null || true
  fi
}

# wait_window <name regex> [timeout s] -> prints the wmctrl window id
wait_window() {
  local re="$1" t="${2:-40}" id i
  for ((i = 0; i < t * 2; i++)); do
    id="$(wmctrl -l | awk -v re="$re" '{ n=""; for (j=4;j<=NF;j++) n=n (j>4?" ":"") $j; if (n ~ re) { print $1; exit } }')"
    [[ -n "$id" ]] && { echo "$id"; return 0; }
    sleep 0.5
  done
  echo "window /$re/ not found" >&2; return 1
}

# place_window <id>: client area REC_WxREC_H at REC_X,REC_Y, raised and focused.
place_window() {
  local id="$1"
  wmctrl -i -r "$id" -b remove,maximized_vert,maximized_horz,fullscreen
  wmctrl -i -r "$id" -e "0,$REC_X,$REC_Y,$REC_W,$REC_H"
  wmctrl -i -a "$id"
  sleep 0.8
  local g; g="$(xwininfo -id "$id")"
  WIN_X="$(awk '/Absolute upper-left X/{print $4}' <<<"$g")"
  WIN_Y="$(awk '/Absolute upper-left Y/{print $4}' <<<"$g")"
  WIN_W="$(awk '/Width:/{print $2}' <<<"$g")"
  WIN_H="$(awk '/Height:/{print $2}' <<<"$g")"
  if ((WIN_W != REC_W || WIN_H != REC_H)); then
    echo "note: window is ${WIN_W}x${WIN_H} (min size?); capturing ${REC_W}x${REC_H} from its top-left" >&2
  fi
}

warn_countdown() {
  echo "Recording $1, don't touch mouse/keyboard."
  local i; for i in 5 4 3 2 1; do printf '%s... ' "$i"; sleep 1; done; echo
}

# start_rec <out.mkv>: lossless-ish capture of the placed window, no mouse pointer.
start_rec() {
  REC_OUT="$1"; mkdir -p "$(dirname "$1")"
  xdotool mousemove "$((WIN_X + WIN_W + 400))" "$((WIN_Y + WIN_H + 300))" 2>/dev/null || true
  ffmpeg -loglevel error -y -f x11grab -draw_mouse 0 -framerate 30 -video_size "${REC_W}x${REC_H}" \
    -i "$DISPLAY+$WIN_X,$WIN_Y" -c:v libx264 -preset ultrafast -crf 12 -pix_fmt yuv444p \
    -stats_period 0.1 -progress "$1.progress" "$1" &
  REC_PID=$!
  # ffmpeg takes a second or two to start on the Pi: REC_T0 = wall time of (about) frame 0.
  local i
  for ((i = 0; i < 100; i++)); do grep -q '^frame=[1-9]' "$1.progress" 2>/dev/null && break; sleep 0.05; done
  REC_T0="$(date +%s.%N)"
}
# rec_t: seconds since REC_T0, for the .times hints.
rec_t() { awk -v a="$(date +%s.%N)" -v b="$REC_T0" 'BEGIN { printf "%.2f", a - b }'; }
stop_rec() {
  [[ -n "${REC_PID:-}" ]] || return 0
  kill -INT "$REC_PID" 2>/dev/null || true; wait "$REC_PID" 2>/dev/null || true; REC_PID=""
  rm -f "$REC_OUT.progress"
}

# ensure_ignored <repo> <pattern>: add pattern to the repo's .gitignore once.
ensure_ignored() {
  grep -qxF "$2" "$1/.gitignore" 2>/dev/null || printf '\n# Raw demo recordings (somaari-site/scripts/demo)\n%s\n' "$2" >>"$1/.gitignore"
}

# frames <in.mkv> <outdir>: 1 fps PNGs for review.
frames() { rm -rf "$2"; mkdir -p "$2"; ffmpeg -loglevel error -i "$1" -vf fps=1 "$2/f%02d.png"; ls "$2" | wc -l; }
