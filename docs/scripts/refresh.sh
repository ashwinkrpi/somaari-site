#!/usr/bin/env bash
# Hourly rebuild of docs.somaari.in (cron; see README "How the site stays up to date"). Deploys only
# when something it is built from changed on GitHub since the last successful deploy, or FORCE=1:
#   - each manifest guide's folder (its Markdown and images), at the guide's ref
#   - somaari-common theme/ and apps/ on main
# The SHAs are saved in .state/last-shas.json only after deploy.sh succeeds. Everything is logged to
# .state/refresh.log. A failure opens or updates one GitHub issue (scripts/notify.sh); the next good
# run closes it.
set -euo pipefail
cd "$(dirname "$0")/.."

OWNER=ashwinkrpi
STATE=.state
LOG=$STATE/refresh.log
LAST=$STATE/last-shas.json
CURRENT=$STATE/current-shas.txt
mkdir -p "$STATE"
exec >>"$LOG" 2>&1
log() { printf '[refresh %s] %s\n' "$(date '+%F %T')" "$*"; }

fail() {
	log "FAILED: $1"
	bash scripts/notify.sh "$1" "$LOG" || log "notify.sh failed too"
	exit 1
}

# Latest commit SHA touching <path> in <repo> at <ref>.
latest() {
	gh api "repos/$OWNER/$1/commits?path=$3&sha=$2&per_page=1" --jq '.[0].sha'
}

log "start${FORCE:+ (FORCE=$FORCE)}"
manifest=$(gh api "repos/$OWNER/somaari-common/contents/apps/apps.json?ref=main" \
	-H 'Accept: application/vnd.github.raw') || fail "read the app manifest"
# shellcheck disable=SC2016 # a JS template literal, not shell
guides=$(printf '%s' "$manifest" | node -e '
	let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
		for (const a of JSON.parse(s).apps) if (a.guide) {
			const dir = a.guide.src.includes("/") ? a.guide.src.replace(/\/[^/]*$/, "") : ".";
			console.log(`${a.repo} ${a.guide.ref} ${dir}`);
		}
	});') || fail "read the app manifest"

(
	while read -r repo ref dir; do
		sha=$(latest "$repo" "$ref" "$dir") && [[ -n "$sha" && "$sha" != null ]] || exit 1
		printf '%s/%s:%s %s\n' "$OWNER" "$repo" "$dir" "$sha"
	done <<<"$guides"
	for path in theme apps; do
		sha=$(latest somaari-common main "$path") && [[ -n "$sha" && "$sha" != null ]] || exit 1
		printf '%s/somaari-common:%s %s\n' "$OWNER" "$path" "$sha"
	done
) >"$CURRENT" || fail "read the latest commits"

changed=$(node scripts/refresh-state.mjs changed "$LAST" "$CURRENT") || fail "compare the SHAs"
if [[ -z "$changed" && "${FORCE:-0}" != 1 ]]; then
	log "nothing changed; skip"
	exit 0
fi
log "changed: $(printf '%s' "${changed:-nothing (FORCE=1)}" | tr '\n' ' ')"

bash scripts/deploy.sh || fail "deploy"
node scripts/refresh-state.mjs save "$CURRENT" "$LAST" || fail "save the SHAs"
bash scripts/notify.sh --ok || log "notify.sh --ok failed"
log "deployed"
