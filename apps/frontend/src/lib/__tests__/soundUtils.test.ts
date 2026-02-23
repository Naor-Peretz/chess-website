import { describe, it, expect } from 'vitest';
import type { Move } from 'chess.js';
import {
  determineSoundType,
  determineGameOverSoundType,
  SoundType,
  SOUND_FILES,
} from '../soundUtils';
import type { GameResult } from '@chess-website/shared';

// Helper to create a partial Move object with required fields
function makeMove(overrides: Partial<Move> = {}): Move {
  return {
    color: 'w',
    from: 'e2',
    to: 'e4',
    piece: 'p',
    san: 'e4',
    flags: 'b', // double pawn push
    before: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    after: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    lan: 'e2e4',
    ...overrides,
  } as Move;
}

describe('determineSoundType', () => {
  it('returns "move" for a normal move', () => {
    const move = makeMove({ flags: 'n' }); // normal move
    expect(determineSoundType(move, false)).toBe('move');
  });

  it('returns "capture" for a capture move', () => {
    const move = makeMove({ flags: 'c', captured: 'p' });
    expect(determineSoundType(move, false)).toBe('capture');
  });

  it('returns "check" when in check', () => {
    const move = makeMove({ flags: 'n' });
    expect(determineSoundType(move, true)).toBe('check');
  });

  it('returns "castling" for kingside castle', () => {
    const move = makeMove({ flags: 'k' });
    expect(determineSoundType(move, false)).toBe('castling');
  });

  it('returns "castling" for queenside castle', () => {
    const move = makeMove({ flags: 'q' });
    expect(determineSoundType(move, false)).toBe('castling');
  });

  it('returns "promotion" for a promotion move', () => {
    const move = makeMove({ flags: 'p', promotion: 'q' });
    expect(determineSoundType(move, false)).toBe('promotion');
  });

  it('returns "capture" for en passant capture', () => {
    const move = makeMove({ flags: 'e', captured: 'p' });
    expect(determineSoundType(move, false)).toBe('capture');
  });

  // Priority tests
  it('check takes priority over capture', () => {
    const move = makeMove({ flags: 'c', captured: 'p' });
    expect(determineSoundType(move, true)).toBe('check');
  });

  it('check takes priority over promotion', () => {
    const move = makeMove({ flags: 'p', promotion: 'q' });
    expect(determineSoundType(move, true)).toBe('check');
  });

  it('check takes priority over castling', () => {
    // Impossible in real chess, but tests priority chain
    const move = makeMove({ flags: 'k' });
    expect(determineSoundType(move, true)).toBe('check');
  });

  it('promotion takes priority over capture (promotion + capture)', () => {
    const move = makeMove({ flags: 'cp', captured: 'r', promotion: 'q' });
    expect(determineSoundType(move, false)).toBe('promotion');
  });

  it('capture takes priority over castling (impossible but tests chain)', () => {
    const move = makeMove({ flags: 'ck', captured: 'p' });
    expect(determineSoundType(move, false)).toBe('capture');
  });

  it('handles move with big pawn flag as normal move', () => {
    const move = makeMove({ flags: 'b' }); // double pawn push
    expect(determineSoundType(move, false)).toBe('move');
  });
});

describe('determineGameOverSoundType', () => {
  const winResults: GameResult[] = ['user_win_checkmate', 'user_win_timeout'];
  const lossResults: GameResult[] = ['engine_win_checkmate', 'engine_win_timeout', 'user_resigned'];
  const drawResults: GameResult[] = [
    'draw_stalemate',
    'draw_repetition',
    'draw_fifty_moves',
    'draw_insufficient_material',
  ];

  winResults.forEach((result) => {
    it(`returns "gameOverWin" for ${result}`, () => {
      expect(determineGameOverSoundType(result)).toBe('gameOverWin');
    });
  });

  lossResults.forEach((result) => {
    it(`returns "gameOverLoss" for ${result}`, () => {
      expect(determineGameOverSoundType(result)).toBe('gameOverLoss');
    });
  });

  drawResults.forEach((result) => {
    it(`returns "gameOverDraw" for ${result}`, () => {
      expect(determineGameOverSoundType(result)).toBe('gameOverDraw');
    });
  });
});

describe('SOUND_FILES', () => {
  const allSoundTypes: SoundType[] = [
    'move',
    'capture',
    'check',
    'castling',
    'promotion',
    'gameOverWin',
    'gameOverLoss',
    'gameOverDraw',
    'lowTimeWarning',
  ];

  it('has an entry for every SoundType', () => {
    allSoundTypes.forEach((type) => {
      expect(SOUND_FILES[type]).toBeDefined();
      expect(SOUND_FILES[type]).toMatch(/^\/sounds\/.+\.mp3$/);
    });
  });
});
