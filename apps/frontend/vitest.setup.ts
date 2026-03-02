import '@testing-library/jest-dom/vitest';

// Mock HTMLAudioElement - jsdom doesn't implement Audio constructor
class MockAudioElement {
  src = '';
  preload = '';
  volume = 1;
  muted = false;
  currentTime = 0;
  paused = true;
  private listeners: Record<string, Array<() => void>> = {};
  onerror: ((event: Event) => void) | null = null;

  play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }

  addEventListener(event: string, handler: () => void): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  removeEventListener(event: string, handler: () => void): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((h) => h !== handler);
    }
  }

  load(): void {
    // no-op
  }
}

// @ts-expect-error - Mock Audio constructor for tests
globalThis.Audio = MockAudioElement;
