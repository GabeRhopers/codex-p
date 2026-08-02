import { expect, test } from '@playwright/test';

/**
 * The baseline flow every other mode builds on: two humans pick starter
 * decks and pass the device back and forth. Real regressions here (the
 * memoized-Client remount bug, the stale-selection bug, the perspective
 * flip) have all previously slipped past unit tests since they only show
 * up once boardgame.io's actual React Client is mounted in a browser.
 */
test('two players pick starter decks, make a real move, and the turn/perspective flips each turn', async ({ page }) => {
  await page.goto('/');

  await page.locator('.screen-title').waitFor();
  await page.getByRole('button', { name: 'Play Hotseat (2 Players)' }).click();

  await expect(page.locator('.screen-note')).toContainText('Player 1, pick a deck.');
  await page.getByRole('button', { name: /Vanguard's Alliance/ }).click();

  await expect(page.locator('.screen-note')).toContainText('Player 2, pick a deck.');
  await expect(page.locator('.screen-note')).toContainText("Facing: Vanguard's Alliance.");
  await page.getByRole('button', { name: /Warden's Alliance/ }).click();

  await expect(page.locator('.board')).toBeVisible();
  await expect(page.locator('.score')).toContainText("Vanguard's Alliance: 0 / 5");
  await expect(page.locator('.score')).toContainText("Warden's Alliance: 0 / 5");
  await expect(page.locator('.turn-info')).toContainText('Turn 1');
  await expect(page.locator('.turn-info')).toContainText('opening turn: no attacks yet');
  // Player 1 (Vanguard's Alliance) always starts, and "you" starts pinned
  // to whoever's turn it is in hotseat mode.
  await expect(page.locator('.arena-label-you .label-full')).toHaveText("Vanguard's Alliance");

  // A real move through the real UI, not a direct engine call: select a
  // card, see its legal actions, and act on one.
  await page.locator('[data-side="you"][data-lane="0"]').click();
  const actionPanel = page.locator('.action-panel');
  await expect(actionPanel).toBeVisible();
  await expect(actionPanel).toContainText('choose an action');
  await page.getByRole('button', { name: 'Enter Defense Mode' }).click();
  await expect(actionPanel).not.toBeVisible();

  await page.getByRole('button', { name: 'End Turn' }).click();

  // Turn advances and the "you" row flips to whoever's turn it now is —
  // hotseat's defining behavior, distinct from solo mode's pinned view.
  await expect(page.locator('.turn-info')).toContainText('Turn 2');
  await expect(page.locator('.arena-label-you .label-full')).toHaveText("Warden's Alliance");

  // The card that entered Defense Mode last turn should still show the
  // flag now that we're looking at the board from the other side.
  await expect(page.locator('[data-side="opponent"][data-lane="0"]')).toContainText('Defending');
});

test('How to Play opens mid-match without disturbing the game underneath it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play Hotseat (2 Players)' }).click();
  await page.getByRole('button', { name: /Vanguard's Alliance/ }).click();
  await page.getByRole('button', { name: /Warden's Alliance/ }).click();
  await expect(page.locator('.board')).toBeVisible();

  const turnInfoBefore = await page.locator('.turn-info').innerText();

  await page.getByRole('button', { name: 'How to Play' }).click();
  await expect(page.locator('.guide-panel')).toBeVisible();
  await expect(page.locator('.guide-title')).toHaveText('How to Play');

  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('.guide-panel')).not.toBeVisible();

  // Closing the guide must land back on the same match state, not reset it.
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.locator('.turn-info')).toHaveText(turnInfoBefore);
});
