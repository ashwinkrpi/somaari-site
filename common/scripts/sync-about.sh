#!/bin/sh
# Vendor somaari-common's about/*.json (from the main branch) into another repo.
# Usage: sync-about.sh <target_dir>
set -eu

if [ "$#" -ne 1 ]; then
    echo "usage: $0 <target_dir>" >&2
    exit 2
fi

target=$1
repo=$(cd "$(dirname "$0")/.." && pwd)
files="developer.json debug-fields.json"

if ! git -C "$repo" rev-parse --verify --quiet main >/dev/null; then
    echo "error: no 'main' branch in $repo" >&2
    exit 1
fi

if [ -n "$(git -C "$repo" status --porcelain -- about/)" ]; then
    echo "error: $repo has uncommitted changes under about/. Commit them to main first." >&2
    git -C "$repo" status --short -- about/ >&2
    exit 1
fi

mkdir -p "$target"
for f in $files; do
    if ! git -C "$repo" show "main:about/$f" > "$target/$f.tmp"; then
        rm -f "$target/$f.tmp"
        echo "error: could not read about/$f from main" >&2
        exit 1
    fi
    mv "$target/$f.tmp" "$target/$f"
    echo "wrote $target/$f"
done
