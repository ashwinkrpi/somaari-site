#!/usr/bin/env bash
# Reports scripts/refresh.sh failures as one GitHub issue (label "refresh-failed"), not in chat.
#   bash scripts/notify.sh <step> <logfile>   open the issue, or update it if one is open, with the
#                                             failed step and the last 50 lines of the log
#   bash scripts/notify.sh --ok               close the open issue, if any, after a good run
set -euo pipefail

REPO=${NOTIFY_REPO:-ashwinkrpi/somaari-docs}
LABEL=refresh-failed

open_issue() {
	gh issue list --repo "$REPO" --label "$LABEL" --state open --limit 1 --json number --jq '.[0].number // empty'
}

if [[ "${1:-}" == --ok ]]; then
	number=$(open_issue)
	if [[ -n "$number" ]]; then
		gh issue close "$number" --repo "$REPO" --comment "Refresh succeeded on $(date '+%F %T %Z'); closing."
	fi
	exit 0
fi

if [[ $# -ne 2 ]]; then
	echo "usage: notify.sh <step> <logfile> | --ok" >&2
	exit 2
fi
step=$1
logfile=$2

body=$(
	printf 'The hourly docs.somaari.in refresh failed at **%s** on %s.\n\n' "$step" "$(date '+%F %T %Z')"
	# shellcheck disable=SC2016 # Markdown backticks, not command substitution
	printf 'Last 50 lines of `%s`:\n\n```\n' "$logfile"
	tail -n 50 "$logfile" 2>/dev/null || echo "(log not readable)"
	printf '```\n\nThis issue is updated by every failing run and closed by the next good one (scripts/notify.sh).\n'
)

gh label create "$LABEL" --repo "$REPO" --color d93f0b --description "scripts/refresh.sh failed" --force >/dev/null
number=$(open_issue)
if [[ -n "$number" ]]; then
	gh issue edit "$number" --repo "$REPO" --title "docs.somaari.in refresh failed: $step" --body "$body" >/dev/null
	echo "notify: updated issue #$number"
else
	gh issue create --repo "$REPO" --label "$LABEL" --title "docs.somaari.in refresh failed: $step" --body "$body"
fi
