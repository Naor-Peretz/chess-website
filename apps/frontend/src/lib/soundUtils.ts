import type { Move } from 'chess.js';
import type { GameResult } from '@chess-website/shared';

export type SoundType =
  | 'move'
  | 'capture'
  | 'check'
  | 'castling'
  | 'promotion'
  | 'gameOverWin'
  | 'gameOverLoss'
  | 'gameOverDraw'
  | 'lowTimeWarning';

export const SOUND_FILES: Record<SoundType, string> = {
  move: '/sounds/move.mp3',
  capture: '/sounds/capture.mp3',
  check: '/sounds/check.mp3',
  castling: '/sounds/castling.mp3',
  promotion: '/sounds/promotion.mp3',
  gameOverWin: '/sounds/game-over-win.mp3',
  gameOverLoss: '/sounds/game-over-loss.mp3',
  gameOverDraw: '/sounds/game-over-draw.mp3',
  lowTimeWarning: '/sounds/low-time-warning.mp3',
};

export const SOUND_STORAGE_KEYS = {
  volume: 'chessSound.volume',
  muted: 'chessSound.muted',
} as const;

/**
 * Determine which sound to play for a chess move.
 * Priority: check > promotion > capture > castling > move
 */
export function determineSoundType(moveResult: Move, isInCheck: boolean): SoundType {
  if (isInCheck) return 'check';
  if (moveResult.flags.includes('p')) return 'promotion';
  if (moveResult.captured) return 'capture';
  if (moveResult.flags.includes('k') || moveResult.flags.includes('q')) return 'castling';
  return 'move';
}

/**
 * Determine which sound to play for a game-over event.
 * Uses exhaustive Record for compile-time safety.
 */
const GAME_OVER_SOUND_MAP: Record<GameResult, SoundType> = {
  user_win_checkmate: 'gameOverWin',
  user_win_timeout: 'gameOverWin',
  engine_win_checkmate: 'gameOverLoss',
  engine_win_timeout: 'gameOverLoss',
  user_resigned: 'gameOverLoss',
  draw_stalemate: 'gameOverDraw',
  draw_repetition: 'gameOverDraw',
  draw_fifty_moves: 'gameOverDraw',
  draw_insufficient_material: 'gameOverDraw',
} satisfies Record<GameResult, SoundType>;

export function determineGameOverSoundType(result: GameResult): SoundType {
  return GAME_OVER_SOUND_MAP[result];
}
