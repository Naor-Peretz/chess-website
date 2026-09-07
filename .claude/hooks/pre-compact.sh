#!/bin/bash
# PreCompact: context is about to be summarized. If this session has been
# working out of a dev/active feature directory, the doc there is the thing that
# survives compaction — so flush progress into it first.
set -uo pipefail

input=$(cat)
session_id=$(jq -r '.session_id // empty' <<<"$input")

project_root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$project_root" 2>/dev/null || exit 0

active=$(find dev/active -mindepth 1 -maxdepth 1 -type d -printf '%f\n' 2>/dev/null | sort)
[ -n "$active" ] || exit 0

# Only worth raising if this session actually touched tracked source.
edited_log="$project_root/.claude/tsc-cache/${session_id:-default}/edited-files.log"
[ -f "$edited_log" ] || exit 0

context=$(
  printf 'Context is about to be compacted.\n\n'
  printf 'Open dev/active work items:\n%s\n\n' "$active"
  printf 'If this session advanced any of them, update its -tasks.md and\n'
  printf '-context.md now, while the detail is still in context. Record what\n'
  printf 'changed and what is next, not a narrative of the session.\n'
)

jq -n --arg ctx "$context" \
  '{hookSpecificOutput: {hookEventName: "PreCompact", additionalContext: $ctx}}'
