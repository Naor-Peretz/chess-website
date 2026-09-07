---
name: route-research-for-testing
description: |
  Find the backend routes changed this session and work out what to test for each. Use after editing route, controller, or service files and before writing or running API tests.
argument-hint: '[/extra/path …]'
allowed-tools: Bash(cat:*), Bash(awk:*), Bash(grep:*), Bash(sort:*), Bash(xargs:*), Bash(sed:*)
model: sonnet
---

## Context

Changed route files this session (auto-generated):

!cat "$CLAUDE_PROJECT_DIR/.claude/tsc-cache"/\*/edited-files.log \
 | awk -F: '{print $2}' \
 | grep '/routes/' \
 | sort -u

User-specified additional routes: `$ARGUMENTS`

## Your task

Steps:

1. Combine the auto list with `$ARGUMENTS`, dedupe, and resolve any prefixes
   defined in `src/app.ts`.
2. For each final route, output a JSON record with the path, method, expected
   request/response shapes, and valid + invalid payload examples.
3. Launch the `auth-route-tester` agent to run smoke tests against the JSON produced above.
