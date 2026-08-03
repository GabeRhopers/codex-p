import { expect, test } from '@playwright/test';

/**
 * Solo-vs-bot is the one mode where "you" must NOT flip with
 * ctx.currentPlayer (see Board.tsx's humanPlayerID prop) — every assertion
 * here about the your-row label staying fixed is directly testing that,
 * since a regression there would silently make the bot's turns render as
 * if they were the human's.
 */
test('solo mode pins the human perspective, auto-generates the bot deck, and the bot plays its own turns', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play vs Bot' }).click();

  // Only the human picks in solo mode — the label reflects that.
  await expect(page.locator('.screen-note')).toContainText('You, pick a deck.');
  await page.getByRole('button', { name: /Vanguard's Alliance/ }).click();

  // No second pick screen — straight to the match.
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.locator('.score')).toContainText("Vanguard's Alliance: 0 / 5");
  await expect(page.locator('.score')).toContainText('(Bot)');
  await expect(page.locator('.arena-label-you .label-full')).toHaveText("Vanguard's Alliance");

  // Turn 1 can't attack, so hand control to the bot immediately.
  await page.getByRole('button', { name: 'End Turn' }).click();
  await expect(page.locator('.turn-info')).toContainText('Turn 2');
  await expect(page.locator('.turn-info')).toContainText('(Bot)');
  // Perspective must stay put even while it's the bot's turn.
  await expect(page.locator('.arena-label-you .label-full')).toHaveText("Vanguard's Alliance");

  // The bot acts on its own (no input from this test) and eventually ends
  // its turn, handing control back — this is the auto-play effect's whole
  // job. Generous timeout: each bot action has its own pacing delay.
  await expect(page.locator('.turn-info')).toContainText("Vanguard's Alliance's move", { timeout: 10_000 });
  await expect(page.locator('.turn-info')).toContainText('Turn 3');
  await expect(page.locator('.arena-label-you .label-full')).toHaveText("Vanguard's Alliance");

  // The human's row is interactive again now that it's really their turn.
  await page.locator('[data-side="you"][data-lane="0"]').click();
  await expect(page.locator('.action-panel')).toBeVisible();
});

test('a solo match reaches a real conclusion and Play Again returns to a single-pick solo screen', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play vs Bot' }).click();
  await page.getByRole('button', { name: /Vanguard's Alliance/ }).click();
  await expect(page.locator('.board')).toBeVisible();

  // Fast-forward by always ending the human's turn immediately — the point
  // here isn't skillful play, it's proving the bot can carry a match all
  // the way to a real gameover with no illegal-move deadlock or crash.
  let lastTurnSeen = -1;
  for (let i = 0; i < 150; i++) {
    if (await page.locator('.board-gameover').count()) break;
    const turnInfo = await page.locator('.turn-info').innerText().catch(() => '');
    const match = turnInfo.match(/Turn (\d+)/);
    const turn = match ? Number(match[1]) : -1;
    const isHumanTurn = turnInfo.includes("Vanguard's Alliance's move") && !turnInfo.includes('(Bot)');
    if (isHumanTurn && turn !== lastTurnSeen) {
      lastTurnSeen = turn;
      const endTurnBtn = page.getByRole('button', { name: 'End Turn' });
      if (await endTurnBtn.count()) await endTurnBtn.click();
    }
    await page.waitForTimeout(250);
  }

  await expect(page.locator('.board-gameover')).toBeVisible({ timeout: 10_000 });
  // The human never takes a real action in this fast-forward (always ends
  // the turn immediately), so the bot always wins — solo mode's gameover
  // screen should read that as a loss, not the neutral hotseat framing.
  // The bot's own preset is randomBotDeckChoice()'s unseeded pick between
  // the two starter decks (App.tsx), so the score line's winner name can
  // legitimately be either "Vanguard's Alliance (Bot)" or "Warden's
  // Alliance (Bot)" from one run to the next — assert the shape, not one
  // specific deck name (an earlier version of this test hardcoded
  // "Warden's Alliance (Bot)" and was flaky in exactly this way).
  await expect(page.locator('.board-gameover h1')).toHaveText('You lose');
  await expect(page.locator('.board-gameover')).toHaveClass(/board-gameover-loss/);
  await expect(page.locator('.board-gameover-score')).toContainText('(Bot)');
  await expect(page.locator('.board-gameover-score')).toContainText('5');

  await page.getByRole('button', { name: 'Play Again' }).click();

  // Solo mode is sticky across Play Again: back to a single deck pick,
  // not the hotseat two-pick flow.
  await expect(page.locator('.screen-title')).toHaveText('Choose Your Alliance');
  await expect(page.locator('.screen-note')).toContainText('You, pick a deck.');
});
