#!/usr/bin/env bash
# Builds docs.somaari.in from GitHub and deploys it, smoke-testing a preview first and the live site
# after. Rolls back if the live smoke test fails. Exits non-zero on any failure.
#   bash scripts/deploy.sh
# Run by hand for the first deploy, then by scripts/refresh.sh. Needs a wrangler login (wrangler takes
# the account from it; nothing secret is stored in this repo).
set -euo pipefail
cd "$(dirname "$0")/.."

LIVE=https://docs.somaari.in/
log() { printf '[deploy %s] %s\n' "$(date '+%F %T')" "$*"; }

log "build"
npm ci --silent
npm run build
npm run check

log "upload a preview version"
upload=$(npx --yes wrangler@4 versions upload 2>&1) || { printf '%s\n' "$upload"; exit 1; }
printf '%s\n' "$upload" | tail -15
preview=$(printf '%s\n' "$upload" | grep -oE 'https://[^[:space:]]+\.workers\.dev' | tail -1 || true)
if [[ -z "$preview" ]]; then
	log "no preview URL in the upload output"
	exit 1
fi

log "smoke test the preview: $preview"
npm run smoke -- "$preview"

log "deploy"
npx --yes wrangler@4 deploy 2>&1 | tail -15

log "smoke test the live site: $LIVE"
if ! npm run smoke -- "$LIVE"; then
	log "live smoke test failed: rolling back"
	npx --yes wrangler@4 rollback --message "deploy.sh: live smoke test failed" 2>&1 | tail -15
	exit 1
fi
log "done"
