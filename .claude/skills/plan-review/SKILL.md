---
name: plan-review
description: |
  Check what the CI plan reviewer said about the plan on the current PR, and close out the planning phase when it is approved. Use when asked for plan review feedback, whether CI has reviewed a plan, or to finish planning and start implementing.
argument-hint: '[check|end]'
user_invocable: true
---

# Plan Review

`.github/workflows/plan-review.yml` reviews plan files on plan PRs and posts the
result as a PR comment ending in a `VERDICT:` line. This skill reads that
comment and decides what happens next.

## check (default)

```bash
.claude/scripts/check-plan-review.sh
```

The script finds the PR for the current branch, pulls the latest review comment,
and prints the verdict.

Act on what comes back:

| Verdict                | What to do                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `APPROVED`             | Say so, and ask which part of the plan to build first.                                                   |
| `NEEDS REVISION`       | Summarise the concerns, then offer to revise the plan. Pushing the revision re-triggers the review.      |
| `MAJOR CHANGES NEEDED` | Walk through why the approach does not hold, and work out a different one before touching the plan file. |
| No comment yet         | The workflow has not finished, or nothing matched its path filter. Check `gh pr checks`.                 |

Read the plan file before proposing revisions. Reviewer feedback names sections;
addressing it from the comment alone tends to produce edits that miss the point.

## Watching for it

Do not background a polling loop. Ask the user to run:

```
/loop 2m /plan-review check
```

That re-runs the check on an interval inside the session and stops when they
stop it — no pidfile, no orphaned process.

## end

Confirm the final verdict, summarise the PR, and move into implementation. If the
plan was never approved, say that plainly rather than proceeding past it.

## Notes

`dev/` is gitignored. Committing a plan file needs `git add -f dev/active/...`,
or the commit lands empty and CI reviews nothing.
