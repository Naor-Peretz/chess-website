import { useEffect, useRef } from 'react';
import type { GameResponse } from '@chess-website/shared';
import { determineGameOverSoundType } from '@/lib/soundUtils';
import type { SoundType } from '@/lib/soundUtils';

const LOW_TIME_THRESHOLD = 10_000; // 10 seconds
const WARNING_COOLDOWN = 5_000; // 5 seconds between warnings

/**
 * Handles game-over sound and low-time warning sound.
 * Extracted from page.tsx to manage complexity (5 refs + 2 useEffects).
 */
export function useGameSounds(
  game: GameResponse | null,
  displayTimeUser: number,
  playRef: React.RefObject<(type: SoundType) => void>
): void {
  // --- Game-over sound refs ---
  // One-time snapshot: was the game already over when we first loaded it?
  // Must NOT reset on StrictMode cleanup (it's a one-time snapshot)
  const wasGameOverOnLoad = useRef<boolean | null>(null);
  const hasSetInitialGameOver = useRef(false);

  // --- Low-time warning refs ---
  const hasPlayedWarning = useRef(false);
  const lastWarningTime = useRef(0);
  const hasReceivedInitialTime = useRef(false);

  // Game-over sound useEffect
  useEffect(() => {
    if (!game) return;

    // Initialize wasGameOverOnLoad on first non-null game
    if (!hasSetInitialGameOver.current) {
      wasGameOverOnLoad.current = game.isGameOver;
      hasSetInitialGameOver.current = true;
    }

    // Play game-over sound only if:
    // 1. We've initialized the ref
    // 2. Game was NOT over when we loaded
    // 3. Game is now over
    // 4. Result is available
    if (
      hasSetInitialGameOver.current &&
      wasGameOverOnLoad.current === false &&
      game.isGameOver &&
      game.result
    ) {
      playRef.current(determineGameOverSoundType(game.result));
      // Prevent replaying on subsequent renders
      wasGameOverOnLoad.current = true;
    }
  }, [game?.isGameOver, game?.result, game, playRef]);

  // Low-time warning useEffect
  useEffect(() => {
    // Guard 1: No game or game over
    if (!game || game.isGameOver) return;

    // Guard 2: Untimed game
    if (game.timeControlType === 'none') return;

    // Guard 3: Uninitialized time (page.tsx initializes to 0 before fetchGame)
    if (displayTimeUser === 0) return;

    // Guard 4: First-render detection
    if (!hasReceivedInitialTime.current) {
      hasReceivedInitialTime.current = true;
      // If already below threshold on first real render, arm the warning
      // (page-load guard — prevents warning on resume of low-time game)
      if (displayTimeUser < LOW_TIME_THRESHOLD) {
        hasPlayedWarning.current = true;
        lastWarningTime.current = Date.now();
      }
      return;
    }

    // Guard 5: Above threshold — reset warning for increment games
    if (displayTimeUser >= LOW_TIME_THRESHOLD) {
      hasPlayedWarning.current = false;
      return;
    }

    // Threshold crossed — play warning if not already played and cooldown elapsed
    if (!hasPlayedWarning.current) {
      const now = Date.now();
      if (now - lastWarningTime.current >= WARNING_COOLDOWN) {
        playRef.current('lowTimeWarning');
        hasPlayedWarning.current = true;
        lastWarningTime.current = now;
      }
    }
  }, [game, displayTimeUser, playRef]);
}
