import { expect, test } from '@playwright/test';

/**
 * Sound itself (src/ui/sound.ts) is synthesized via the Web Audio API with
 * no external assets — nothing to fetch or license-check, so there's no
 * asset-loading path to test. What's worth locking in here is the mute
 * toggle's UI contract and persistence, and that a real match's attack/
 * defend/destroy/win events (src/ui/Board.tsx's diffing effect) don't throw
 * — already covered incidentally by every other E2E spec playing real
 * matches with sound wired in, verified with zero console errors.
 */
test('the sound toggle flips label/state and persists across a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play Hotseat (2 Players)' }).click();
  await page.getByRole('button', { name: /Vanguard's Alliance/ }).click();
  await page.getByRole('button', { name: /Warden's Alliance/ }).click();
  await page.waitForSelector('.board');

  const soundBtn = page.getByRole('button', { name: /Mute sound|Unmute sound/ });
  await expect(soundBtn).toHaveAttribute('aria-label', 'Mute sound'); // starts unmuted
  await expect(soundBtn).toHaveAttribute('aria-pressed', 'false');

  await soundBtn.click();
  await expect(soundBtn).toHaveAttribute('aria-label', 'Unmute sound');
  await expect(soundBtn).toHaveAttribute('aria-pressed', 'true');

  // Reloading mid-match restarts the whole app (there's no session resume
  // in this project), so this only re-checks the Home screen — the mute
  // preference itself lives in localStorage, independent of match state.
  await page.reload();
  await expect(page.locator('.screen-title')).toBeVisible();
  await page.getByRole('button', { name: 'Play Hotseat (2 Players)' }).click();
  await page.getByRole('button', { name: /Vanguard's Alliance/ }).click();
  await page.getByRole('button', { name: /Warden's Alliance/ }).click();
  await page.waitForSelector('.board');

  await expect(page.getByRole('button', { name: /Mute sound|Unmute sound/ })).toHaveAttribute(
    'aria-label',
    'Unmute sound',
  );
});
