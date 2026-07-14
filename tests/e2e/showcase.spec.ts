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
  await expect(page.locator('.site-eyebrow')).toContainText('v2.0.0');
  await expect(page.locator('footer')).toContainText('PixelPerfect v2.0.0');
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
  await menuTrigger.focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('[data-component="dropdown-menu"] [role="menuitem"]').last()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.locator('[data-component="dropdown-menu"] [role="menuitem"]').first()).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.locator('[data-component="dropdown-menu"] [role="menuitem"]').last()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menuTrigger).toBeFocused();
  await menuTrigger.press('ArrowDown');
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-component="dropdown-menu"] [role="menu"]')).not.toBeVisible();

  await page.locator('[data-pp-dialog-open]').click();
  await expect(page.locator('#rest-dialog')).toBeVisible();
  await page.locator('#rest-dialog [data-pp-dismiss]').first().click();
  await expect(page.locator('#rest-dialog')).not.toBeVisible();
  await expect(page.locator('[data-pp-dialog-open]')).toBeFocused();

  await page.locator('[data-pp-drawer-open]').click();
  await expect(page.locator('#inventory-drawer')).toHaveAttribute('aria-hidden', 'false');
  await page.keyboard.press('Escape');
  await expect(page.locator('#inventory-drawer')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('[data-pp-drawer-open]')).toBeFocused();

  await page.reload();
  await page.keyboard.press('Tab');
  await expect(page.locator('.pp-skip-link')).toBeFocused();
  const outlineWidth = await page.locator('.pp-skip-link').evaluate((element) => getComputedStyle(element).outlineWidth);
  expect(outlineWidth).not.toBe('0px');
});

test('chapter navigator tracks location and works at desktop and mobile widths', async ({ page }) => {
  await page.goto('');
  const mobile = (page.viewportSize()?.width ?? 0) <= 704;
  const desktopLinks = page.locator('.site-chapter-nav__links');
  const mapToggle = page.locator('[data-site-map-toggle]');

  if (mobile) {
    await expect(desktopLinks).toBeHidden();
    await expect(mapToggle).toBeVisible();
    await mapToggle.click();
    await expect(page.locator('[data-site-map-panel]')).toBeVisible();
    await expect(page.locator('[data-site-map-panel] a').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-site-map-panel]')).toBeHidden();
    await expect(mapToggle).toBeFocused();
  } else {
    await expect(desktopLinks).toBeVisible();
    await expect(mapToggle).toBeHidden();
  }

  await page.locator('#feedback').scrollIntoViewIfNeeded();
  const activeLink = mobile
    ? page.locator('[data-site-map-panel] a[href="#feedback"]')
    : page.locator('.site-chapter-nav__links a[href="#feedback"]');
  await expect(activeLink).toHaveAttribute('aria-current', 'location');
  await expect(page.locator('[data-site-current-chapter]')).toHaveText('Feedback');
});

test('component search reports, links, and highlights matches', async ({ page }) => {
  await page.goto('');
  const search = page.locator('[data-site-component-search]');
  await search.fill('tooltip');
  await expect(page.locator('#component-result-count')).toHaveText('1 component');
  const result = page.locator('[data-site-search-result]');
  await expect(result).toHaveCount(1);
  await expect(result).toHaveAttribute('href', '#component-tooltip');
  await result.click();
  await expect(page.locator('#component-tooltip')).toBeFocused();
  await expect(page.locator('#component-tooltip')).toHaveClass(/site-demo--highlight/);

  await search.fill('no-such-pixel');
  await expect(page.locator('#component-result-count')).toHaveText('0 components');
  await expect(page.locator('.site-search-empty')).toBeVisible();
});

test('pixel scenes pause, resume, and become static for reduced motion', async ({ page }) => {
  await page.goto('');
  const toggle = page.locator('[data-site-scene-toggle]');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveText('Resume world');
  await expect(page.locator('body')).toHaveClass(/site-scenes-paused/);
  await expect(page.locator('.site-character')).toHaveCSS('animation-play-state', 'paused');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toHaveText('Pause world');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('.site-character')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.site-console__hero')).toHaveCSS('animation-name', 'none');
});

test('hero, navigator, and final game UI match visual baselines', async ({ page }) => {
  await page.goto('');
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('hero-navigator.png');
  await page.locator('.site-topbar, .site-chapter-nav, .pp-skip-link').evaluateAll((elements) => {
    for (const element of elements) element.setAttribute('hidden', '');
  });
  await page.locator('#game-ui').scrollIntoViewIfNeeded();
  await expect(page.locator('#game-ui')).toHaveScreenshot('game-ui.png');
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
  await expect(page.locator('.site-game__rail')).toBeVisible();
  await expect(page.locator('.site-game__stats')).toBeVisible();
  await context.close();
});
