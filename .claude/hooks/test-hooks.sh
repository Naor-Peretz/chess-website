#!/bin/bash
# Feeds each hook a realistic stdin payload and asserts what it writes to stdout.
# Run after touching anything in this directory: a hook that emits the wrong
# shape fails silently at runtime, which is how the previous set rotted.
#
#   .claude/hooks/test-hooks.sh
set -uo pipefail

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$HOOKS_DIR/../.." && pwd)}"

pass=0
fail=0

# check <name> <hook> <stdin> <jq-assertion|EMPTY>
check() {
  local name="$1" hook="$2" payload="$3" assertion="$4"
  local out status

  local start=$((${EPOCHREALTIME/./} ))
  out=$(printf '%s' "$payload" | "$HOOKS_DIR/$hook" 2>/dev/null)
  status=$?
  local ms=$(( (${EPOCHREALTIME/./} - start) / 1000 ))

  if [ "$status" -ne 0 ]; then
    printf '  FAIL  %-46s exit %d\n' "$name" "$status"
    fail=$((fail + 1))
    return
  fi

  if [ "$assertion" = "EMPTY" ]; then
    if [ -n "$out" ]; then
      printf '  FAIL  %-46s expected no output, got: %.60s\n' "$name" "$out"
      fail=$((fail + 1))
      return
    fi
  elif ! jq -e "$assertion" >/dev/null 2>&1 <<<"$out"; then
    printf '  FAIL  %-46s assertion failed: %s\n' "$name" "$assertion"
    printf '        output: %.140s\n' "${out:-<empty>}"
    fail=$((fail + 1))
    return
  fi

  if [ "$ms" -gt 1000 ]; then
    printf '  SLOW  %-46s %d ms\n' "$name" "$ms"
    fail=$((fail + 1))
    return
  fi

  printf '  ok    %-46s %d ms\n' "$name" "$ms"
  pass=$((pass + 1))
}

SESSION="hook-selftest"
CACHE="$CLAUDE_PROJECT_DIR/.claude/tsc-cache/$SESSION"
rm -rf "$CACHE"

echo "Hook contract tests"
echo

# --- session-start -----------------------------------------------------------
check "session-start emits additionalContext" session-start.sh \
  '{"session_id":"'"$SESSION"'","hook_event_name":"SessionStart","source":"startup"}' \
  '.hookSpecificOutput.hookEventName == "SessionStart" and (.hookSpecificOutput.additionalContext | length > 0)'

# --- post-tool-use-tracker ---------------------------------------------------
check "tracker ignores markdown" post-tool-use-tracker.sh \
  '{"session_id":"'"$SESSION"'","tool_name":"Edit","tool_input":{"file_path":"'"$CLAUDE_PROJECT_DIR"'/README.md"}}' \
  EMPTY

check "tracker records a frontend edit" post-tool-use-tracker.sh \
  '{"session_id":"'"$SESSION"'","tool_name":"Edit","tool_input":{"file_path":"'"$CLAUDE_PROJECT_DIR"'/apps/frontend/src/app/page.tsx"}}' \
  EMPTY

if grep -q 'apps/frontend' "$CACHE/edited-files.log" 2>/dev/null; then
  printf '  ok    %-46s\n' "tracker log contains apps/frontend"
  pass=$((pass + 1))
else
  printf '  FAIL  %-46s log missing apps/frontend\n' "tracker log contains apps/frontend"
  fail=$((fail + 1))
fi

check "tracker records a backend edit" post-tool-use-tracker.sh \
  '{"session_id":"'"$SESSION"'","tool_name":"Write","tool_input":{"file_path":"'"$CLAUDE_PROJECT_DIR"'/apps/backend/src/app.ts"}}' \
  EMPTY

if grep -q '^apps/backend$' "$CACHE/affected-areas.txt" 2>/dev/null; then
  printf '  ok    %-46s\n' "tracker records apps/backend area"
  pass=$((pass + 1))
else
  printf '  FAIL  %-46s area missing\n' "tracker records apps/backend area"
  fail=$((fail + 1))
fi

# --- playwright-test-guard ---------------------------------------------------
check "guard ignores non-push bash" playwright-test-guard.sh \
  '{"session_id":"'"$SESSION"'","tool_name":"Bash","tool_input":{"command":"git status"}}' \
  EMPTY

check "guard denies push after frontend edit" playwright-test-guard.sh \
  '{"session_id":"'"$SESSION"'","tool_name":"Bash","tool_input":{"command":"git push -u origin main"}}' \
  '.hookSpecificOutput.permissionDecision == "deny" and (.hookSpecificOutput.permissionDecisionReason | length > 0)'

SKIP_PLAYWRIGHT_GUARD=1 \
  check "guard honours the bypass env var" playwright-test-guard.sh \
  '{"session_id":"'"$SESSION"'","tool_name":"Bash","tool_input":{"command":"git push"}}' \
  EMPTY

# --- playwright-test-tracker -------------------------------------------------
check "playwright tracker writes marker" playwright-test-tracker.sh \
  '{"session_id":"'"$SESSION"'","tool_name":"mcp__plugin_playwright_playwright__browser_navigate"}' \
  EMPTY

if [ -f "$CACHE/playwright-tested.marker" ]; then
  printf '  ok    %-46s\n' "marker file created"
  pass=$((pass + 1))
else
  printf '  FAIL  %-46s marker missing\n' "marker file created"
  fail=$((fail + 1))
fi

check "guard allows push once tested" playwright-test-guard.sh \
  '{"session_id":"'"$SESSION"'","tool_name":"Bash","tool_input":{"command":"git push"}}' \
  EMPTY

# --- post-plan-review --------------------------------------------------------
check "plan review ignores other tools" post-plan-review.sh \
  '{"session_id":"'"$SESSION"'","tool_name":"Edit","tool_input":{}}' \
  EMPTY

check "plan review emits additionalContext" post-plan-review.sh \
  '{"session_id":"'"$SESSION"'","tool_name":"ExitPlanMode","tool_input":{"plan":"do the thing"}}' \
  '.hookSpecificOutput.hookEventName == "PostToolUse" and (.hookSpecificOutput.additionalContext | contains("plan-reviewer"))'

# --- auto-format -------------------------------------------------------------
check "auto-format skips non-source files" auto-format.sh \
  '{"session_id":"'"$SESSION"'","tool_name":"Edit","tool_input":{"file_path":"/tmp/nope.lock"}}' \
  EMPTY

# --- pre-compact -------------------------------------------------------------
if [ -d "$CLAUDE_PROJECT_DIR/dev/active" ] && [ -n "$(ls -A "$CLAUDE_PROJECT_DIR/dev/active" 2>/dev/null)" ]; then
  check "pre-compact emits additionalContext" pre-compact.sh \
    '{"session_id":"'"$SESSION"'","hook_event_name":"PreCompact","trigger":"auto"}' \
    '.hookSpecificOutput.hookEventName == "PreCompact"'
else
  printf '  skip  %-46s no dev/active items\n' "pre-compact emits additionalContext"
fi

# --- notify ------------------------------------------------------------------
check "notify is silent without credentials" notify.sh \
  '{"session_id":"'"$SESSION"'","message":"Claude needs your permission"}' \
  EMPTY

rm -rf "$CACHE"

echo
echo "passed: $pass   failed: $fail"
[ "$fail" -eq 0 ]
