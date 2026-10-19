# Demo loops

Re-runnable recordings for the demo player on the app cards. somaari-plan's loop isn't made here:
its repo records it in CI on every UI change (`scripts/site-demo/`, `.github/workflows/site-demo.yml`)
and the site build downloads it from that repo's `site-demo` branch.

Each app has a `record.sh` (drives the real app with xdotool and captures its window with ffmpeg
x11grab) and an `encode.sh` (cuts and encodes into `assets/demos/<app>/`). Run them from the Pi's X11 desktop session; don't touch the mouse or
keyboard while a recording runs (there's a 5-second warning).

```sh
scripts/demo/somaari-ai/record.sh   && scripts/demo/somaari-ai/encode.sh
scripts/demo/somaari-disk/record.sh && scripts/demo/somaari-disk/encode.sh
scripts/demo/somaari-trip/encode.sh   # slideshow of the repo's guide screenshots, no recording
rm -rf /tmp/somaari-demo /tmp/somaari-home
```

Needs: `ffmpeg xdotool wmctrl xdpyinfo xwininfo unshare`, and the app repos under
`~/code/ai-projects/` (override with `AI_PROJECTS` or `SOMAARI_AI_DIR` / `SOMAARI_DISK_DIR`). Raw
captures go to `<app repo>/docs/demo/raw-<date>.mkv` (gitignored there), with a `.times` file of edit
points next to each.

## After recording, check the footage

```sh
ffmpeg -i <raw>.mkv -vf fps=1 /tmp/frames/f%02d.png      # or on the encoded loop.webm
```

Look for the wrong window, loading screens, errors or anything personal. The edit points are
approximate: if a cut is off, fix the numbers in the `.times` file (or pass `SEGMENTS=...` /
`POSTER_AT=...`) and re-run only `encode.sh`.

## Privacy

- Apps run as `pi@somaari` in a private user + UTS namespace (`as_pi` in `lib.sh`, no sudo), with a
  fresh temp `HOME` and XDG dirs, so prompts, file owners and hostnames are neutral.
- Disk scans only `/tmp/somaari-demo`, a dummy tree of `fallocate`d files (`make_demo_tree`).
- Desktop notifications are paused (xfce4-notifyd do-not-disturb) while recording.
- API keys come from each app's own `.env` and are never printed.

## Per-app notes

- **somaari-ai:** the AI (openrouter/free) varies between runs. The best takes propose a
  `find -exec` command, which shows the safety confirmation dialog. Re-record if the proposal is
  wrong or dull. Edit: typing at 3x, the AI wait squeezed to 0.8 s, then the rest at 1x.
- **somaari-disk:** the app scans its home folder on launch, so it runs with
  `HOME=/tmp/somaari-demo`. A warm-up launch saves the window position, the scan cache is wiped,
  then a cold launch is recorded. The capture includes the GTK title bar, which `encode.sh` crops off.
- **somaari-trip:** not a recording. `encode.sh` crossfades four of the repo's
  `docs/images/*.jpg` guide screenshots (sample data only) and needs no X session. Re-run it after
  the guide screenshots change. Each shot is cropped from 66 px down (`CROP_Y`), which drops the
  app's header row: it shows a "Self-Hosted" label, and the site doesn't mention self-hosting.

## encode.sh

`encode.sh <input> <app-slug>` writes `loop.webm` (VP9, CRF 38), `loop.mp4` (H.264, CRF 28,
faststart) and `poster.webp`, 720 px wide at 24 fps with no audio. It raises the CRF until each
video is under 1 MB. Env: `SEGMENTS` (`a-b`, `a-b@speed`, `a-b=seconds`), `CROP`, `POSTER_AT`, `MAX_BYTES`,
`OUT_DIR` (instead of `assets/demos/<slug>/`; app repos' own recorders use it).
