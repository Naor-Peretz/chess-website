---
name: frontend-dev-guidelines
description: |
  Frontend development guidelines for the chess-website Next.js App Router + TailwindCSS frontend. Use when creating components, pages, features, fetching data, styling, routing, or working with frontend code. Covers component structure, data fetching via apiClient/TanStack Query, App Router conventions, Tailwind styling, accessibility, TypeScript, and performance.
---

# Frontend Development Guidelines

Guidance for `apps/frontend` — a **Next.js 16 App Router** app in TypeScript, styled with **TailwindCSS v4**. The authoritative stack, routes, and conventions live in the repo `CLAUDE.md`; the visual/design system lives in `dev/design-guidelines.md`. This skill covers the day-to-day patterns; verify specifics against the real code before relying on them.

## When to use

Creating or editing components/pages, fetching data, styling, routing, accessibility, or performance work in `apps/frontend`.

## Stack (what's actually here)

| Concern       | This project                                                                                                                                                  | NOT used                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Framework     | Next.js 16 **App Router** (`src/app/`)                                                                                                                        | Vite, React Router, TanStack Router                         |
| Styling       | **TailwindCSS v4** utility classes + `dark:` variants                                                                                                         | MUI, styled-components, emotion                             |
| Components    | `export function Component(props: Props)`                                                                                                                     | `React.FC`, default-export convention                       |
| Data fetching | `apiClient` service objects (`src/lib/*Api.ts`) via `useEffect`/`useState` today; **TanStack Query** (`src/lib/queryClient.ts`) is endorsed for new data code | `useSuspenseQuery`/Suspense-first                           |
| Board         | `react-chessboard` v5 (`options` prop), sized via `useBoardSize()`                                                                                            | —                                                           |
| Auth state    | `useAuth()` from `src/contexts/AuthContext.tsx`                                                                                                               | —                                                           |
| Feedback      | inline error state + `useAriaLiveAnnouncer` (SR announcements)                                                                                                | react-toastify, MUI Snackbar — there is **no toast system** |
| Path alias    | `@/` → `src/`; shared types from `@chess-website/shared`                                                                                                      | `~types`/`~components`/`~features`                          |

## Creating a component

- Add `'use client'` at the top when the component uses hooks/state/effects (most interactive components here are client components).
- Plain function component with a props interface: `export function GameInfo({ ... }: GameInfoProps)`.
- Style with Tailwind `className`; support dark mode with `dark:` variants (e.g. `bg-white/60 dark:bg-zinc-900/40`). Use `emerald-700` for interactive elements to meet the ≥4.5:1 WCAG contrast bar.
- `useCallback` for handlers passed to children; `useMemo`/`React.memo` for genuinely expensive work (see `resources/performance.md`).
- Route-local components live beside their page in `src/app/<route>/components/` (see `src/app/game/[id]/components/`); truly shared ones in `src/components/`.

## Data fetching

- Call backend through the `apiClient` (`src/lib/apiClient.ts`, base URL `/api/proxy`) using service objects like `gameApi`/`statsApi` (`src/lib/*Api.ts`).
- **Responses are wrapped** `{ success, data }` — unwrap with `response.data.data` (see `CLAUDE.md` → API Response Pattern).
- Today most pages fetch in `useEffect` with `isLoading`/`error` state. For new data code prefer TanStack Query (`useQuery`/`useMutation` with the configured `queryClient`); after a mutation, `invalidateQueries` the affected keys.

## Routing (App Router)

- Pages are `src/app/<route>/page.tsx`; add `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` as needed. Dynamic segments use folders like `game/[id]/`.
- Navigate with `<Link href>` (`next/link`) and `useRouter().push()` / `useParams()` from `next/navigation`.
- Error boundaries are `error.tsx` files that call `Sentry.captureException(error, { tags: { boundary: '...' } })` — see `src/app/error.tsx`, `global-error.tsx`, `game/[id]/error.tsx`, `history/error.tsx`.

## Loading, errors & accessibility

- Loading: local `isLoading` state with conditional rendering, and/or a route `loading.tsx`. Reserve layout space / use skeletons to avoid layout shift.
- Errors: inline error state rendered in-page, plus `error.tsx` route boundaries (Sentry).
- Screen-reader feedback for moves/status goes through `useAriaLiveAnnouncer` (`src/hooks/useAriaLiveAnnouncer.tsx`). The app targets **WCAG 2.1 AA** — see the Accessibility section of `CLAUDE.md`.

## Resource files

- [resources/typescript-standards.md](resources/typescript-standards.md) — TypeScript conventions
- [resources/performance.md](resources/performance.md) — `useMemo`/`useCallback`/`React.memo`, debouncing, cleanup

## Related skills

- **backend-dev-guidelines** — the API this frontend consumes
- **error-tracking** — Sentry error boundaries on the frontend
- **ux-advisor** / `dev/design-guidelines.md` — colors, typography, layout, responsive board sizing
