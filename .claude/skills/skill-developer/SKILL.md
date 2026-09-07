---
name: skill-developer
description: |
  How Claude Code customization works in this repo. Use when creating or editing a skill, agent, or hook, when a skill is not triggering as expected, or when changing settings.json wiring.
---

# Skill Developer

What lives under `.claude/`, and how each piece is actually wired.

```
.claude/
├── settings.json        # hook wiring + permission allow/deny (committed)
├── settings.local.json  # per-machine permission allowlist
├── agents/              # 11 subagents, see agents/README.md
├── skills/              # 9 skills, one SKILL.md each
├── hooks/               # 8 hooks + test-hooks.sh
├── rules/               # path-scoped guidance, loaded on file match
└── scripts/             # plan-review helpers
```

## Skills

A skill is a directory holding `SKILL.md` with YAML frontmatter:

```yaml
---
name: my-skill
description: What this covers and when to reach for it.
---
```

**The `description` is the trigger.** Claude reads every skill's description and
loads the body when the work matches. There is no keyword-matching hook — this
repo had one, and it fired on most prompts because it matched bare substrings
("UI" inside "build", "form" inside "information").

Write descriptions as intent categories, not synonym lists:

```yaml
# Good — says when it applies
description: Patterns for the Express 5 + Prisma 7 backend in apps/backend. Use when
  adding or changing a route, controller, service, repository, or middleware.

# Bad — a keyword pile that matches everything and nothing
description: Backend, API, server, route, endpoint, controller, service, express, node
```

Optional frontmatter: `argument-hint` for user-invoked skills, `allowed-tools`
to restrict what the skill may call, `model` to pin one.

Keep `SKILL.md` under a few hundred lines. Long reference material goes in
`resources/*.md` alongside it, linked from the body, and is read only when
needed.

## Agents

`.claude/agents/<name>.md`, frontmatter `name`, `description`, optional `model`
(`sonnet` / `opus` / `haiku` / `inherit`) and `tools`.

The description drives selection, so it needs two or three `<example>` blocks
showing a user message and why this agent fits. Use a block scalar
(`description: |`) — a single-line description containing a colon is invalid
YAML and only survives lenient parsing.

## Hooks

Wired in `settings.json`, one entry per event, each with an optional `matcher`
regex against the tool name.

**The contract, which is where the previous hook set went wrong:**

| Exit code | Meaning                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| 0         | Success. Stdout is injected as context only on `UserPromptSubmit`, `SessionStart`, and `PreCompact`.           |
| 2         | Blocking error. Stderr goes to Claude.                                                                         |
| 1         | **Non-blocking** error. Shown to the user, ignored by the flow. A hook that exits 1 to "block" does not block. |

On tool events, plain stdout never reaches the model. To say something to Claude,
print JSON:

```bash
jq -n --arg ctx "$message" \
  '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $ctx}}'
```

To actually deny a tool call from `PreToolUse`:

```bash
jq -n --arg reason "$why" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $reason
  }
}'
```

Read `session_id`, `tool_name`, `tool_input`, and `tool_response` from the stdin
JSON. They are not environment variables. `$CLAUDE_PROJECT_DIR` is.

Note the field is `tool_response`, not `tool_result`.

## Rules

`.claude/rules/*.md` with a `paths:` frontmatter glob load only when Claude reads
a matching file. This is the right home for "when working in X, do Y" guidance —
it costs nothing until it applies, unlike CLAUDE.md, which is always resident.

## Before you commit a hook

```bash
.claude/hooks/test-hooks.sh
```

It pipes a realistic payload into every hook and asserts the output shape and
timing. A hook that emits the wrong shape fails silently at runtime; this is the
only thing that catches it. Add a case when you add a hook.

For live debugging, run `claude --debug` and watch the hook fire.

## When a skill is not triggering

1. Check the description actually describes the situation you are in. This is
   almost always the problem.
2. Confirm the frontmatter parses — a stray colon in an unquoted value breaks it.
3. Run `/skill-doctor` for invocation counts over the past week.
4. Remember you can always invoke it directly with the Skill tool.
