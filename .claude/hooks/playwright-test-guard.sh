#!/bin/bash
# PreToolUse(Bash): CLAUDE.md requires Playwright verification of affected pages
# before pushing frontend changes. Claude cannot check its own session history
# for that, so this hook does.
#
# Denies with permissionDecision rather than a non-zero exit: exit 1 is a
# non-blocking hook error and the push would go through anyway.
#
# Bypass: SKIP_PLAYWRIGHT_GUARD=1
set -uo pipefail

input=$(cat)

tool_name=$(jq -r '.tool_name // empty' <<<"$input")
command=$(jq -r '.tool_input.command // empty' <<<"$input")
session_id=$(jq -r '.session_id // empty' <<<"$input")

[ "$tool_name" = "Bash" ] || exit 0
[[ "$command" =~ git[[:space:]]+push ]] || exit 0
[ "${SKIP_PLAYWRIGHT_GUARD:-}" = "1" ] && exit 0

cache_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/tsc-cache/${session_id:-default}"
edited_log="$cache_dir/edited-files.log"

[ -f "$edited_log" ] || exit 0
grep -qE 'apps/frontend' "$edited_log" 2>/dev/null || exit 0
[ -f "$cache_dir/playwright-tested.marker" ] && exit 0

files=$(grep -E 'apps/frontend' "$edited_log" 2>/dev/null | cut -d: -f2 | sort -u | head -10)

reason=$(
  printf 'Frontend files were edited this session but no Playwright browser tool was used.\n\n'
  printf 'CLAUDE.md requires exercising the affected pages in a browser before pushing:\n'
  printf 'start the dev servers with `pnpm dev`, navigate to the changed pages, interact\n'
  printf 'with what changed, and confirm it renders and behaves correctly.\n\n'
  printf 'Edited frontend files:\n%s\n\n' "$files"
  printf 'If browser verification genuinely does not apply here, tell the user why and\n'
  printf 'ask them to re-run with SKIP_PLAYWRIGHT_GUARD=1.\n'
)

jq -n --arg reason "$reason" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $reason
  }
}'
