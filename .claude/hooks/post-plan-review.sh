#!/bin/bash
# PostToolUse(ExitPlanMode): a plan just got approved. Route it through review
# and onto a branch before implementation starts.
#
# Wrapped in additionalContext: on tool events plain stdout is shown to the user
# but never reaches the model, so the previous heredoc version was invisible to
# Claude.
set -uo pipefail

input=$(cat)

tool_name=$(jq -r '.tool_name // empty' <<<"$input")
[ "$tool_name" = "ExitPlanMode" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" 2>/dev/null || exit 0
branch=$(git branch --show-current 2>/dev/null)

context=$(
  printf 'A plan was just approved. Before writing implementation code:\n\n'
  printf '1. Review it. Launch the plan-reviewer agent on the plan and act on what\n'
  printf '   comes back. Skipping this is how design problems reach the diff.\n'
  printf '2. Branch. Current branch is "%s". Plans belong on a plan/<topic>\n' "${branch:-detached}"
  printf '   branch; create one if this is not already it.\n'
  printf '3. Commit and push the plan file. dev/ is gitignored, so it needs\n'
  printf '   `git add -f dev/active/<feature>/...` or the commit will be empty.\n\n'
  printf 'Then report the review outcome, the branch, and the push result.\n'
)

jq -n --arg ctx "$context" \
  '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $ctx}}'
