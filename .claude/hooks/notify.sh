#!/bin/bash
# Notification: ping Telegram when Claude is actually waiting on the user.
#
# This replaces the Stop-hook version, which fired at the end of every single
# turn and trained the user to ignore it. Notification fires on permission
# prompts and idle waits, which is exactly when a ping is worth sending.
set -uo pipefail

[ -n "${TELEGRAM_BOT_TOKEN:-}" ] || exit 0
[ -n "${TELEGRAM_CHAT_ID:-}" ] || exit 0

input=$(cat)

session_id=$(jq -r '.session_id // empty' <<<"$input")
message=$(jq -r '.message // "Needs your attention"' <<<"$input")

# Prefer the session's own summary line so a user with several sessions open can
# tell which one is asking.
title=""
if [ -n "$session_id" ] && [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
  encoded=$(sed 's|^/||; s|/|-|g' <<<"$CLAUDE_PROJECT_DIR")
  index="$HOME/.claude/projects/-${encoded}/sessions-index.json"
  if [ -f "$index" ]; then
    title=$(jq -r --arg sid "$session_id" \
      '.entries[]? | select(.sessionId == $sid) | .summary // empty' "$index" 2>/dev/null | head -1)
  fi
fi
[ -n "$title" ] || title=$(basename "${CLAUDE_PROJECT_DIR:-$(pwd)}")

escape_html() { sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g'; }

body=$(printf '🔔 <b>%s</b>\n%s' \
  "$(escape_html <<<"$title")" \
  "$(escape_html <<<"$message")")

curl -s -m 10 -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=$TELEGRAM_CHAT_ID" \
  --data-urlencode "text=$body" \
  --data-urlencode "parse_mode=HTML" >/dev/null 2>&1

exit 0
