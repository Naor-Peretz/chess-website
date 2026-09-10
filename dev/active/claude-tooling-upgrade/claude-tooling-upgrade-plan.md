# Claude Tooling Upgrade Plan

**Date:** 2026-09-07
**Branch:** `chore/opus5-prompt-audit` (in flight) then one branch per phase
**Scope:** `.claude/` (agents, skills, hooks, commands, scripts, settings), `.github/` (workflows, scripts), `.husky/`, `CLAUDE.md`, and the local plan-review loop
**Target model family:** Claude 5 (local default `claude-fable-5-1`; CI `opus` alias)
**Evidence:** `claude-tooling-upgrade-context.md` (file:line for every claim)

## Status (updated 2026-09-07)

All seven phases have shipped as PRs #168, #170, and #171. **The "Why" table and
the phase descriptions below record the state at audit time, not now** — read
`claude-tooling-upgrade-tasks.md` for what actually landed and what was
deliberately left out.

Three things below are known to be wrong in hindsight, kept for the record:

- Phase 2's `PreCompact` hook cannot work; Claude Code ignores hook output on
  that event. It was built, found inert, and removed.
- Phase 5's `--max-turns 5` was far too low, and the job also needs
  `id-token: write`, an explicit `github_token`, and a separate step to post the
  comment. All discovered by running it.
- Phase 6's "pass build output to e2e via upload-artifact" was dropped: a Next
  `.next` tree needs `node_modules` beside it and carries absolute paths, so the
  round-trip loses to a rebuild. Turbo remote caching is the real lever.

**Open deploy question:** `engines.node` is now `>=22.0.0`. `.nvmrc` is 22 and
Render reads it, but Render's and Vercel's Node versions can also be pinned in
their dashboards, which this repo cannot see. Confirm both build on 22 before
merging #170.

## Why

The `.claude/` setup was imported from a Keycloak/MUI/microservices showcase repo in January 2026 and has been patched, not rebuilt. Commit 60cf70b removed "pressure language" but left the structural problems. Measured state on 2026-09-07:

| Surface | Count | Actually working for this repo |
| --- | --- | --- |
| Agents | 19 | 11 relevant; 4 pure foreign fossils (Keycloak, PM2, MySQL, Go); 3 duplicates |
| Skills | 22 (+3 commands) | 9 worth keeping; 11 unwired, foreign, or duplicate |
| Hooks wired | 16 | 3 do what they claim; none of the 3 "blockers" block (exit 1 is non-blocking) |
| Hooks orphaned | 5 | 2 are dangerous if ever wired (infinite Stop loop, nested `claude` spawn) |
| Skill-activation hook | fires on 55 to 68% of prompts | substring match: `UI` matches `build`, `form` matches `information` |
| GitHub | CodeQL cron | auto-disabled by GitHub since ~July 2026 (60-day inactivity) |
| GitHub | branch protection on `main` | none; "never push to main" is convention only |
| Plan-review CI | 3 model jobs | watcher parses `UNKNOWN` because the Claude prompt never asks for a verdict token |

Two Claude 5 facts drive the design: prompts written for older models are usually too prescriptive and reduce output quality, and skills now auto-trigger from their frontmatter `description`, which makes the keyword-matching hook redundant. Path-scoped `.claude/rules/*.md` files load only when matching files are read, which is the right home for "when in backend, do X" guidance.

## Target end state

```
.claude/
├── settings.json          # 7 hooks, deny list, no dead MCP entries
├── rules/
│   ├── backend.md         # paths: apps/backend/**   (layered arch, BaseController, Zod, Sentry)
│   ├── frontend.md        # paths: apps/frontend/**  (App Router, apiClient, a11y, Tailwind)
│   ├── prisma.md          # paths: **/prisma/**, **/schema.prisma
│   └── security.md        # paths: **/auth*, **/csrf*, **/api/proxy/**
├── agents/  (11)          # planner, plan-reviewer, code-reviewer, code-refactor-master,
│                          # database-reviewer (rewritten), e2e-runner (rewritten),
│                          # build-error-fixer (merged), tdd-guide, dead-code-cleaner,
│                          # documentation-architect, web-research-specialist
├── skills/  (9)           # backend-dev-guidelines, frontend-dev-guidelines, secure-coding,
│                          # postgres-patterns, skill-developer, plan-review (merged check+end),
│                          # dev-docs, dev-docs-update, route-research-for-testing
├── hooks/   (~7 files)    # bash + jq or .cjs only; no tsx, no node_modules
└── scripts/               # check-plan-review.sh (fixed), end-plan.sh
.github/
├── workflows/ ci.yml (3 parallel jobs + e2e), codeql.yml (v4), container-security.yml (pinned),
│              plan-review.yml (claude-code-action@v1, one job, verdict tokens)
├── dependabot.yml, PULL_REQUEST_TEMPLATE.md
└── scripts/  (deleted: Gemini reviewer)
```

Numbers: roughly 10,000 lines removed from `.claude/`, 37 MB of `hooks/node_modules` gone, zero per-prompt hook latency, and every remaining file references only tools, scripts, and paths that exist in this repo.

## Phases

Each phase is one PR. Phases 1 and 2 are independent of each other and can run in parallel. Phase 0 must land first because later phases touch the same files.

### Phase 0: Land the in-flight work (effort S, today)

The working tree already has the frontend-dev-guidelines rewrite (490 lines of MUI/Vite content to 62 accurate lines, 8 resource files deleted) and the Sentry 10 fix in error-tracking. Both verified safe: nothing references the deleted files.

1. Update the `frontend-dev-guidelines` entry in `skill-rules.json` (still says MUI v7, `enforcement: block`) so the WIP is internally consistent.
2. Move `analyze_logs.py`, `analyze_skill_usage.py`, and the 23 root `*.png` screenshots out of the repo (scratch dir or delete). Add `*.png` at repo root to `.gitignore`.
3. Commit, push, open PR. This is the baseline for every later diff.

### Phase 1: Repository safety (effort S, one PR plus GitHub settings)

No prompt work here. These are the items with real exposure.

1. `gh workflow enable codeql.yml` and bump `github/codeql-action` v3 to v4. Remove `continue-on-error` from the analyze step so failures are visible.
2. Create a ruleset on `main`: require the `CI` and e2e checks, block direct pushes and force pushes, require a PR. This turns Git rule 2 from convention into enforcement.
3. Enable GitHub secret scanning and push protection (both currently off; Gitleaks only runs post-push).
4. `container-security.yml`: pin `aquasecurity/trivy-action` to a tag, set `exit-code: 1`, delete the dead frontend step, add `permissions` and `timeout-minutes`. Decide whether to keep the `paths:` filter (it makes the check non-requirable).
5. Bump action majors across all workflows: `checkout` v7, `setup-node` v7, `pnpm/action-setup` v6, `github-script` v9, `gitleaks-action` v3. Add `.github/dependabot.yml` with `github-actions` and grouped `npm` updates so this never drifts again.
6. `ci.yml`: add `timeout-minutes` to the `ci` job, delete the `prisma migrate status` step (always fails against the fake URL), upload the Playwright HTML report and traces on failure.
7. `apps/backend/Dockerfile`: `pnpm@latest` to `pnpm@9.15.0` to match `packageManager`.
8. `.husky/pre-push`: change shebang to `#!/bin/bash` (dash breaks the `[[` and `&>` lines, so the plan-watcher block never runs). Add `.husky/pre-commit` running `lint-staged`, or remove the `lint-staged` config and dependency.

### Phase 2: Hooks rebuild (effort M)

Principle: a hook exists only if it enforces something CLAUDE.md cannot, and it uses the real contract (exit 2 or `permissionDecision: deny` to block; `hookSpecificOutput.additionalContext` to reach Claude on tool events).

**Delete (14 files):** `tmux-guard`, `long-running-reminder`, `suggest-compact`, `suggest-code-review`, `async-build`, `pr-logger`, `console-log-warn`, `check-console-log.cjs`, `markdown-blocker`, `error-handling-reminder.{sh,ts}`, `stop-build-check-enhanced`, `trigger-build-resolver`, `tsc-check`, `skill-activation-prompt.{sh,ts}`. Also delete `hooks/node_modules`, `hooks/package.json`, `hooks/package-lock.json`, `hooks/tsconfig.json`, `hooks/README.md`, `hooks/CONFIG.md`, `hooks/state/`, root `CLAUDE_INTEGRATION_GUIDE.md`, and `skills/skill-rules.json`.

**Fix (4 files):**

| Hook | Fix |
| --- | --- |
| `post-tool-use-tracker.sh` | Add the missing `apps/*` case in `detect_repo` (today only `packages/shared` is ever logged). Read `session_id` from stdin JSON, not a nonexistent env var. |
| `playwright-test-guard.sh` | Output `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"..."}}` instead of exit 1. Keep the bypass, but as a documented env var rather than a `touch` command printed to Claude. |
| `post-plan-review.sh` | Wrap the instructions in `additionalContext` JSON. Mention `git add -f` because `dev/` is gitignored. |
| `auto-format.sh` | Run prettier synchronously (drop the trailing `&`) so the next Edit does not race a background rewrite. |

**Add (3 hooks, new events):**

| Event | Purpose |
| --- | --- |
| `SessionStart` | Inject `git status -sb`, the open PR for the branch (if any), and the list of `dev/active/*` directories. Replaces the static skill-nag with live context. |
| `Notification` (matcher `permission_prompt\|idle_prompt`) | Telegram ping only when Claude actually needs the user. Replaces the every-turn Stop spam. Keep a Stop hook only if a "task finished" ping is wanted. |
| `PreCompact` | Remind Claude to run `/dev-docs-update` if a `dev/active` doc was touched this session. |

Resulting `settings.json` wiring: SessionStart 1, PreToolUse Bash 1, PostToolUse Edit\|Write 2, PostToolUse playwright 1, PostToolUse ExitPlanMode 1, Notification 1, PreCompact 1. Also: delete the `enabledMcpjsonServers` entry (no `.mcp.json` exists), and add a `permissions.deny` list for `git push --force`, `rm -rf` outside scratch, and `gh pr merge` (Git rule 1). Run `/fewer-permission-prompts` to replace the 110-line `settings.local.json`, which contains shell fragments like `Bash(do)` and `Bash(then)`.

Verification: pipe sample stdin JSON into every remaining hook and assert the exact stdout; time each one (target under 100 ms). Use `claude --debug` for one session to confirm hook output reaches the model.

### Phase 3: Agents consolidation, 19 to 11 (effort M)

**Delete:** `auth-route-debugger`, `auth-route-tester`, `_disabled_code-architecture-reviewer`, `go-build-resolver`, `go-reviewer`.
**Merge:** `architect` and `refactor-planner` into `planner` (carry the trade-off template); `auto-error-resolver` into `frontend-error-fixer`, renamed `build-error-fixer`, covering both apps via `pnpm build` and `tsc --noEmit`.
**Rewrite:** `e2e-runner` (656 lines of Vercel agent-browser and prediction-market content) to about 120 lines around the real `apps/frontend/e2e/`, `playwright.config.ts`, and the axe-core gate. `database-reviewer` (662 lines of raw-SQL DBA advice, RLS, `ALTER SYSTEM`) to about 150 lines about `schema.prisma`, migrations, and Supabase pooler constraints.
**Fix in place:** `code-reviewer` diff base `HEAD~1` to `main...HEAD`; `plan-reviewer` description (Keycloak/Auth0 example) and closing line; `tdd-guide` commands (`npm run test:coverage` does not exist, frontend uses Vitest); `documentation-architect` (drop `npx ts-morph` and the memory-MCP line); `code-refactor-master` description example.

Frontmatter standard for all 11: `name`, `description` with 2 to 3 `<example>` blocks, `model` (alias: `sonnet` for mechanical work, `opus` for review and planning, `inherit` otherwise), `tools` only where restriction matters (no `MultiEdit`, it no longer exists), and `effort` where a cheap agent should stay cheap.

Prompt style for Claude 5: state outcome, constraints, and how to verify; keep numbered steps only where order matters (destructive ops, auth). Add the "ground progress claims against tool results" line to every agent that reports status. Give `planner` and `code-reviewer` the boundary line: when asked to assess, report and stop, do not fix.

Rewrite `agents/README.md` as a one-screen table.

### Phase 4: Skills consolidation, 22 to 9, plus path-scoped rules (effort L)

**Delete:** `golang-patterns`, `golang-testing`, `clickhouse-io`, `continuous-learning`, `continuous-learning-v2`, `strategic-compact`, `verification-loop`, `eval-harness`, `iterative-retrieval`, `route-tester`.
**Merge:** `error-tracking` into `backend-dev-guidelines/resources/sentry-and-monitoring.md`; `tdd-workflow` into the `tdd-guide` agent; `check-plan-review` and `end-plan` into one `plan-review` skill with `argument-hint: [check|watch|end]`.
**Move:** the three `.claude/commands/*.md` into `skills/<name>/SKILL.md` (commands are the legacy layout). Drop the three phantom file references in `dev-docs.md`.
**Slim:** `backend-dev-guidelines` resources from 5,400 lines to about 2,000 (purge Keycloak `config.ini`, `/blog-api/` paths, `test-auth-route.js`, the nonexistent `workflow/` event-sourcing chapter); `secure-coding` under 400 lines and drop the AWS/Terraform resource; `skill-developer` to match the hook system that actually exists after Phase 2.

**Add `.claude/rules/`:** four path-scoped files (see target tree). Each is under 80 lines, holds the rules that CLAUDE.md currently carries for that area, and loads only when Claude reads a matching file. CLAUDE.md then shrinks to project overview, commands, git rules, and API contract.

**Descriptions as triggers:** with the keyword hook gone, each skill's `description` is the trigger. Write them as intent categories ("Use when adding or changing an Express route, controller, service, repository, or Prisma query"), not synonym lists. After one week, run `/skill-doctor` and compare 7-day invocation counts against the old activation log; strengthen any description that under-triggers.

### Phase 5: Plan-review pipeline (effort M)

Decision: keep an automated second opinion on plans, but make it one job on the official action and make its output machine-readable.

1. Replace the hand-rolled `npm install -g @anthropic-ai/claude-code` plus `claude -p` matrix with `anthropics/claude-code-action@v1`, one job, `claude_args: --model opus --max-turns 5`, auth via the existing `CLAUDE_CODE_OAUTH_TOKEN`. Add `concurrency` and keep `timeout-minutes: 15`.
2. Prompt ends with: "Finish with exactly one line: `VERDICT: APPROVED` or `VERDICT: NEEDS REVISION` or `VERDICT: MAJOR CHANGES NEEDED`." Post the comment under a stable header the watcher greps for.
3. Delete the Gemini job and `.github/scripts/` (hard-coded `gemini-2.0-flash`, unpinned `@google/genai`, no lockfile, second API key). If a non-Claude opinion is still wanted later, add it back with a current model and a lockfile.
4. `check-plan-review.sh`: fix the `tail -1` on pretty-printed JSON (use `--jq '... | last'`), grep the new `VERDICT:` line, drop the Gemini filter.
5. Retire `watch-plan-review.sh` and the nohup poller. Watching is now `/loop 2m /plan-review check` from inside the session, which self-terminates and needs no pidfile. `end-plan` becomes a no-op wrapper or is folded into the `plan-review` skill.
6. Decide whether the `push: plan/**` trigger stays. Today it runs the review and discards it (comments only post on PRs). Recommend PR-only.

### Phase 6: CI structure and dev loop (effort M)

1. Split `ci` into three parallel jobs: `quality` (format, lint, deps:check), `build-test` (prisma generate, build, test), `security` (audit, license, gitleaks). Pass build output to `e2e` via `upload-artifact` so it stops rebuilding.
2. Align Node: `.nvmrc` 20, local 22, Dockerfile 20, plan-review 22. Pick 22 everywhere and set `engines.node >=22`, or keep 20 and install 20 locally.
3. `scripts/check-dependencies.js`: it blocks CI on every upstream release and makes up to 100 `npm view` calls per run. With Dependabot in place, change it to warn on outdated and fail only on deprecated, and add a lockfile for `.github/scripts` if that directory survives.
4. Rename the e2e job (it runs all specs, not only accessibility), add a real game-flow spec that starts the backend, and add a post-deploy smoke step that curls the Render health endpoint after a merge to `main`.
5. Add `.github/PULL_REQUEST_TEMPLATE.md` with Summary and Test plan sections (Git rule 3).
6. Pre-push: drop the local CodeQL step (minutes per push; CI runs it), keep the fast checks.

### Phase 7: Documentation sync (effort S)

1. CLAUDE.md: "Active work items: None" while `dev/active/` holds four feature dirs; test count is stale; agent and skill lists must match the post-Phase-4 set; add a Hooks section listing the 7 hooks and what each enforces; move area rules into `.claude/rules/`.
2. Rewrite `agents/README.md` and `skills/README.md` as one-screen indexes, or delete `skills/README.md` since CLAUDE.md is the index.
3. Memory: the `MEMORY.md` plan-review note says `timeout 600` and `--max-turns 3`; the file has `timeout 300` and `--max-turns 5`. Update after Phase 5 lands.

## Sequencing and estimates

| Phase | Effort | Depends on | Suggested branch |
| --- | --- | --- | --- |
| 0 Land WIP | S (1 h) | none | `chore/opus5-prompt-audit` |
| 1 Repo safety | S (2 h) | none | `chore/ci-hardening` |
| 2 Hooks | M (half day) | 0 | `chore/hooks-rebuild` |
| 3 Agents | M (half day) | 0 | `chore/agents-consolidation` |
| 4 Skills + rules | L (1 to 2 days) | 2, 3 | `chore/skills-consolidation` |
| 5 Plan-review | M (half day) | 1, 2 | `chore/plan-review-v2` |
| 6 CI structure | M (half day) | 1 | `chore/ci-parallel` |
| 7 Docs | S (2 h) | 4, 5 | `docs/claude-tooling-sync` |

Phases 1 and 6 change only `.github/` and `.husky/`; they do not conflict with 2 through 5.

## Verification per phase

- **Hooks:** sample-stdin tests with exact expected stdout, timing under 100 ms, one `claude --debug` session.
- **Agents and skills:** `claude plugin validate`-style frontmatter check (a 20-line script asserting `name`, `description`, valid `model` alias, no `MultiEdit`), grep for the fossil signals (`Keycloak|PM2|blog-api|test-auth-route|your project|MUI|markets|agent-browser|Sentry v8`) returning zero hits, `/skill-doctor` before and after.
- **CI:** every workflow green on the PR; `gh workflow list` shows CodeQL active; ruleset visible in repo settings.
- **Plan-review:** one throwaway `plan/*` PR that produces a comment with a `VERDICT:` line the script parses.

## Risks and rollbacks

- **Skills under-trigger without the keyword hook.** Mitigation: intent-category descriptions plus `/skill-doctor` review after a week. Rollback: restore the hook from git with word-boundary matching only.
- **Deny-mode Playwright guard blocks a legitimate push.** Mitigation: documented bypass env var; the guard only fires when `apps/frontend` files were edited this session.
- **Fable-style de-prescription changes agent output.** Mitigation: rewrite one agent (`code-reviewer`) first, use it on a real PR, then apply the same style to the rest.
- **Ruleset on `main` blocks the user's own manual merges.** Mitigation: rulesets allow the repo owner to bypass; set bypass for the owner role.

## Out of scope

Application code, dependency upgrades beyond pinning, the `ux-advisor` global skill and its 2 GB knowledge base, and hosting configuration.
