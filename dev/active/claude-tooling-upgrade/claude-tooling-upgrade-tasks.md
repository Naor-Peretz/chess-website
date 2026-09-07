# Claude Tooling Upgrade: Tasks

Check off as you go. One PR per phase. See the plan for rationale and the context file for evidence.

## Phase 0: Land the in-flight work

- [~] ~~Update `frontend-dev-guidelines` entry in `skill-rules.json`~~ — skipped deliberately: Phase 2 deletes the file
- [x] Move `analyze_logs.py`, `analyze_skill_usage.py` out of the repo
- [x] Delete or move the 23 root `*.png` screenshots; add `/*.png` to `.gitignore`
- [x] Commit WIP on `chore/opus5-prompt-audit`, push, open PR

## Phase 1: Repository safety

- [x] `gh workflow enable codeql.yml`
- [x] `codeql.yml`: `codeql-action` v3 to v4; remove `continue-on-error` on analyze; add `timeout-minutes`, `concurrency`
- [x] Create ruleset on `main`: require CI + e2e, block direct push and force push, owner bypass
- [x] Enable secret scanning and push protection in repo settings
- [x] `container-security.yml`: pin `trivy-action` to a tag, `exit-code: 1`, delete frontend step, add `permissions` and `timeout-minutes`; decide on `paths:` filter
- [x] Bump `checkout` v7, `setup-node` v7, `pnpm/action-setup` v6, `github-script` v9, `gitleaks-action` v3 in all workflows
- [x] Add `.github/dependabot.yml` (github-actions weekly; npm grouped minor/patch)
- [x] `ci.yml`: `timeout-minutes` on `ci` job; delete `prisma migrate status` step; `upload-artifact` Playwright report and traces on failure
- [x] `apps/backend/Dockerfile`: `pnpm@latest` to `pnpm@9.15.0`
- [x] `.husky/pre-push`: `#!/bin/bash`; add `.husky/pre-commit` with `lint-staged` (or remove lint-staged)
- [x] Delete `.github/test-screenshots/`

## Phase 2: Hooks rebuild

- [x] Delete 14 hook scripts: tmux-guard, long-running-reminder, suggest-compact, suggest-code-review, async-build, pr-logger, console-log-warn, check-console-log.cjs, markdown-blocker, error-handling-reminder.{sh,ts}, stop-build-check-enhanced, trigger-build-resolver, tsc-check, skill-activation-prompt.{sh,ts}
- [x] Delete `hooks/node_modules`, `hooks/package.json`, `hooks/package-lock.json`, `hooks/tsconfig.json`, `hooks/README.md`, `hooks/CONFIG.md`, `hooks/state/`, `hooks/scripts/`
- [x] Delete root `CLAUDE_INTEGRATION_GUIDE.md` and `.claude/skills/skill-rules.json`
- [x] Fix `post-tool-use-tracker.sh`: add `apps/*` case; read `session_id` from stdin
- [x] Fix `playwright-test-guard.sh`: JSON `permissionDecision: deny`; env-var bypass
- [x] Fix `post-plan-review.sh`: `additionalContext` JSON; mention `git add -f dev/...`
- [x] Fix `auto-format.sh`: synchronous prettier
- [x] Add `session-start.sh` (git status, open PR, `dev/active` list) on `SessionStart`
- [x] Add `notify.sh` on `Notification` with matcher `permission_prompt|idle_prompt` (Telegram); remove Stop telegram hook
- [x] Add `pre-compact.sh` on `PreCompact` (dev-docs-update reminder)
- [x] Rewrite `settings.json` hooks block (7 hooks); delete `enabledMcpjsonServers`; add `permissions.deny` for `git push --force`, `gh pr merge`, destructive `rm -rf`
- [x] Run `/fewer-permission-prompts`; replace `settings.local.json`
- [x] Add `hooks/test-hooks.sh` that pipes sample stdin into each hook and asserts output; all under 100 ms
- [x] Confirmed hook output reaches the model: a fresh `claude -p` session answered with the branch name, which is only available from `session-start.sh` output

## Phase 3: Agents consolidation

- [x] Delete `auth-route-debugger`, `auth-route-tester`, `_disabled_code-architecture-reviewer`, `go-build-resolver`, `go-reviewer`
- [x] Merge `architect` + `refactor-planner` into `planner`; delete both
- [x] Merge `auto-error-resolver` into `frontend-error-fixer`; rename `build-error-fixer`; delete source
- [x] Rewrite `e2e-runner` (~120 lines, real config and `e2e/` dir)
- [x] Rewrite `database-reviewer` (~150 lines, Prisma schema and migrations)
- [x] `code-reviewer`: diff base `main...HEAD`
- [x] `plan-reviewer`: description examples, closing line, add `model`
- [x] `tdd-guide`: fix commands, Vitest for frontend, drop unenforced 80% threshold or add `coverageThreshold` to jest config
- [x] `documentation-architect`: drop `npx ts-morph` and memory-MCP lines
- [x] `code-refactor-master`: description example
- [x] All 11: `model` alias, `<example>` triggers, no `MultiEdit`, progress-grounding line, boundary line on planner and reviewers
- [x] Rewrite `agents/README.md` as one table
- [x] Fossil grep returns zero: `Keycloak|PM2|blog-api|test-auth-route|your project|MUI|markets|agent-browser|Sentry v8|MultiEdit`

## Phase 4: Skills consolidation and rules

- [x] Delete `golang-patterns`, `golang-testing`, `clickhouse-io`, `continuous-learning`, `continuous-learning-v2`, `strategic-compact`, `verification-loop`, `eval-harness`, `iterative-retrieval`, `route-tester`
- [x] Merge `error-tracking` into `backend-dev-guidelines/resources/sentry-and-monitoring.md`; delete
- [x] Merge `tdd-workflow` into `tdd-guide` agent; delete
- [x] Merge `check-plan-review` + `end-plan` into `plan-review` skill with `argument-hint`
- [x] Move `commands/*.md` to `skills/<name>/SKILL.md`; fix `dev-docs` phantom file refs; delete `commands/`
- [x] Rewrite `route-research-for-testing` — it dispatched to the deleted `auth-route-tester`; now traces routes through the layers itself (caught by the CI plan review)
- [x] Slim `backend-dev-guidelines` resources to ~2,000 lines (purge Keycloak, blog-api, workflow chapter)
- [x] Slim `secure-coding` under 400 lines; delete AWS/Terraform resource
- [x] Slim `skill-developer` to match the real hook system
- [x] Rewrite every surviving `description` as intent categories
- [x] Add `.claude/rules/backend.md`, `frontend.md`, `prisma.md`, `security.md` with `paths:` frontmatter
- [x] Trim CLAUDE.md sections that moved into rules
- [x] Rewrite or delete `skills/README.md`
- [ ] Run `/skill-doctor` after one week of use — deferred by design; the point is comparing invocation counts once the description-only triggering has had time to show

## Phase 5: Plan-review pipeline

- [x] `plan-review.yml`: single job on `anthropics/claude-code-action@v1`, `--model opus --max-turns 5`, `concurrency`, PR-only trigger
- [x] Prompt ends with the `VERDICT:` line requirement; stable comment header
- [x] Delete Gemini job and `.github/scripts/`
- [x] Fix `check-plan-review.sh`: `--jq '... | last'`, grep `VERDICT:`, drop Gemini filter
- [x] Delete `watch-plan-review.sh`; document `/loop 2m /plan-review check`
- [x] Remove plan-watcher block from `.husky/pre-push`
- [x] Proven end to end on PR #171: workflow ran, posted `## Claude Plan Review` with a `VERDICT:` line, and `check-plan-review.sh` parsed it. Two review cycles, both parsed

## Phase 6: CI structure and dev loop

- [x] Split `ci` into `quality`, `build-test`, `security` jobs; e2e consumes build artifact
- [x] Pick one Node major (22 recommended); update `.nvmrc`, Dockerfile, `engines`, workflows
- [x] `check-dependencies.js`: warn on outdated, fail on deprecated; cap network calls
- [x] e2e job renamed to `E2E & Accessibility`
- [ ] Game-flow spec that starts the backend — deliberately out of scope, see below
- [x] Post-merge smoke step: curl Render `/health`
- [x] Add `.github/PULL_REQUEST_TEMPLATE.md`
- [x] Drop local CodeQL from `pre-push`

## Phase 7: Documentation sync

- [x] CLAUDE.md: active work items, test count, agents list, skills list, new Hooks section, Sentry version references
- [x] `MEMORY.md`: correct plan-review timeout and max-turns values
- [ ] Move this feature dir to `dev/completed/` — after #168, #170, #171 merge

## Status

Shipped 2026-09-07 as three stacked PRs, all green:

| PR | Contents | Base |
| --- | --- | --- |
| #168 | Phase 0 + dependency and CI unblocking | `main` |
| #170 | Phases 1 and 6 (repo safety, CI structure) | #168 |
| #171 | Phases 2-5 and 7 (hooks, agents, skills, plan review, docs) | #170 |

### Deliberately not done

- **Required status checks on the main ruleset.** The job names change in #170,
  so requiring them now would deadlock the very PRs that introduce them. Add
  `Quality`, `Build & Test`, `Security`, `E2E & Accessibility`, and
  `Analyze (javascript-typescript)` to ruleset 22445287 once #170 is on `main`.
- **A game-flow e2e spec that starts the backend.** Needs a Postgres service
  container, `migrate deploy`, and a test path through the BFF exchange —
  application-test infrastructure rather than tooling.
- **`.husky/pre-commit` with lint-staged.** `.husky/` is gitignored, so the
  pre-push rewrite is local-only and not reviewable in a PR.
- **`/skill-doctor` baseline.** Worth running a week after #171 lands to see
  which descriptions under-trigger now that the keyword hook is gone.

### Verified

- `.claude/hooks/test-hooks.sh` — 17 assertions green
- Every agent, skill, and rule frontmatter parses as valid YAML
- Fossil grep returns zero hits
- CI green on all three PRs; CodeQL active and passing
- `plan-review.yml` needed `id-token: write` (found by running it), and its
  paths filter needed narrowing — `**/plan-*.md` matched `plan-reviewer.md`
