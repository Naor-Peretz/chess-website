'use client';

import { useEffect, useRef } from 'react';
import { useAriaLiveAnnouncer } from '@/hooks/useAriaLiveAnnouncer';

interface SoundControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

export function SoundControl({ volume, isMuted, onVolumeChange, onToggleMute }: SoundControlProps) {
  const { announce } = useAriaLiveAnnouncer();
  const isFirstRender = useRef(true);

  // Announce mute state changes (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    announce(isMuted ? 'Sound muted' : 'Sound enabled');
  }, [isMuted, announce]);

  return (
    <div data-testid="sound-control" className="flex items-center gap-2">
      <button
        data-testid="mute-button"
        onClick={onToggleMute}
        aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <SpeakerIcon volume={volume} isMuted={isMuted} />
      </button>
      <input
        data-testid="volume-slider"
        type="range"
        min="0"
        max="100"
        step="10"
        value={volume}
        onChange={(e) => onVolumeChange(Number(e.target.value))}
        aria-label="Volume"
        aria-valuetext={`${volume}%`}
        className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-zinc-200 accent-emerald-700 dark:bg-zinc-700"
      />
    </div>
  );
}

function SpeakerIcon({ volume, isMuted }: { volume: number; isMuted: boolean }) {
  if (isMuted || volume === 0) {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
      </svg>
    );
  }

  if (volume < 50) {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}
