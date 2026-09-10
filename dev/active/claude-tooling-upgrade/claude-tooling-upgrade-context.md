# Claude Tooling Upgrade: Context and Evidence

Audit date 2026-09-07. Claude Code 2.1.263, node v22.18.0, pnpm 9.15.0. Four parallel read-only audits (agents, skills, hooks, CI) plus a docs lookup. Every claim below carries a file:line from that audit; re-verify before editing since line numbers shift.

Docs used: code.claude.com/docs/en/{sub-agents,skills,hooks,settings-reference,plugins,github-actions,memory,workflows}.md

## Provenance

`.claude/` was copied from a showcase repo (Keycloak auth, MUI v7, TanStack Router, PM2 microservices `blog-api` / `notifications` / `form`, MySQL, a prediction-market frontend, and Go services). Commit 60cf70b (Opus 4.8 era) localized examples and removed caps-lock emphasis in 22 files but did not remove foreign agents, unwired skills, or broken hooks. The prior audit note in `dev/opus5-prompt-audit.md:16` declared six agents "clean"; four of them are foreign fossils.

## Agents (19 files + README)

| Agent | Lines | Key evidence |
| --- | --- | --- |
| auth-route-debugger | 114 | "the your project application's Keycloak" `:3,:7`; `scripts/get-auth-token.js`, `test-auth-route.js` `:13,:46-48` (missing); PM2 `:27-35,:64`; `form/config.ini` `:69`; Keycloak realm `:97-100` |
| auth-route-tester | 88 | `test-auth-route.js` `:21-22`; `docker exec -i local-mysql` `:33`; `WorkflowInstance` `:35-36`; PM2 `:51-59`; `PROJECT_KNOWLEDGE.md` `:79`. Consumers: `commands/route-research-for-testing.md:27`, `skills/route-tester/SKILL.md:303,312` |
| _disabled_code-architecture-reviewer | 85 | MUI/TanStack `:8`; `WorkflowEngine V3` `:44`; superseded per `code-reviewer.md:6` "Merged from code-architecture-reviewer" |
| go-build-resolver / go-reviewer | 384 / 280 | no `*.go` in repo |
| architect | 231 | Redis vector "semantic market search" ADR `:124-132`; `:211-231` duplicates CLAUDE.md |
| refactor-planner | 62 | saves to `/documentation/refactoring/` `:56-57` (nonexistent) |
| auto-error-resolver | 166 | `MultiEdit` in `tools:` `:4` and body `:45`; reads `~/.claude/tsc-cache/<sid>/last-errors.txt` `:31-34,:122-125` written only by unwired hooks; `tsconfig.app.json` `:143` missing |
| e2e-runner | 656 | Vercel `agent-browser` primary `:12-96` (not installed); `tests/markets.spec.ts` `:129`; markets/wallet tree `:225-247`; `MarketsPage` POM `:252-353`; `staging.pmx.trade` `:544`; MetaMask `:590-629`; proposed config `:358-405` contradicts `apps/frontend/playwright.config.ts` (testDir `./e2e`, chromium only) |
| database-reviewer | 662 | RLS `auth.uid()` `:283-324,:650-651` (backend uses Prisma, no RLS); `ALTER SYSTEM` `:355-368` (impossible on Supabase); "avoid random UUIDs" `:241-244` contradicts schema |
| code-reviewer | 277 | `git diff HEAD~1` `:24-27`; referenced by `hooks/suggest-code-review.sh:52,63`; project checklist `:151-177` is good |
| plan-reviewer | 56 | consumed by `hooks/post-plan-review.sh:30`; Keycloak/Auth0 example `:3`; HTTPie/Keycloak closer `:56`; no `model` |
| tdd-guide | 301 | `npm run test:coverage` `:78,:277` (no such script); 80% threshold `:283-288` not in `apps/backend/jest.config.js`; frontend is Vitest (`apps/frontend/package.json:11`) |
| documentation-architect | 287 | `npx ts-morph` `:38` (not a CLI); "check memory MCP" `:103` (none configured) |
| code-refactor-master | 92 | description example still "LoadingOverlay" `:3` |
| planner | 231 | best localized; `useSuspenseQuery` `:166` unused in frontend |
| frontend-error-fixer | 71 | localized; no `model`; merge target |
| dead-code-cleaner, web-research-specialist | 252 / 80 | fine |
| README.md | | "18 agents" `:20` (19 files); stale screenshot notes `:139,:320-323,:367`; `cp showcase/.claude/agents/...` `:300`; "optional frontmatter" `:400-420` (name and description are required) |

Repo facts verified: no `scripts/test-auth-route.js`, `get-auth-token.js`, `documentation/`, `docs/CODEMAPS/`, `PROJECT_KNOWLEDGE.md`, `BEST_PRACTICES.md`, `TROUBLESHOOTING.md`; only MCP configured is `playwright` (global settings); knip/depcheck/ts-prune/agent-browser not in any package.json.

## Skills (22 dirs + 3 commands)

WIP on branch: `git diff --stat .claude/skills` = 12 files, +79/-4728. frontend-dev-guidelines HEAD was MUI/Vite/TanStack (`React.FC`, `vite.config.ts` at old `:180-185`); new file is 62 lines and accurate. Grep for the 8 deleted resource basenames across `.claude/` and CLAUDE.md: zero references. error-tracking diff fixes `handleError` signature `:38` and Sentry 10 API `:297-313`.

Activation hook: `hooks/skill-activation-prompt.ts:84` uses `prompt.includes(kw.toLowerCase())` with no word boundary. Fire rates over 234 logged prompts (`hooks/state/skill-activations.log`): frontend 159 (68%), backend 140, ux-advisor 128 (55%), secure-coding 56, error-tracking 35, route-tester 16, skill-developer 12. It also fires on `<task-notification>` system payloads. Only `promptTriggers` are evaluated (`.ts:76-100`); every `fileTriggers`, `contentPatterns`, `blockMessage`, `skipConditions` block in `skill-rules.json` (`:64-74,:104-138,:163-169,:181-198,:221-229,:296-314`) is dead. `skill-rules.json:77-133` frontend entry still says MUI v7 with `enforcement: block`. `secure-coding` intent `:178` matches any "add|fix|update ... code|function|component|route". 13 of 22 skill dirs have no entry at all.

| Skill | Lines (SKILL / resources) | Key evidence |
| --- | --- | --- |
| backend-dev-guidelines | 314 / 5,415 | `:10` "microservices (blog-api, auth-service...)"; `resources/configuration.md:99-269` Keycloak `config.ini`; `testing-guide.md:187-194` `test-auth-route.js`; `services-and-repositories.md:60,242,270` `/blog-api/`, "AFRL Monthly Report"; `architecture-overview.md:184-348` nonexistent `workflow/` dir; `sentry-and-monitoring.md:3,21` "Sentry v8" |
| error-tracking | 369 / 0 | description "Sentry v8 ... your project" `:3`; cron jobs `:16,:78-102,:295`; `./blog-api/src/instrument.ts` `:197,:220,:342`; curl `localhost:3002/blog-api` `:263-285` |
| route-tester | 403 / 0 | Keycloak realm `:24`; `/root/git/your project_pre/scripts/test-auth-route.js` `:35`; `blog-api/777/submit` `:40-158`; `config.ini` `:171` |
| secure-coding | 571 / 363 | over 500 lines; resource is AWS/Terraform/Cloudflare (`cloud-infrastructure-security.md:11,14,207,265`) |
| skill-developer | 457 / 1,875 | documents `skill-verification-guard.ts` `:188,:433` (missing) and block enforcement the hook does not implement |
| tdd-workflow | 420 / 0 | markets/Redis examples `:62-103,:167-198`; `npm run test:coverage` `:127`; overlaps tdd-guide agent |
| verification-loop | 120 / 0 | no frontmatter (`:1` is a heading); `pyright`/`ruff` `:17-45`; `/verify` `:114` missing |
| strategic-compact | 70 / 52 | wired hook is a different file (`settings.json:51` runs `hooks/suggest-compact.sh`); skill copy uses `/tmp/claude-tool-count-$$` (per-PID, never accumulates) |
| continuous-learning v1 | 80 / 60 | unwired; `evaluate-session.sh` only prints two lines; `~/.claude/skills/learned` missing; `/learn` missing |
| continuous-learning-v2 | 301 / 931 | unwired; expects `${CLAUDE_PLUGIN_ROOT}` `:106,:117`, `~/.claude/homunculus`; `/instinct-status`, `/evolve` `:169-182` missing |
| eval-harness / iterative-retrieval | 264 / 204 | generic essays, no wiring; `tools:` nonstandard key |
| golang-patterns / golang-testing / clickhouse-io | 672 / 720 / 447 | no Go or ClickHouse in repo |
| postgres-patterns | 153 | keep; RLS example `:65-69` does not apply |
| check-plan-review / end-plan | 51 / 43 | wrap `.claude/scripts/*.sh`; nonstandard `user_invocable` key (official is `user-invocable`); `check-plan-review/SKILL.md:48` runs `--watch` in the foreground, which would hang the Bash tool |
| commands/dev-docs.md | 54 | `:47-49` references `PROJECT_KNOWLEDGE.md`, `BEST_PRACTICES.md`, `TROUBLESHOOTING.md` (missing) |
| commands/dev-docs-update.md | 63 | `:35-39` MCP-memory leftover |
| commands/route-research-for-testing.md | 27 | dispatches to auth-route-tester |
| skills/README.md | | lists 5 of 22; every count wrong (`:28,:87-122,:132-137,:163-167`); showcase install text `:209-218` |

## Hooks (16 wired, 5 orphaned)

Contract facts (docs, hooks.md): exit 2 blocks; exit 1 is a non-blocking error shown to the user; plain stdout on exit 0 reaches Claude only for UserPromptSubmit and SessionStart; tool events need `hookSpecificOutput.additionalContext` or `permissionDecision`; PostToolUse field is `tool_response`; `session_id` is in stdin JSON, and `CLAUDE_SESSION_ID` / `CLAUDE_FILE_PATH` are not set.

| Hook | Wired | Evidence |
| --- | --- | --- |
| skill-activation-prompt.{sh,ts} | UserPromptSubmit | 0.36 s per prompt via `npx tsx`; 37 MB `hooks/node_modules`; `$HOME/project` fallback `.ts:69` |
| playwright-test-guard.sh | PreToolUse Bash | exit 1 `:64` non-blocking; tracker never logs `apps/*` so guard never has data (0 `apps/` lines across 42 cached sessions); prints a `touch` bypass command |
| tmux-guard.sh | PreToolUse Bash | `tmux` not installed; exit 1 `:20`; contradicts CLAUDE.md `pnpm dev` |
| long-running-reminder.sh | PreToolUse Bash | stderr invisible; regex `:10` matches bare `yarn` |
| markdown-blocker.sh | PreToolUse Write | exit 1 `:33` non-blocking |
| suggest-compact.sh | PreToolUse Edit\|Write | `/tmp/claude-compact-tracker-default` shared across sessions `:9`; stderr invisible |
| post-tool-use-tracker.sh | PostToolUse Edit\|Write | `detect_repo` `:44-84` has no `apps` case (tested: `apps/backend/src/app.ts` returns `unknown`, no cache dir written); `pnpm-lock.yaml` per-package check `:97` |
| suggest-code-review.sh | PostToolUse Edit\|Write | `CLAUDE_FILE_PATH` `:25` never set; security branch never fires (tested with `authApi.ts`) |
| async-build.sh | PostToolUse Edit\|Write | writes `/tmp/claude-build-result-*.log`; grep finds no reader |
| auto-format.sh | PostToolUse Edit\|Write | works; background `&` at `:23` races the next Edit |
| pr-logger.sh | PostToolUse Bash | reads `.tool_result.stdout` `:7` (field is `tool_response`); tested silent |
| console-log-warn.sh | PostToolUse Bash | runs after commit so `git diff --cached` is empty; tested silent |
| playwright-test-tracker.sh | PostToolUse mcp playwright | works (16 markers in caches) |
| post-plan-review.sh | PostToolUse ExitPlanMode | plain stdout `:25-50` never reaches Claude; does not mention `git add -f` for gitignored `dev/` |
| check-console-log.cjs | Stop | works (26 ms) but stderr invisible; no `stop_hook_active` guard; scans all dirty files |
| telegram-notify.sh | Stop | fires every turn; reads `.stop_reason // .reason` `:15` (neither exists) so always "Needs your attention" `:55`; hard-codes `sessions-index.json` layout `:21-25` |
| error-handling-reminder.{sh,ts} | orphan | reads `$HOME/.claude/tsc-cache` `.ts:107` (tracker writes to project dir); tab vs colon format mismatch `:122` |
| stop-build-check-enhanced.sh | orphan | exit 2 without `stop_hook_active` `:106,:120` (infinite loop if wired); `rm -rf "$cache_dir"` `:124`; `cd X && npx tsc` via word-splitting `:56` (broken) |
| trigger-build-resolver.sh | orphan | foreign service list `:4`; spawns `claude --agent build-error-resolver` and `claude chat` `:31,:38` (neither exists) |
| tsc-check.sh | orphan | foreign service list `:26`; `$HOME/project` `:6`; `${session_id:-default}` unset `:8` |
| README.md / CONFIG.md | docs | reference `stop-prettier-formatter.sh` (CONFIG `:40,:146,:299`), `docs/HOOKS_SYSTEM.md` (missing) |

Unused events available: SessionStart, SessionEnd (present, empty), PreCompact, SubagentStart, SubagentStop, Notification, PostToolUseFailure, PermissionRequest.

`settings.json` extras: `enabledMcpjsonServers` lists 4 servers but no `.mcp.json` exists `:3`; `permissions.allow` includes bare `Bash` `:5`. `settings.local.json` has 110 allow entries including shell fragments `Bash(do)`, `Bash(then)`, `Bash(fi)` `:53-61`.

## Plan-review scripts

`check-plan-review.sh:39-41` filters comments containing "Claude Plan Review" (matches `plan-review.yml:136`), then greps `APPROVED|NEEDS REVISION|MAJOR CHANGES NEEDED` `:44-58`. The Claude prompt `plan-review.yml:165-168` never asks for those tokens; only the Gemini system prompt does (`review-plan-gemini.mjs:38`), and Gemini's header "Gemini Plan Review" `:66` is excluded by the filter. `check-plan-review.sh:79` does `tail -1` on pretty-printed `gh api --jq` output, so `jq -r .id` gets `}`. `watch-plan-review.sh:16` nohup-polls every 60 s with a `/tmp` pidfile; nothing calls `start` except the dash-broken block in `.husky/pre-push:82-92`.

## CI/CD

| Item | Evidence |
| --- | --- |
| CodeQL cron disabled | `gh workflow list --all` shows `disabled_inactivity`; last scheduled run 2026-05-04; last `main` commit 2026-03-03 |
| No branch protection | `gh api` returns no rulesets and no protection on `main` |
| Secret scanning, push protection, dependabot security updates | all disabled in repo settings |
| ci.yml actions | `checkout@v4` `:24,:103`, `pnpm/action-setup@v4` `:29,:106`, `setup-node@v4` `:33,:109`, `gitleaks-action@v2` `:91`; latest are v7.0.1, v6.1.0, v7.0.0, v3.0.0 |
| ci.yml gaps | `ci` job has no `timeout-minutes`; `prisma migrate status` `:59-63` always fails (fake URL, `continue-on-error`); e2e job `:95-124` rebuilds everything; no artifact upload; Playwright `retries: 2` in CI |
| codeql.yml | `codeql-action@v3` `:30,:36,:39` (v4 exists); `analyze` has `continue-on-error: true` `:42` |
| container-security.yml | `trivy-action@master` `:49,:58`; `scan-type: fs` `:51-52` never builds the image; frontend step `:56-63` targets a nonexistent Dockerfile; `paths:` filter `:5-14`; no permissions or timeout |
| plan-review.yml | `npm install -g @anthropic-ai/claude-code` unpinned `:118`; `timeout 300 ... --max-turns 5` `:184` (MEMORY.md says 600 / 3); matrix `[opus, sonnet]` `:100`; `continue-on-error` `:122`; Gemini `gemini-2.0-flash` `:291` and `review-plan-gemini.mjs:42`; `@google/genai ^1.0.0` no lockfile (`.github/scripts/package.json:7`); `github-script@v7` `:241,:298` (v9 exists); comments only on `pull_request` `:255-260,:311-316` so `push: plan/**` runs are discarded |
| Node drift | `.nvmrc` 20; local 22.18.0; `apps/backend/Dockerfile:2,31` node:20-alpine; `plan-review.yml:115,281` Node 22; `engines.node >=18` (`package.json:36`) |
| Dockerfile | `pnpm@latest` `:5,:34` ignores `packageManager: pnpm@9.15.0` (`package.json:34`) |
| deps:check | `scripts/check-dependencies.js:135-137` exits 1 on any outdated; deprecated check swallows errors `:130-132`; caps at 100 deps `:102`; up to 100 `npm view` calls |
| pre-push | `#!/bin/sh` `:1` with `&>` `:35` and `[[` `:83`; `/bin/sh` is dash; local CodeQL `:41-74`; `lint-staged` configured (`package.json:25-33`) but no `.husky/pre-commit` |
| Clutter | `.github/test-screenshots/*.png` (3 files, unused); 23 `*.png` at repo root untracked |

## Claude 5 prompting guidance applied (from the bundled claude-api skill, `shared/model-migration.md` and `shared/prompt-audit.md`)

- Prompts and skills written for prior models are often too prescriptive and reduce output quality; state goal, constraints, and verification, keep step lists only for fragile operations.
- Delegation is dependable; give agents explicit guidance on when to delegate rather than suppressing it.
- Add "ground progress claims against tool results" to any agent that reports status.
- Add the boundary line ("when asked to assess, report and stop") to review and planning agents.
- Remove anti-formatting rules and update suppressors; Claude 5 under-formats and under-narrates when those are present.
- Trigger text (skill `description`) may carry calibrated urgency; body text should not.
- Valid agent `model` values: `sonnet`, `opus`, `haiku`, `fable`, `inherit`, or a full model ID. `MultiEdit` is no longer a tool.
- Skills frontmatter: `description`, `allowed-tools`, `user-invocable`, `disable-model-invocation`, `context: fork`, `agent`, `argument-hint`. Target under 200 lines per SKILL.md with progressive disclosure.
- `.claude/rules/*.md` with `paths:` frontmatter loads only when matching files are read.
- Hook events in 2.1.x: SessionStart, SessionEnd, UserPromptSubmit, Stop, StopFailure, PreToolUse, PostToolUse, PostToolUseFailure, Notification, PreCompact, SubagentStart, SubagentStop, PermissionRequest, and others.
- CI: `anthropics/claude-code-action@v1` with `claude_code_oauth_token` and `claude_args`; `claude -p` supports `--max-budget-usd`, `--effort`, `--json-schema`.
- `/skill-doctor` reports per-skill token cost and 7-day usage; use it to validate the trigger rewrite.
