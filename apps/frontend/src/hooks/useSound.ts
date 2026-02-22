import { useState, useEffect, useRef, useCallback } from 'react';
import { SoundType, SOUND_FILES, SOUND_STORAGE_KEYS } from '@/lib/soundUtils';

const DEFAULT_VOLUME = 70;
const DEFAULT_MUTED = false;

/** Read a value from localStorage, returning defaultValue on any error */
function readStorage<T>(key: string, defaultValue: T, parse: (v: string) => T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    return parse(stored);
  } catch {
    return defaultValue;
  }
}

/** Write a value to localStorage, silently failing on error */
function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Fail silently (Safari private mode, quota exceeded, etc.)
  }
}

export interface UseSoundReturn {
  play: (type: SoundType) => void;
  playRef: React.RefObject<(type: SoundType) => void>;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  volume: number;
  isMuted: boolean;
}

export function useSound(): UseSoundReturn {
  const [volume, setVolumeState] = useState<number>(() =>
    readStorage(SOUND_STORAGE_KEYS.volume, DEFAULT_VOLUME, Number)
  );
  const [isMuted, setIsMuted] = useState<boolean>(() =>
    readStorage(SOUND_STORAGE_KEYS.muted, DEFAULT_MUTED, (v) => v === 'true')
  );

  const audioPoolRef = useRef<Map<SoundType, HTMLAudioElement>>(new Map());
  const initializedRef = useRef(false);
  const firstInteractionRef = useRef(false);

  // Initialize audio pool
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const pool = new Map<SoundType, HTMLAudioElement>();
    const soundTypes = Object.keys(SOUND_FILES) as SoundType[];

    for (const type of soundTypes) {
      const audio = new Audio();
      audio.src = SOUND_FILES[type];
      audio.preload = 'auto';
      audio.volume = volume / 100;
      audio.muted = isMuted;
      pool.set(type, audio);
    }

    audioPoolRef.current = pool;

    return () => {
      // Cleanup: pause all, clear src, clear pool
      for (const audio of pool.values()) {
        audio.pause();
        audio.src = '';
      }
      pool.clear();
      initializedRef.current = false; // Reset for StrictMode remount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // One-time init

  // Sync volume to audio elements
  useEffect(() => {
    for (const audio of audioPoolRef.current.values()) {
      audio.volume = volume / 100;
    }
  }, [volume]);

  // Sync muted state to audio elements
  useEffect(() => {
    for (const audio of audioPoolRef.current.values()) {
      audio.muted = isMuted;
    }
  }, [isMuted]);

  // First-interaction unlock for iOS Safari
  useEffect(() => {
    if (firstInteractionRef.current) return;

    const unlock = () => {
      if (firstInteractionRef.current) return;
      firstInteractionRef.current = true;

      // Silent play on first pool element to unlock audio
      const firstAudio = audioPoolRef.current.values().next().value;
      if (firstAudio) {
        const originalVolume = firstAudio.volume;
        firstAudio.volume = 0;
        firstAudio.play().catch(() => {});
        firstAudio.volume = originalVolume;
      }

      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };

    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);

    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  const play = useCallback(
    (type: SoundType) => {
      // Don't play if muted or tab is hidden
      if (isMuted) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

      const audio = audioPoolRef.current.get(type);
      if (!audio) return;

      // Stop current playback, reset, and play
      audio.pause();
      audio.currentTime = 0;
      audio.play().catch(() => {});
    },
    [isMuted]
  );

  // Stable ref for play (avoids polluting dependency arrays)
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  }, [play]);

  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(100, newVolume));
    setVolumeState(clamped);
    writeStorage(SOUND_STORAGE_KEYS.volume, String(clamped));
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      writeStorage(SOUND_STORAGE_KEYS.muted, String(newMuted));
      return newMuted;
    });
  }, []);

  return { play, playRef, setVolume, toggleMute, volume, isMuted };
}
