import { expect, test } from '@playwright/test';

test('How to Play opens from Home and closes back to Home', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.screen-title')).toBeVisible();

  await page.getByRole('button', { name: 'How to Play' }).click();
  await expect(page.locator('.guide-panel')).toBeVisible();
  await expect(page.locator('.guide-body')).toContainText('5 Elimination Points');

  // Clicking the overlay backdrop (outside the panel) also closes it.
  await page.locator('.guide-overlay').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('.guide-panel')).not.toBeVisible();
  await expect(page.locator('.screen-title')).toBeVisible();
});
