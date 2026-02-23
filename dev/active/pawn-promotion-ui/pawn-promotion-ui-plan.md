# Pawn Promotion UI - Implementation Plan

**Last Updated:** 2026-02-23 (v7.1 - addressing local plan-reviewer: revert to `<div>` dialog, visibility guard, keyboard input)

## Review Feedback Incorporated (v7.1)

**From local plan-reviewer (Feb 23):**
1. CRITICAL: Native `<dialog>` with `showModal()` moves element to top layer — breaks absolute positioning within board container. Reverted to `<div role="dialog">` with manual focus trap ✅
2. MEDIUM: Visibility change handler also needs `|| !!pendingPromotion` guard ✅
3. MEDIUM: `onKeyboardMove` bypasses promotion dialog — document behavior and handle missing promotion specifier ✅
4. MINOR: Null guard at top of `handlePromotionSelect` for defensive coding ✅
5. MINOR: Document clock-timeout-during-promotion edge case ✅

**From Sonnet V6 review (Feb 23) — Blocking issues:**
1. Timeout race condition: guard timeout effect with `|| !!pendingPromotion` ✅
2. `onSquareClick` is guard-only — no duplicate promotion detection, `onDrop` handles it ✅
3. ~~Use native `<dialog>`~~ → Reverted: `<div role="dialog">` with manual focus trap (see v7.1 item #1) ✅

**From Sonnet V6 review — Secondary items:**
4. `useCallback` with correct deps for `handlePromotionSelect`/`handlePromotionCancel`; `pendingPromotion` in `onDrop` deps ✅
5. Explicit text color on Unicode symbols: `text-zinc-900 dark:text-zinc-100` ✅
6. State update ordering: `setPendingPromotion(null)` before `setIsMoving(true)` ✅
7. Document white-only promotion assumption (player always plays white, engine handles black) ✅

**From Opus (Feb 16):**
1. react-chessboard v5 has NO built-in promotion dialog → must build custom ✅
2. Simplify state → use `pendingPromotion` + existing `isMoving` (NOT full state machine) ✅
3. Cancel = just clear `pendingPromotion` (no chess.undo chain needed since move not committed) ✅
4. Clock continues running during promotion (keep it simple, realistic chess) ✅
5. Use Unicode chess symbols (♛♜♝♞) — no dependency on react-chessboard internals ✅

**From Sonnet (Feb 16):**
1. User-facing error messages must be generic (Sentry gets full context) ✅
2. useEffect cleanup for scroll lock on mobile ✅
3. Piece selection is from 4 hardcoded buttons — TypeScript `'q'|'r'|'b'|'n'` type constrains at compile time, no runtime Zod needed (backend already validates via shared schema) ✅

## Executive Summary

Add an interactive pawn promotion dialog that lets users choose which piece to promote to (Queen, Rook, Bishop, Knight) instead of auto-promoting to Queen. Must be fully accessible (WCAG 2.1 AA).

## Context

- Promotion detection exists in `apps/frontend/src/app/game/[id]/page.tsx`
- Currently auto-promotes to Queen (`promotion: 'q'`)
- Backend already validates promotion via `z.enum(['q','r','b','n']).optional()` in shared package
- No promotion UI component exists
- **Player always plays white** — engine handles black promotions automatically without UI

## Files to Modify

| File | Action |
|------|--------|
| `apps/frontend/src/app/game/[id]/components/PromotionDialog.tsx` | **CREATE** - New promotion piece picker component |
| `apps/frontend/src/app/game/[id]/components/index.ts` | **EDIT** - Add PromotionDialog export |
| `apps/frontend/src/app/game/[id]/page.tsx` | **EDIT** - Add pendingPromotion state, modify onDrop/onSquareClick, render dialog |

No backend changes needed.

## Step 1: Create PromotionDialog Component

**File:** `apps/frontend/src/app/game/[id]/components/PromotionDialog.tsx`

A positioned overlay that shows 4 piece buttons (Queen, Rook, Bishop, Knight) when a pawn reaches the last rank.

**Props:**
```typescript
interface PendingPromotion {
  from: string;
  to: string;
}

interface PromotionDialogProps {
  pending: PendingPromotion;
  boardSize: number;
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onCancel: () => void;
}
```

**Piece rendering:** Use chess Unicode symbols: ♛ (Queen), ♜ (Rook), ♝ (Bishop), ♞ (Knight). Large font size scaled to square size. **Explicit text color** `text-zinc-900 dark:text-zinc-100` on buttons to ensure contrast (Sonnet: iOS Safari can drop Unicode symbols below 4.5:1 without explicit color).

**Positioning:**
- Absolute positioning within the board container (same pattern as `EngineThinkingOverlay`)
- Column aligned to the target file: `left = fileIndex * squareSize` where `fileIndex = to.charCodeAt(0) - 97`
- Drops down from top of board (rank 8 promotion for white)
- Each button is `squareSize x squareSize` (naturally >= 44px touch target for all board sizes)
- **White-only assumption:** Positioning formula assumes white-at-bottom orientation. Player always plays white in this app; engine handles black promotions without UI.

**Layout:** Vertical column of 4 piece buttons + semi-transparent backdrop over the board

**Element type: `<div role="dialog">` with manual focus management**

Why NOT native `<dialog>`: `showModal()` moves the element to the browser's "top layer", rendering it relative to the viewport — NOT relative to its DOM parent. This breaks the absolute positioning within the board container that is essential for the chess-standard "column over the promotion square" UX. `show()` (non-modal) avoids the top layer but loses focus trapping, Escape, and `::backdrop` — offering no advantage over a `<div>`.

The `<div role="dialog">` approach with manual focus management is correct for this use case:
- `role="dialog"` + `aria-modal="true"` is valid ARIA on any element
- Manual focus trap via Tab key interception (4 buttons only — simple cycle)
- Manual Escape key handler calls `onCancel`
- `aria-hidden="true"` on the board content behind the dialog while open (prevents SR from reading board squares)
- axe-core does NOT flag `role="dialog"` with `aria-modal="true"` on a `<div>` as a violation

**Accessibility (WCAG 2.1 AA):**
- `role="dialog"`, `aria-modal="true"`, `aria-label="Choose promotion piece"`
- Each button: `aria-label="Promote to queen"` etc.
- Auto-focus Queen button on mount (useRef + useEffect)
- Arrow key navigation between pieces (up/down cycle)
- Enter/Space selects, Escape cancels
- Focus trap: Tab wraps within the 4 buttons (manual onKeyDown handler)
- Backdrop click cancels (via backdrop `<button>` with `tabIndex={-1}`)

**Styling:**
- Buttons: `bg-white dark:bg-zinc-800`, `text-zinc-900 dark:text-zinc-100`, emerald hover highlight
- Backdrop: `bg-black/30` over the board area (same as EngineThinkingOverlay)
- `prefers-reduced-motion`: skip fade-in animation via `motion-safe:` utilities

**Scroll lock (Sonnet feedback):**
```typescript
useEffect(() => {
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => { document.body.style.overflow = prev; };
}, []);
```

## Step 2: Update index.ts

Add `export { PromotionDialog } from './PromotionDialog';` and export the `PendingPromotion` type.

## Step 3: Modify page.tsx

### 3a. Add state
```typescript
const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
```

### 3b. Modify onDrop

When a promotion is detected, instead of auto-promoting to queen:
1. Validate the move is legal (using testChess with promotion='q' just for legality check)
2. Set `pendingPromotion = { from, to }`
3. Return `false` — piece snaps back to source square (no optimistic update yet)

**Dep array:** Add `pendingPromotion` to `onDrop`'s dependency array (Sonnet item #4).

### 3c. Modify onSquareClick — Guard only (Sonnet blocking item #2)

**No independent promotion detection.** `onSquareClick` already delegates to `onDrop`, which handles the promotion interception. Changes are guard-only:
- Add `if (pendingPromotion) return;` at the top
- That's it — `onDrop` handles all promotion detection for both drag-and-drop and click-to-move paths

### 3d. Add handlePromotionSelect callback (wrapped in useCallback — Sonnet item #4)

When user selects a piece from the dialog:
1. **Null guard:** `if (!pendingPromotion) return;` at the top (defensive — theoretically impossible but safe)
2. **First:** `setPendingPromotion(null)` (closes dialog — Sonnet item #6: clear before setIsMoving)
3. **Then:** `setIsMoving(true)` (blocks board interaction)
4. Validate move with chosen piece via testChess
5. Optimistic update (same pattern as existing onDrop)
6. API call with chosen promotion piece
7. Announce via aria-live: "Pawn promoted to queen" etc.
8. Error handling: generic user messages, full context to Sentry (Sonnet feedback)

**useCallback deps:** `[pendingPromotion, game, chess, announceMove]` (Sonnet item #4)

### 3e. Add handlePromotionCancel callback (wrapped in useCallback — Sonnet item #4)

Just `setPendingPromotion(null)`. Board reverts to `game.currentFen` automatically since no optimistic update was applied.

**useCallback deps:** `[]` (no deps needed — only clears state)

### 3f. Add guards

- `allowDragging`: add `&& !pendingPromotion`
- `onSquareClick`: add `if (pendingPromotion) return;` guard (this is the ONLY change to onSquareClick — see 3c)
- `onDrop`: add `pendingPromotion` to the early return guard
- **Timeout effect guard (Sonnet blocking item #1):** Add `|| !!pendingPromotion` to the timeout detection effect's early return:
  ```typescript
  if (!game || game.isGameOver || isMoving || !!pendingPromotion) return;
  ```
  This prevents `fetchGame()` from firing while the promotion dialog is open, which would cause `GameOverModal` and `PromotionDialog` to render simultaneously.
- **Visibility change handler guard:** Add `|| !!pendingPromotion` to the visibility change handler:
  ```typescript
  if (document.visibilityState === 'visible' && game && !game.isGameOver && !pendingPromotion) {
    fetchGame();
  }
  ```
  Prevents tab-switch-back from triggering a refetch that could disrupt the promotion dialog.

### 3g. Keyboard move promotion handling

`onKeyboardMove` in `KeyboardMoveInput` handles promotion moves independently (users type SAN like `e8=Q` or coordinate like `e7e8q`). This is intentional:
- Keyboard input **with explicit promotion piece** (e.g., `e8=Q`, `e7e8n`): proceeds directly without dialog — the user already specified their choice
- Keyboard input **without promotion piece** on a promotion move (e.g., just `e8`): chess.js will reject the move as ambiguous. The existing error handling in `onKeyboardMove` shows "Invalid move" — no change needed
- This is consistent with the keyboard-input paradigm where users type complete move notation

### 3h. Render PromotionDialog

Inside the board container div, after the Chessboard and alongside EngineThinkingOverlay:
```tsx
{pendingPromotion && (
  <PromotionDialog
    pending={pendingPromotion}
    boardSize={boardSize}
    onSelect={handlePromotionSelect}
    onCancel={handlePromotionCancel}
  />
)}
```

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Simple `pendingPromotion` state | Opus: no full state machine needed, just one new state var |
| Clock during promotion | Keeps running | Realistic chess behavior, simpler (no extra state) |
| Cancel behavior | Clear pendingPromotion | No chess.undo chain needed — move not committed until selection |
| onDrop return for promotion | `return false` | Piece snaps back to source; no optimistic board update until selection |
| Piece images | Unicode symbols ♛♜♝♞ | No dependency on react-chessboard internals (Opus recommendation) |
| Dialog element | `<div role="dialog">` with manual focus trap | Native `<dialog>` with `showModal()` moves to top layer, breaking absolute positioning within board container. `<div>` with manual focus management is correct for in-board overlays. |
| Dialog position | Absolute within board container | Same pattern as EngineThinkingOverlay |
| Input validation | TypeScript type + backend Zod | Piece selection is from 4 hardcoded buttons with `'q'\|'r'\|'b'\|'n'` type; backend validates via shared schema |
| Error messages | Generic to user, detailed to Sentry | Sonnet: never expose userId, FEN, version in user-facing messages |
| onSquareClick changes | Guard-only | Sonnet: no duplicate promotion detection — onDrop handles it for both paths |
| Text color on symbols | Explicit `text-zinc-900 dark:text-zinc-100` | Sonnet: iOS Safari contrast for Unicode symbols |
| State update order | `setPendingPromotion(null)` before `setIsMoving(true)` | Sonnet: avoid brief simultaneous render of both overlays |
| Board orientation | White-at-bottom only | Player always plays white; engine handles black promotions without UI |
| Keyboard promotion | No dialog — users type complete notation | Keyboard input includes piece specifier (e.g., `e8=Q`); chess.js rejects ambiguous moves |

## Verification

1. `pnpm build` — verify no build errors
2. `pnpm lint` — verify no lint errors
3. `cd apps/backend && pnpm test` — verify no test regressions
4. `cd apps/frontend && npx playwright test accessibility.spec.ts` — verify axe-core passes
5. **Playwright UI testing:**
   - Start `pnpm dev`
   - Navigate to localhost:3000, sign in
   - Create new game (difficulty 1)
   - Advance a pawn to promotion rank
   - Verify dialog appears with 4 piece options
   - Test each piece selection → correct promotion on board
   - Test cancel (Escape) → pawn returns
   - Test keyboard navigation (arrows, Enter, Escape)
   - Test dark mode appearance
   - Test mobile viewport

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dialog positioning on small screens | Medium | Medium | Each button = squareSize (naturally >= 44px) |
| react-chessboard overlay conflicts | Low | Medium | Absolute positioning inside board container, z-10 |
| Click-to-move promotion detection | Low | Low | Guard-only in onSquareClick, onDrop handles detection |
| Race condition with engine response | Low | High | Board disabled + isMoving blocks interaction |
| Clock timeout during promotion | Low | High | Timeout + visibility effects guarded with `!!pendingPromotion` |
| API failure during promotion | Medium | High | Generic error message + Sentry tracking |
| Screen reader focus escape | Low | Medium | Manual Tab trap cycles through 4 buttons; `aria-modal` + `aria-hidden` on background |
| Clock reaches zero while dialog open | Low | Medium | Backend is source of truth for timeout; API call fails gracefully. Display shows 0:00 but no user-facing timeout indicator while dialog is open — acceptable since backend enforces. |

## Ignored Low-Priority Items

- Analytics tracking for promotion choices (future enhancement)
- Number key shortcuts (1-4) for power users (future enhancement)
- AbortController for timeout during API call (existing timeout detection handles this adequately)
- Zod validation on frontend (TypeScript types + backend Zod schema provide sufficient protection)
- State machine refactor (simple pendingPromotion + isMoving is sufficient)
- Black piece promotion UI (player always plays white; engine auto-promotes)
- axe-core e2e test for game page with promotion dialog open (requires mocked game state — future enhancement)
