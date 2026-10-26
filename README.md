# Chess Website

[![CI](https://github.com/Naor-Peretz/chess-website/actions/workflows/ci.yml/badge.svg)](https://github.com/Naor-Peretz/chess-website/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Naor-Peretz/chess-website/actions/workflows/codeql.yml/badge.svg)](https://github.com/Naor-Peretz/chess-website/actions/workflows/codeql.yml)
[![WCAG 2.1 AA](https://img.shields.io/badge/accessibility-WCAG%202.1%20AA-success)](docs/development-harness.md#cicd)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

A modern chess web application where users can play against an AI engine (Stockfish) with customizable difficulty levels and time controls.

> **This repo also ships its own AI-assisted development harness** — 11 subagents,
> 9 skills, 4 path-scoped rule files, 7 hooks and an automated plan-review pipeline,
> all version-controlled in [`.claude/`](.claude).
> **→ [Read the Development Harness guide](docs/development-harness.md)**

## Features

- **Google OAuth Authentication** - Sign in securely with your Google account
- **Play vs Stockfish AI** - 5 difficulty levels from Beginner to Master
- **Time Controls** - Multiple options from Bullet (1 min) to Classical (30 min)
- **Save & Continue** - Games are saved automatically, continue anytime
- **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

### Frontend

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first styling
- **react-chessboard** - Chess board visualization
- **TanStack Query** - Server state management

### Backend

- **Express.js** - Node.js web framework
- **TypeScript** - Type-safe development
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Relational database
- **Passport.js** - Google OAuth authentication
- **chess.js** - Chess move validation
- **Stockfish** - Chess engine for AI opponent

### Infrastructure

- **Turborepo** - Monorepo build system
- **pnpm** - Fast package manager
- **GitHub Actions** - CI/CD pipeline
- **Vercel** - Frontend hosting
- **Render** - Backend hosting
- **Supabase** - PostgreSQL database

## Project Structure

```
chess-website/
├── apps/
│   ├── backend/          # Express API server
│   └── frontend/         # Next.js web app
├── packages/
│   └── shared/           # Shared types & validators
├── .claude/              # Development harness
│   ├── agents/           #   11 task-scoped subagents
│   ├── skills/           #   9 on-demand reference skills
│   ├── rules/            #   4 path-scoped rule files
│   ├── hooks/            #   7 hooks + their test harness
│   └── scripts/          #   plan-review helpers
├── .github/workflows/    # CI/CD configuration
└── turbo.json            # Turborepo configuration
```

## Development Harness

Beyond the application, this repository version-controls the setup used to build
it. The guiding rule: **automation exists only where it enforces something
documentation cannot.**

| Layer                                                                | Count       | What it is                                                                 |
| -------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| [Subagents](docs/development-harness.md#subagents-11)                | 11          | Task-scoped agents — planning, review, TDD, e2e, refactoring, error fixing |
| [Skills](docs/development-harness.md#skills-9)                       | 9           | Reference material loaded on demand from each skill's description          |
| [Path-scoped rules](docs/development-harness.md#path-scoped-rules-4) | 4           | Area guidance that loads only when a matching file is opened               |
| [Hooks](docs/development-harness.md#hooks-7)                         | 7           | Session context, push guard, auto-format, plan routing, notifications      |
| [CI/CD](docs/development-harness.md#cicd)                            | 4 workflows | Parallel quality/build/security/e2e, CodeQL, Trivy, AI plan review         |

A few things it actually enforces, rather than merely suggesting:

- **Frontend changes cannot be pushed without browser verification.** A
  `PreToolUse` hook denies `git push` when `apps/frontend` files were edited but
  no Playwright browser tool ran in the session.
- **Plans get a second opinion before code is written.** A PR touching a plan
  document triggers a Claude review that posts a machine-readable
  `VERDICT: APPROVED | NEEDS REVISION | MAJOR CHANGES NEEDED`.
- **Accessibility is a merge gate.** `e2e/accessibility.spec.ts` runs axe-core
  over every page and blocks the PR on a new WCAG 2.1 AA violation.
- **Hooks are tested.** `.claude/hooks/test-hooks.sh` pipes realistic payloads
  into every hook and asserts its output shape — 17 assertions. A hook emitting
  the wrong shape fails silently at runtime, so nothing else would catch it.

Full detail, including the hook contract and how to extend any of it:
**[docs/development-harness.md](docs/development-harness.md)**

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL database

### Installation

```bash
# Clone the repository
git clone https://github.com/Naor-Peretz/chess-website.git
cd chess-website

# Install dependencies
pnpm install

# Set up environment variables
cp apps/backend/.env.example apps/backend/.env
# Edit .env with your database URL and OAuth credentials
```

### Development

```bash
# Start all services in development mode
pnpm dev

# Frontend runs on http://localhost:3000
# Backend runs on http://localhost:3001
```

### Building

```bash
# Build all packages
pnpm build

# Run linting
pnpm lint

# Format code
pnpm format
```

### Testing

```bash
# Run all tests
pnpm test

# Run backend tests only
cd apps/backend && pnpm test
```

## Contributing

1. Create a feature branch from `main` — `main` is protected and takes PRs only
2. Make your changes
3. Run `pnpm lint`, `pnpm test` and `pnpm format`
4. For frontend changes, exercise the affected pages in a browser first
5. Open a pull request

CI runs quality, build/test, security and e2e in parallel, plus CodeQL. See the
[Development Harness guide](docs/development-harness.md#cicd) for what blocks a
merge and what only reports.

## License

MIT
