#!/bin/bash
# PostToolUse(Edit|Write): record which part of the monorepo was touched this
# session. playwright-test-guard.sh reads this log; nothing else does.
#
# The previous version matched directory names from the repo this .claude tree
# was copied from (frontend/, server/, database/) and had no case for apps/*,
# so in this monorepo it only ever logged packages/shared.
set -uo pipefail

input=$(cat)

tool_name=$(jq -r '.tool_name // empty' <<<"$input")
file_path=$(jq -r '.tool_input.file_path // empty' <<<"$input")
session_id=$(jq -r '.session_id // empty' <<<"$input")

[[ "$tool_name" =~ ^(Edit|Write)$ ]] || exit 0
[ -n "$file_path" ] || exit 0
[[ "$file_path" =~ \.(md|markdown)$ ]] && exit 0

project_root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
relative="${file_path#"$project_root"/}"

case "$relative" in
  apps/backend/*) area="apps/backend" ;;
  apps/frontend/*) area="apps/frontend" ;;
  packages/*) area="packages/$(cut -d/ -f2 <<<"$relative")" ;;
  .claude/*) area=".claude" ;;
  .github/*) area=".github" ;;
  */*) area="other" ;;
  *) area="root" ;;
esac

cache_dir="$project_root/.claude/tsc-cache/${session_id:-default}"
mkdir -p "$cache_dir" || exit 0

printf '%s:%s:%s\n' "$(date +%s)" "$relative" "$area" >>"$cache_dir/edited-files.log"

grep -qxF "$area" "$cache_dir/affected-areas.txt" 2>/dev/null ||
  printf '%s\n' "$area" >>"$cache_dir/affected-areas.txt"

exit 0
