---
name: route-research-for-testing
description: |
  Find the backend routes changed this session and work out what to test for each. Use after editing route, controller, or service files and before writing or running API tests.
argument-hint: '[extra/path ...]'
allowed-tools: Bash(cat:*), Bash(awk:*), Bash(grep:*), Bash(sort:*), Bash(sed:*), Read, Glob
---

## Context

Route files edited this session, from the post-tool-use tracker:

!`cat "$CLAUDE_PROJECT_DIR"/.claude/tsc-cache/*/edited-files.log 2>/dev/null | awk -F: '{print $2}' | grep -E '(routes|controllers|services)/' | sort -u`

Additional paths the user named: `$ARGUMENTS`

## Your task

If the list above is empty, say so and stop — there is nothing to research.

For each route touched, trace it through the layers and report what a test has
to cover:

1. **The route definition** in `apps/backend/src/routes/` — method, path, and
   which middleware runs before the handler (auth, rate limiting, validation).
2. **The controller method** — the Zod schema it validates against, and every
   branch that can return a non-2xx.
3. **The service and repository calls** underneath, including whether a write
   goes through one of the `*WithVersion` optimistic-locking methods.

Then list the cases worth testing, grouped as:

- **Happy path** — the shape of a valid request and the wrapped
  `{ success: true, data: ... }` response.
- **Validation failures** — each field the schema can reject.
- **Auth** — missing token, expired token, and a valid token for a different
  user (ownership is enforced in the query, so this case is the one that catches
  a privilege escalation).
- **Conflict** — for versioned writes, a stale version producing 409.

Existing tests live in `apps/backend/src/controllers/__tests__/` and
`src/services/__tests__/`; follow their Supertest and mocked-container setup
rather than inventing a new one. Say which cases are already covered there and
which are genuinely missing.

Report the analysis. Write the tests only if asked.
