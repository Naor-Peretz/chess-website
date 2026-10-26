---
paths:
  - apps/frontend/**
---

# Frontend rules

Next.js 16 App Router, React 19, Tailwind v4, TanStack Query.

**Data access.** Components call the helpers in `src/lib/gameApi.ts` and
`src/lib/authApi.ts`, which go through `src/lib/apiClient.ts` (Axios, base URL
`/api/proxy`). Do not call the backend origin directly — the BFF routes under
`src/app/api/` exist so the auth cookie stays first-party.

**Response shape.** The backend wraps everything, so it is
`response.data.data.user`, not `response.data.user`. Getting this wrong produces
`undefined` rather than a type error.

**CSRF.** Mutating requests need the `X-CSRF-Token` header read from the
`csrf_token` cookie. `apiClient`'s request interceptor does this; hand-rolled
fetches do not.

**Auth state** comes from `useAuth()` (`src/contexts/AuthContext.tsx`).

**Purity.** `Date.now()` and other impure calls in a render body trip
`react-hooks/purity` under the React compiler. Put them in `useEffect` or an
event handler.

**Accessibility is a CI gate.** `e2e/accessibility.spec.ts` runs axe-core over
every page and blocks the PR on a new violation. New interactive markup needs an
accessible name, keyboard operability, and a visible focus state. Announce
dynamic changes through `useAriaLiveAnnouncer`. Interactive colours use
`emerald-700` or darker to hold the 4.5:1 contrast ratio.

**Board sizing** comes from the `useBoardSize` hook, not ad-hoc breakpoints.

**Before pushing**, exercise the changed pages with the Playwright browser tools:
start `pnpm dev`, load the page, interact with what changed, confirm it behaves.
The `playwright-test-guard` hook blocks the push otherwise.
