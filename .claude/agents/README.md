# Agents

Eleven subagents, each scoped to this repo. Claude selects one from its
`description`; you can also name it directly ("use the planner agent to ...").

| Agent                     | Model  | Use it for                                                                    | Writes code? |
| ------------------------- | ------ | ----------------------------------------------------------------------------- | ------------ |
| `planner`                 | opus   | Implementation plans, refactor sequencing, architectural trade-offs           | No           |
| `plan-reviewer`           | opus   | Reviewing a plan before implementation; ends with a `VERDICT:` line CI parses | No           |
| `code-reviewer`           | opus   | Security, performance, and architecture review of a branch diff               | No           |
| `database-reviewer`       | opus   | Prisma schema changes, migrations, query and index review                     | No           |
| `code-refactor-master`    | opus   | Restructuring existing code, extracting components, import updates            | Yes          |
| `build-error-fixer`       | sonnet | TypeScript, build, lint, and browser runtime errors in either app             | Yes          |
| `tdd-guide`               | sonnet | Test-first feature work and bug fixes                                         | Yes          |
| `e2e-runner`              | sonnet | Playwright specs and the axe-core accessibility gate                          | Yes          |
| `dead-code-cleaner`       | sonnet | Unused exports, orphan files, unused dependencies                             | Yes          |
| `documentation-architect` | sonnet | READMEs, API docs, codemaps that match the code                               | Yes          |
| `web-research-specialist` | sonnet | Digging through issues, forums, and docs for an external problem              | No           |

## Conventions

The four review and planning agents report and stop. They do not edit files, so
you can run them on work in progress without them changing it underneath you.

Every agent grounds claims in tool output: findings cite `file:line`, and no
agent reports a command as passing that it did not run.

`plan-reviewer` is wired into the workflow twice — the `post-plan-review` hook
routes an approved plan through it, and `.github/workflows/plan-review.yml` runs
the same review on plan PRs.

Adding one: create `<name>.md` with `name`, `description` (with two or three
`<example>` blocks — this is what triggers selection), `model`, and `tools` only
where restricting them matters. Keep it grounded in paths and commands that
exist here; a generic agent is worse than none.
