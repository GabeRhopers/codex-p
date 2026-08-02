import { expect, test } from '@playwright/test';

/** A card grid button's accessible name is its full text content (tier,
 * season, range, name, stats, ability) — matching on the card's unique
 * name substring is enough to find it without needing a dedicated testid. */
function card(page: import('@playwright/test').Page, name: string) {
  return page.getByRole('button', { name, exact: false }).first();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play Hotseat (2 Players)' }).click();
  await page.getByRole('button', { name: 'Build Custom Deck' }).click();
  await expect(page.locator('.deck-builder-grid')).toBeVisible();
});

test('Confirm Deck stays disabled until size, ability cap, and season-minimum are all satisfied', async ({
  page,
}) => {
  const confirm = page.getByRole('button', { name: 'Confirm Deck' });
  await expect(confirm).toBeDisabled();
  await expect(page.locator('.deck-builder-stats')).toContainText('0 / 10 cards');

  // 8 Neutral cards + 2 Winter cards: 10 cards total, satisfies the
  // ability cap, but only touches one non-Neutral season — §9's "not a
  // mono-season collection" rule (mirrored here for custom decks) should
  // still block confirming.
  for (const name of [
    'Wayfarer',
    'Bulwark Drifter',
    'Trickster',
    'Meadow Runner',
    'Hollow Wanderer',
    'Stonebound Sentry',
    'Mesmerist',
    'Snowdrift Scout',
    'Frost Sentinel',
    'Ice Piercer',
  ]) {
    await card(page, name).click();
  }
  await expect(page.locator('.deck-builder-stats')).toContainText('10 / 10 cards');
  await expect(page.locator('.deck-builder-stats')).toContainText('1 season (min. 2)');
  await expect(confirm).toBeDisabled();

  // Swap one Winter card for a Summer one — now two non-Neutral seasons
  // are represented, and every other rule was already satisfied.
  await card(page, 'Ice Piercer').click(); // deselect
  await card(page, 'Dune Skirmisher').click(); // select
  await expect(page.locator('.deck-builder-stats')).toContainText('2 seasons (min. 2)');
  await expect(confirm).toBeEnabled();
});

test('a card is only pickable up to the deck size and ability-card caps', async ({ page }) => {
  // 3 ability cards reaches MAX_SPECIAL_ABILITY_CARDS — a 4th should become
  // unpickable while ordinary cards stay pickable.
  await card(page, 'Firebrand').click();
  await card(page, 'Scorchcaller').click();
  await card(page, 'Trickster').click();
  await expect(page.locator('.deck-builder-stats')).toContainText('3 / 3 ability cards');

  await expect(card(page, 'Frostguard')).toBeDisabled();
  await expect(card(page, 'Wayfarer')).toBeEnabled();

  // Deselecting one ability card should free up the cap again.
  await card(page, 'Trickster').click();
  await expect(page.locator('.deck-builder-stats')).toContainText('2 / 3 ability cards');
  await expect(card(page, 'Frostguard')).toBeEnabled();
});

test('a saved custom deck is remembered the next time the builder opens', async ({ page }) => {
  const picks = [
    'Wayfarer',
    'Bulwark Drifter',
    'Trickster',
    'Meadow Runner',
    'Hollow Wanderer',
    'Stonebound Sentry',
    'Mesmerist',
    'Snowdrift Scout',
    'Dune Skirmisher',
    'Frost Sentinel',
  ];
  for (const name of picks) {
    await card(page, name).click();
  }
  await expect(page.getByRole('button', { name: 'Confirm Deck' })).toBeEnabled();
  await page.getByRole('button', { name: 'Confirm Deck' }).click();

  // Player 1's confirm hands off to Player 2's pick screen (hotseat).
  await expect(page.locator('.screen-note')).toContainText('Player 2, pick a deck.');
  await page.getByRole('button', { name: 'Build Custom Deck' }).click();

  // The builder pre-fills from the last save (device-local, not
  // per-player) — all 10 should already be selected with no clicks here.
  await expect(page.locator('.deck-builder-stats')).toContainText('10 / 10 cards');
  for (const name of picks) {
    await expect(card(page, name)).toHaveClass(/card-selected/);
  }
});
