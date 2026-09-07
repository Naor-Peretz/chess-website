#!/bin/bash
# SessionStart: give Claude the state of the working tree instead of a static
# list of skills. Everything here changes between sessions, which is the only
# reason to spend a hook on it.
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" 2>/dev/null || exit 0

branch=$(git branch --show-current 2>/dev/null)
status=$(git status --short --branch 2>/dev/null | head -25)

# Network call: cap it so a slow or unauthenticated gh cannot stall session start.
pr=$(timeout 5 gh pr view --json number,title,state \
  --jq '"#\(.number) \(.title) [\(.state)]"' 2>/dev/null)
[ -z "$pr" ] && pr="none for this branch"

active=$(find dev/active -mindepth 1 -maxdepth 1 -type d -printf '%f\n' 2>/dev/null | sort)
[ -z "$active" ] && active="none"

context=$(
  printf 'Repository state at session start.\n\n'
  printf 'Branch: %s\n' "${branch:-detached}"
  printf 'Open PR: %s\n\n' "$pr"
  printf 'git status --short --branch:\n%s\n\n' "${status:-clean}"
  printf 'dev/active work items (read the -context.md before continuing any of these):\n%s\n' "$active"
)

jq -n --arg ctx "$context" \
  '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $ctx}}'
