'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

export interface PendingPromotion {
  from: string;
  to: string;
}

interface PromotionDialogProps {
  pending: PendingPromotion;
  boardSize: number;
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onCancel: () => void;
}

const PROMOTION_PIECES = [
  { piece: 'q' as const, symbol: '\u265B', label: 'Promote to queen' },
  { piece: 'r' as const, symbol: '\u265C', label: 'Promote to rook' },
  { piece: 'b' as const, symbol: '\u265D', label: 'Promote to bishop' },
  { piece: 'n' as const, symbol: '\u265E', label: 'Promote to knight' },
];

export function PromotionDialog({ pending, boardSize, onSelect, onCancel }: PromotionDialogProps) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusedIndex = useRef(0);
  const [mounted, setMounted] = useState(false);

  const squareSize = boardSize / 8;
  const fileIndex = pending.to.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, etc.

  // Auto-focus queen button on mount and trigger enter animation
  useEffect(() => {
    buttonRefs.current[0]?.focus();
    // Flip mounted state on next frame to trigger CSS transition
    requestAnimationFrame(() => setMounted(true));
  }, []);

  // No body scroll lock — dialog is a board-embedded overlay.
  // The board's overflow-hidden is sufficient; locking body scroll disrupts mobile users.

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = (focusedIndex.current + 1) % 4;
          focusedIndex.current = next;
          buttonRefs.current[next]?.focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = (focusedIndex.current - 1 + 4) % 4;
          focusedIndex.current = prev;
          buttonRefs.current[prev]?.focus();
          break;
        }
        case 'Escape':
          e.preventDefault();
          onCancel();
          break;
        case 'Tab': {
          // Focus trap: cycle through the 4 buttons only
          e.preventDefault();
          const direction = e.shiftKey ? -1 : 1;
          const nextIdx = (focusedIndex.current + direction + 4) % 4;
          focusedIndex.current = nextIdx;
          buttonRefs.current[nextIdx]?.focus();
          break;
        }
      }
    },
    [onCancel]
  );

  return (
    /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- manual focus trap on div role="dialog" requires onKeyDown */
    <div
      className="absolute inset-0 z-10"
      role="dialog"
      aria-modal="true"
      aria-label="Choose promotion piece"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop — aria-hidden div, not a button (semantically correct for non-interactive overlay) */}
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" onClick={onCancel} />

      {/* Piece buttons column, aligned to target file */}
      <div
        className={`absolute top-0 z-20 flex flex-col motion-safe:transition-all motion-safe:duration-150 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
        style={{
          left: fileIndex * squareSize,
          width: squareSize,
        }}
      >
        {PROMOTION_PIECES.map(({ piece, symbol, label }, index) => (
          <button
            key={piece}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            onClick={() => onSelect(piece)}
            onFocus={() => {
              focusedIndex.current = index;
            }}
            aria-label={label}
            className="flex items-center justify-center bg-white text-zinc-900 transition-colors hover:bg-emerald-100 focus:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-emerald-900/40 dark:focus:bg-emerald-900/40"
            style={{
              width: squareSize,
              height: squareSize,
              fontSize: squareSize * 0.65,
              lineHeight: 1,
            }}
          >
            {symbol}
          </button>
        ))}
      </div>
    </div>
  );
}
