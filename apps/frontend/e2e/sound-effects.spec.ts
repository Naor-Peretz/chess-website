import { test, expect } from '@playwright/test';

const MOCK_USER = {
  success: true,
  data: {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
    },
  },
};

const MOCK_GAME = {
  success: true,
  data: {
    id: 'test-game-id',
    userId: 'test-user-id',
    status: 'active',
    difficultyLevel: 3,
    timeControlType: 'blitz_5min',
    currentFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    movesHistory: [],
    timeLeftUser: 300000,
    timeLeftEngine: 300000,
    turnStartedAt: new Date().toISOString(),
    currentTurn: 'w',
    isCheck: false,
    isGameOver: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

test.describe('Sound Effects', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth and game API
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USER),
      })
    );
    await page.route('**/api/proxy/games/test-game-id', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GAME),
      })
    );
  });

  test('sound controls render on game page', async ({ page }) => {
    await page.goto('/game/test-game-id');
    await page.waitForSelector('[data-testid="sound-control"]');

    const muteButton = page.locator('[data-testid="mute-button"]');
    const volumeSlider = page.locator('[data-testid="volume-slider"]');

    await expect(muteButton).toBeVisible();
    await expect(volumeSlider).toBeVisible();
  });

  test('mute button toggles mute state', async ({ page }) => {
    await page.goto('/game/test-game-id');
    await page.waitForSelector('[data-testid="sound-control"]');

    const muteButton = page.locator('[data-testid="mute-button"]');

    // Initially unmuted
    await expect(muteButton).toHaveAttribute('aria-label', 'Mute sound');

    // Click to mute
    await muteButton.click();
    await expect(muteButton).toHaveAttribute('aria-label', 'Unmute sound');

    // Click to unmute
    await muteButton.click();
    await expect(muteButton).toHaveAttribute('aria-label', 'Mute sound');
  });

  test('volume slider is keyboard accessible', async ({ page }) => {
    await page.goto('/game/test-game-id');
    await page.waitForSelector('[data-testid="sound-control"]');

    const volumeSlider = page.locator('[data-testid="volume-slider"]');

    await expect(volumeSlider).toHaveAttribute('aria-label', 'Volume');
    await expect(volumeSlider).toHaveAttribute('min', '0');
    await expect(volumeSlider).toHaveAttribute('max', '100');
    await expect(volumeSlider).toHaveAttribute('step', '10');
  });

  test('mute state persists across page reload', async ({ page }) => {
    await page.goto('/game/test-game-id');
    await page.waitForSelector('[data-testid="sound-control"]');

    const muteButton = page.locator('[data-testid="mute-button"]');

    // Mute
    await muteButton.click();
    await expect(muteButton).toHaveAttribute('aria-label', 'Unmute sound');

    // Reload page
    await page.reload();
    await page.waitForSelector('[data-testid="sound-control"]');

    // Should still be muted
    const muteButtonAfterReload = page.locator('[data-testid="mute-button"]');
    await expect(muteButtonAfterReload).toHaveAttribute('aria-label', 'Unmute sound');
  });

  test('no CSP violations when sound controls render', async ({ page }) => {
    const cspErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('Content-Security-Policy')) {
        cspErrors.push(msg.text());
      }
    });

    await page.goto('/game/test-game-id');
    await page.waitForSelector('[data-testid="sound-control"]');

    expect(cspErrors).toHaveLength(0);
  });
});
