# Development Harness

This repository ships with a working AI-assisted development setup, not just
application code. Everything below lives in [`.claude/`](../.claude) and
[`.github/`](../.github) and is version-controlled alongside the app.

The design rule throughout: **a piece of automation exists only if it enforces
something documentation cannot.** Anything that merely restated a convention was
deleted.

---

## Subagents (11)

Task-scoped agents in [`.claude/agents/`](../.claude/agents). Claude picks one
from its `description`; you can also name it directly ("use the planner agent
to…"). Each is grounded in this codebase — real file paths, real commands.

| Agent                     | Model  | Purpose                                                                    | Edits files? |
| ------------------------- | ------ | -------------------------------------------------------------------------- | ------------ |
| `planner`                 | opus   | Implementation plans, refactor sequencing, architectural trade-offs        | No           |
| `plan-reviewer`           | opus   | Reviews a plan before code is written; emits a machine-readable `VERDICT:` | No           |
| `code-reviewer`           | opus   | Security, performance and architecture review of a branch diff             | No           |
| `database-reviewer`       | opus   | Prisma schema, migrations, index and query review                          | No           |
| `code-refactor-master`    | opus   | Restructuring, component extraction, import updates                        | Yes          |
| `build-error-fixer`       | sonnet | TypeScript, build, lint and browser runtime errors                         | Yes          |
| `tdd-guide`               | sonnet | Test-first feature work and bug fixes                                      | Yes          |
| `e2e-runner`              | sonnet | Playwright specs and the axe-core accessibility gate                       | Yes          |
| `dead-code-cleaner`       | sonnet | Unused exports, orphan files, unused dependencies                          | Yes          |
| `documentation-architect` | sonnet | READMEs, API docs and codemaps that match the code                         | Yes          |
| `web-research-specialist` | sonnet | Digging through issues, forums and docs for an external problem            | No           |

The four review and planning agents **report and stop**. They never edit, so you
can run them against work in progress without them changing it underneath you.

Every agent is told to ground claims in tool output: findings cite `file:line`,
and no agent reports a command as passing that it did not run.

---

## Skills (9)

Reference material in [`.claude/skills/`](../.claude/skills), loaded on demand
from each skill's `description`. There is no keyword-matching hook — a skill's
description _is_ its trigger, which is the supported mechanism and costs nothing
until it matches.

| Skill                          | Covers                                                       |
| ------------------------------ | ------------------------------------------------------------ |
| `backend-dev-guidelines`       | Express/Prisma layering, `BaseController`, Zod, Sentry       |
| `frontend-dev-guidelines`      | App Router, `apiClient`, Tailwind, accessibility             |
| `secure-coding`                | JWT, the BFF OAuth exchange, CSRF, ownership checks, secrets |
| `postgres-patterns`            | Index design, query shapes, pooler behaviour, migrations     |
| `plan-review`                  | Read the CI plan verdict, close out the planning phase       |
| `dev-docs` / `dev-docs-update` | Create and refresh `dev/active/<feature>/` docs              |
| `route-research-for-testing`   | Map routes changed this session to the tests they need       |
| `skill-developer`              | How skills, agents, hooks and rules work here                |

---

## Path-scoped rules (4)

[`.claude/rules/`](../.claude/rules) holds area guidance behind a `paths:` glob,
so it loads **only when a matching file is opened** rather than sitting in
context permanently the way `CLAUDE.md` does.

| File          | Applies to                                 | Enforces                                                                                         |
| ------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `backend.md`  | `apps/backend/**`                          | Layering, `unifiedConfig`, `executeWithErrorHandling`, ownership predicates, optimistic locking  |
| `frontend.md` | `apps/frontend/**`                         | BFF routing, the `{ success, data }` envelope, CSRF header, React-compiler purity, the a11y gate |
| `prisma.md`   | `**/prisma/**`, `**/schema.prisma`         | Migration safety, index ordering, Supabase pooler constraints                                    |
| `security.md` | `**/auth*`, `**/*csrf*`, `**/api/proxy/**` | JWT algorithms, token revocation, proxy allowlists, error leakage                                |

---

## Hooks (7)

Shell hooks in [`.claude/hooks/`](../.claude/hooks), wired in
[`.claude/settings.json`](../.claude/settings.json).

| Event                        | Hook                         | What it does                                                                  |
| ---------------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| `SessionStart`               | `session-start.sh`           | Injects branch, open PR, `git status` and `dev/active` items                  |
| `PreToolUse` (Bash)          | `playwright-test-guard.sh`   | **Denies `git push`** when frontend files were edited but no browser tool ran |
| `PostToolUse` (Edit\|Write)  | `post-tool-use-tracker.sh`   | Records which area of the monorepo was touched                                |
| `PostToolUse` (Edit\|Write)  | `auto-format.sh`             | Runs Prettier on the edited file, synchronously                               |
| `PostToolUse` (playwright)   | `playwright-test-tracker.sh` | Marks the session as browser-verified                                         |
| `PostToolUse` (ExitPlanMode) | `post-plan-review.sh`        | Routes an approved plan through review and onto a branch                      |
| `Notification`               | `notify.sh`                  | Telegram ping on permission and idle prompts only                             |

### The hook contract, which is easy to get wrong

| Exit code | Meaning                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `0`       | Success. Plain stdout becomes context only on `UserPromptSubmit`, `UserPromptExpansion`, `SessionStart` and `PostModelSwitch`. |
| `2`       | Blocking error; stderr goes to the model.                                                                                      |
| `1`       | **Non-blocking.** A hook that exits 1 to "block" does not block.                                                               |

On tool events, plain stdout never reaches the model — it needs
`hookSpecificOutput.additionalContext`, or `permissionDecision: "deny"` to
actually stop a call. `PreCompact` ignores hook output entirely, so no hook is
wired there.

### Testing the hooks

```bash
.claude/hooks/test-hooks.sh
```

Pipes a realistic stdin payload into every hook and asserts the output shape and
timing — 17 assertions. A hook emitting the wrong shape fails **silently** at
runtime, so this is the only thing that catches it.

---

## CI/CD

Workflows in [`.github/workflows/`](../.github/workflows).

| Workflow                 | Jobs                                                                      | Trigger                        |
| ------------------------ | ------------------------------------------------------------------------- | ------------------------------ |
| `ci.yml`                 | `quality`, `build-test`, `security`, `e2e` in parallel; `smoke` on `main` | Every push/PR                  |
| `codeql.yml`             | SAST — the blocking security gate for first-party code                    | Push/PR + weekly               |
| `container-security.yml` | Trivy Dockerfile config + fixed-CVE scan                                  | Dockerfile changes             |
| `plan-review.yml`        | Claude reviews plan documents and posts a `VERDICT:` line                 | PR touching `dev/**/*-plan.md` |

**What blocks a merge:** formatting, linting, deprecated packages, the build,
151 unit tests, licence compliance, Gitleaks, Playwright + axe-core, and CodeQL.

**What reports without blocking:** `pnpm audit`. Every current high-severity
advisory is transitive through `@prisma/client`, `@sentry/nextjs` or the Next
toolchain, with no fix this repo controls. Dependabot security updates are the
remediation path; a gate nobody can satisfy just gets bypassed.

`main` is protected by a ruleset: PR required, no force-push, no deletion.

### The plan-review loop

Plan documents get an automated second opinion before implementation starts:

1. A PR changing `dev/**/*-plan.md` triggers `plan-review.yml`.
2. `anthropics/claude-code-action@v1` reviews the plan against `CLAUDE.md` and
   the source it references, using the `plan-reviewer` agent as its standard.
3. The workflow posts the review under a stable `## Claude Plan Review` header,
   ending in `VERDICT: APPROVED` / `NEEDS REVISION` / `MAJOR CHANGES NEEDED`.
4. `.claude/scripts/check-plan-review.sh` greps that line, so the outcome is
   machine-readable rather than prose a human has to interpret.

Watching for the result is `/loop 2m /plan-review check` from inside a session —
no background poller, no pidfile.

---

## Dev docs pattern

Work large enough to outlive a context reset gets a directory under
`dev/active/<feature>/`:

```
<feature>-plan.md      # strategy and phases
<feature>-context.md   # key files, decisions, evidence
<feature>-tasks.md     # checklist
```

`dev/` is gitignored, so committing one needs `git add -f`.

---

## Extending it

[`.claude/skills/skill-developer/SKILL.md`](../.claude/skills/skill-developer/SKILL.md)
documents the frontmatter, the trigger model and the hook contract.

Two things that bite:

- A `description` containing a colon must use a YAML block scalar (`description: |`).
  Unquoted, it is invalid YAML and only survives lenient parsing.
- Hooks are spawned by Claude Code, not by the Bash tool's shell, so a variable
  prefixed onto a command (`FOO=1 git push`) never reaches the hook. Read such
  flags out of `.tool_input.command` instead.
