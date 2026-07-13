import { expect, test } from '@playwright/test';

const sections = ['top', 'quick-start', 'foundations', 'actions', 'forms', 'navigation', 'content', 'feedback', 'overlays', 'game-ui'];

test('showcase renders every section without console or asset errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  const assetErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) assetErrors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('');
  await page.evaluate(() => document.fonts.ready);

  for (const id of sections) await expect(page.locator(`#${id}`)).toBeVisible();
  await expect(page.locator('[data-component]')).toHaveCount(34);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tiny UI. Big adventure.');
  expect(consoleErrors).toEqual([]);
  expect(assetErrors).toEqual([]);
});

test('copy controls, keyboard focus, tabs, dropdowns, and overlays work', async ({ page }) => {
  await page.goto('');

  await page.locator('[data-component="button"] [data-site-copy]').click();
  await expect(page.locator('.pp-toast')).toContainText('Markup copied');

  await page.locator('#tab-gear').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tab-lore')).toBeFocused();
  await expect(page.locator('#panel-lore')).toBeVisible();

  const menuTrigger = page.locator('[data-component="dropdown-menu"] [aria-haspopup="menu"]');
  await menuTrigger.click();
  await expect(page.locator('[data-component="dropdown-menu"] [role="menu"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menuTrigger).toBeFocused();

  await page.locator('[data-pp-dialog-open]').click();
  await expect(page.locator('#rest-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#rest-dialog')).not.toBeVisible();

  await page.locator('[data-pp-drawer-open]').click();
  await expect(page.locator('#inventory-drawer')).toHaveAttribute('aria-hidden', 'false');
  await page.keyboard.press('Escape');
  await expect(page.locator('#inventory-drawer')).toHaveAttribute('aria-hidden', 'true');

  await page.reload();
  await page.keyboard.press('Tab');
  await expect(page.locator('.pp-skip-link')).toBeFocused();
  const outlineWidth = await page.locator('.pp-skip-link').evaluate((element) => getComputedStyle(element).outlineWidth);
  expect(outlineWidth).not.toBe('0px');
});

test('hero matches the screenshot baseline', async ({ page }) => {
  await page.goto('');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('#top')).toHaveScreenshot('hero.png');
});

test('content remains readable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL ?? '');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('[data-component]')).toHaveCount(34);
  await expect(page.locator('[data-component="dropdown-menu"] [role="menu"]')).toBeVisible();
  await expect(page.locator('#panel-stats')).toBeVisible();
  await expect(page.locator('#panel-gear')).toBeVisible();
  await context.close();
});
