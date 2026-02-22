import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSound } from '../useSound';

// Track created Audio instances
let audioInstances: Array<{
  src: string;
  volume: number;
  muted: boolean;
  preload: string;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  currentTime: number;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  onerror: ((e: Event) => void) | null;
  load: ReturnType<typeof vi.fn>;
}>;

beforeEach(() => {
  audioInstances = [];
  // Mock Audio constructor - must use function keyword for `new` support
  // @ts-expect-error - Mock Audio constructor
  globalThis.Audio = vi.fn(function MockAudio() {
    const instance = {
      src: '',
      volume: 1,
      muted: false,
      preload: '',
      currentTime: 0,
      paused: true,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onerror: null,
      load: vi.fn(),
    };
    audioInstances.push(instance);
    return instance;
  });

  // Mock localStorage
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  });

  // Mock document.visibilityState
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useSound', () => {
  it('creates 9 audio elements on mount (one per sound type)', () => {
    renderHook(() => useSound());
    // 9 sound types = 9 Audio instances
    expect(audioInstances.length).toBe(9);
  });

  it('sets preload="auto" on all audio elements', () => {
    renderHook(() => useSound());
    audioInstances.forEach((audio) => {
      expect(audio.preload).toBe('auto');
    });
  });

  it('sets correct src paths for each sound', () => {
    renderHook(() => useSound());
    const srcs = audioInstances.map((a) => a.src);
    expect(srcs).toContain('/sounds/move.mp3');
    expect(srcs).toContain('/sounds/capture.mp3');
    expect(srcs).toContain('/sounds/check.mp3');
    expect(srcs).toContain('/sounds/castling.mp3');
    expect(srcs).toContain('/sounds/promotion.mp3');
    expect(srcs).toContain('/sounds/game-over-win.mp3');
    expect(srcs).toContain('/sounds/game-over-loss.mp3');
    expect(srcs).toContain('/sounds/game-over-draw.mp3');
    expect(srcs).toContain('/sounds/low-time-warning.mp3');
  });

  it('play() calls audio.play() on the correct element', () => {
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.play('move');
    });

    const moveAudio = audioInstances.find((a) => a.src === '/sounds/move.mp3');
    expect(moveAudio?.play).toHaveBeenCalled();
  });

  it('play() resets currentTime before playing', () => {
    const { result } = renderHook(() => useSound());

    const moveAudio = audioInstances.find((a) => a.src === '/sounds/move.mp3')!;
    moveAudio.currentTime = 0.5;

    act(() => {
      result.current.play('move');
    });

    expect(moveAudio.pause).toHaveBeenCalled();
    expect(moveAudio.currentTime).toBe(0);
    expect(moveAudio.play).toHaveBeenCalled();
  });

  it('setVolume() updates volume on all audio elements', () => {
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.setVolume(50);
    });

    audioInstances.forEach((audio) => {
      expect(audio.volume).toBe(0.5);
    });
    expect(result.current.volume).toBe(50);
  });

  it('toggleMute() toggles muted state', () => {
    const { result } = renderHook(() => useSound());

    expect(result.current.isMuted).toBe(false);

    act(() => {
      result.current.toggleMute();
    });

    expect(result.current.isMuted).toBe(true);

    act(() => {
      result.current.toggleMute();
    });

    expect(result.current.isMuted).toBe(false);
  });

  it('persists volume to localStorage', () => {
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.setVolume(30);
    });

    expect(localStorage.setItem).toHaveBeenCalledWith('chessSound.volume', '30');
  });

  it('persists muted state to localStorage', () => {
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.toggleMute();
    });

    expect(localStorage.setItem).toHaveBeenCalledWith('chessSound.muted', 'true');
  });

  it('restores volume from localStorage', () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      if (key === 'chessSound.volume') return '40';
      if (key === 'chessSound.muted') return 'false';
      return null;
    });

    const { result } = renderHook(() => useSound());
    expect(result.current.volume).toBe(40);
  });

  it('restores muted state from localStorage', () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      if (key === 'chessSound.muted') return 'true';
      return null;
    });

    const { result } = renderHook(() => useSound());
    expect(result.current.isMuted).toBe(true);
  });

  it('does not play when muted', () => {
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.toggleMute();
    });

    act(() => {
      result.current.play('move');
    });

    const moveAudio = audioInstances.find((a) => a.src === '/sounds/move.mp3');
    expect(moveAudio?.play).not.toHaveBeenCalled();
  });

  it('does not play when tab is hidden', () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.play('move');
    });

    const moveAudio = audioInstances.find((a) => a.src === '/sounds/move.mp3');
    expect(moveAudio?.play).not.toHaveBeenCalled();
  });

  it('exposes playRef as a stable ref', () => {
    const { result, rerender } = renderHook(() => useSound());

    const ref1 = result.current.playRef;
    rerender();
    const ref2 = result.current.playRef;

    expect(ref1).toBe(ref2); // Same ref object
  });

  it('playRef.current calls play()', () => {
    const { result } = renderHook(() => useSound());

    act(() => {
      result.current.playRef.current('capture');
    });

    const captureAudio = audioInstances.find((a) => a.src === '/sounds/capture.mp3');
    expect(captureAudio?.play).toHaveBeenCalled();
  });

  it('cleans up audio elements on unmount', () => {
    const { unmount } = renderHook(() => useSound());

    unmount();

    audioInstances.forEach((audio) => {
      expect(audio.pause).toHaveBeenCalled();
    });
  });

  it('handles localStorage errors gracefully', () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('localStorage is not available');
    });

    // Should not throw
    const { result } = renderHook(() => useSound());
    expect(result.current.volume).toBe(70); // default
    expect(result.current.isMuted).toBe(false); // default
  });
});
