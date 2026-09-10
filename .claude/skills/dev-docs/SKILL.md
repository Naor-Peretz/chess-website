---
name: dev-docs
description: |
  Create a plan and the dev/active/<feature>/ documentation set for it — plan, context, and task checklist. Use when starting work substantial enough to survive a context reset.
argument-hint: Describe what you need planned (e.g., "refactor authentication system", "implement microservices")
---

Create a comprehensive, actionable plan for: $ARGUMENTS

## Instructions

Ground the plan in the codebase's current state (read the relevant files), then produce a structured plan containing:

- Executive Summary
- Current State Analysis
- Proposed Future State
- Implementation Phases (broken into sections)
- Detailed Tasks (actionable items with clear acceptance criteria)
- Risk Assessment and Mitigation Strategies
- Success Metrics
- Required Resources and Dependencies
- Timeline Estimates

Then:

1. **Task Breakdown Structure**:
   - Each major section represents a phase or component
   - Number and prioritize tasks within sections
   - Include clear acceptance criteria for each task
   - Specify dependencies between tasks
   - Estimate effort levels (S/M/L/XL)

2. **Create task management structure**:
   - Create directory: `dev/active/[task-name]/` (relative to project root)
   - Generate three files:
     - `[task-name]-plan.md` - The comprehensive plan
     - `[task-name]-context.md` - Key files, decisions, dependencies
     - `[task-name]-tasks.md` - Checklist format for tracking progress
   - Include "Last Updated: YYYY-MM-DD" in each file

## Quality Standards

- Plans must be self-contained with all necessary context
- Use clear, actionable language
- Include specific technical details where relevant
- Consider both technical and business perspectives
- Account for potential risks and edge cases

## Context References

- Read `CLAUDE.md` for the project's architecture, patterns, and git rules
- Read `dev/active/*/‑context.md` for any related work already in flight
- Read the code the plan will touch, and cite real paths in the plan

**Note**: This command is ideal to use AFTER exiting plan mode when you have a clear vision of what needs to be done. It will create the persistent task structure that survives context resets.
