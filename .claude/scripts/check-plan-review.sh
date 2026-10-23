#!/bin/bash
# Report the latest CI plan review on the PR for the current branch.
#
# Exit codes: 0 approved or nothing to report, 2 revision needed, 1 no PR.
set -uo pipefail

BRANCH=$(git branch --show-current)
if [ -z "$BRANCH" ]; then
  echo "Detached HEAD — check out a branch first."
  exit 1
fi

PR_NUMBER=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number // empty' 2>/dev/null)
if [ -z "$PR_NUMBER" ]; then
  echo "No PR open for branch: $BRANCH"
  exit 1
fi

echo "Checking PR #${PR_NUMBER} for plan review comments..."

# Build the array first and take the last element. Piping .[] and using
# `tail -1` breaks as soon as a comment body spans lines.
COMMENT=$(gh api "repos/{owner}/{repo}/issues/${PR_NUMBER}/comments" \
  --jq '[.[] | select(.body | test("^## Claude Plan Review"))] | last | .body // empty' 2>/dev/null)

if [ -z "$COMMENT" ]; then
  echo "No plan review comment yet."
  echo "The workflow only runs on PRs that change a *-plan.md file — check: gh pr checks $PR_NUMBER"
  exit 0
fi

# Read the verdict from the VERDICT: line the reviewer is required to emit.
# Matching bare words against the whole body reported APPROVED for any review
# that merely used the word.
VERDICT=$(grep -oE '^VERDICT: (APPROVED|NEEDS REVISION|MAJOR CHANGES NEEDED)' <<<"$COMMENT" | tail -1 | sed 's/^VERDICT: //')

echo
echo "──────────────────────────────────────────────"
echo "Plan review — PR #${PR_NUMBER}"
echo "──────────────────────────────────────────────"

case "$VERDICT" in
  "APPROVED")
    echo "APPROVED — the plan is good to build."
    STATUS=0
    ;;
  "NEEDS REVISION")
    echo "NEEDS REVISION"
    echo
    echo "$COMMENT"
    STATUS=2
    ;;
  "MAJOR CHANGES NEEDED")
    echo "MAJOR CHANGES NEEDED"
    echo
    echo "$COMMENT"
    STATUS=2
    ;;
  *)
    echo "No VERDICT line found. The review may have failed partway."
    echo
    echo "$COMMENT"
    STATUS=0
    ;;
esac

echo "──────────────────────────────────────────────"
gh pr view "$PR_NUMBER" --json url --jq '"PR: " + .url'

exit "$STATUS"
