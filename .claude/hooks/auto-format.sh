#!/bin/bash
# PostToolUse(Edit|Write): keep edited files matching the repo's Prettier config
# so `pnpm format:check` never fails on Claude's own output.
#
# Runs synchronously. The previous version backgrounded Prettier, so a following
# Edit could race the rewrite and fail on a stale old_string.
set -uo pipefail

input=$(cat)

file_path=$(jq -r '.tool_input.file_path // empty' <<<"$input")

[[ "$file_path" =~ \.(ts|tsx|js|jsx|mjs|cjs|json|md|css)$ ]] || exit 0
[ -f "$file_path" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" 2>/dev/null || exit 0

# Never fail the tool call over formatting; Prettier exits non-zero on files it
# has no parser for, and CI is the real gate.
npx --no-install prettier --write --ignore-unknown "$file_path" >/dev/null 2>&1 || true

exit 0
