import { expect, test, type Locator } from '@playwright/test';

const sections = ['top', 'quick-start', 'foundations', 'actions', 'forms', 'navigation', 'content', 'feedback', 'overlays', 'game-ui'];

async function activate(locator: Locator): Promise<void> {
  await locator.evaluate((element: HTMLElement) => element.click());
}

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
  await expect(page.locator('.site-demo[data-site-scene]')).toHaveCount(34);
  await expect(page.locator('.site-diorama[data-site-scene]')).toHaveCount(9);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tiny UI. Big adventure.');
  await expect(page.locator('.site-eyebrow')).toContainText('v2.1.0');
  await expect(page.locator('footer')).toContainText('PixelPerfect v2.1.0');
  for (const selector of ['#navigation .site-demo__stage', '#navigation .pp-navbar', '#navigation [role="tabpanel"]']) {
    const colors = await page.locator(selector).first().evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, foreground: style.color };
    });
    expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(colors.foreground).not.toBe(colors.background);
  }
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
  await expect(page.locator('[data-site-current-chapter]')).toHaveText('Checkpoint Shrine');
});

test('component search reports, links, and highlights matches', async ({ page }) => {
  await page.goto('');
  const search = page.locator('[data-site-component-search]');
  await search.fill('tooltip');
  await expect(page.locator('#component-result-count')).toHaveText('1 component');
  const result = page.locator('[data-site-search-result]');
  await expect(result).toHaveCount(1);
  await expect(result).toHaveAttribute('href', '#component-tooltip');
  await result.focus();
  await page.keyboard.press('Enter');
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
  await expect(page.locator('.site-diorama__mote').first()).toHaveCSS('animation-name', 'none');
});

test('visible demos and copied snippets use the same markup', async ({ page }) => {
  await page.goto('');
  const matches = await page.locator('.site-demo').evaluateAll((demos) =>
    demos.every((demo) => {
      const stage = demo.querySelector('.site-demo__stage');
      const copy = demo.querySelector<HTMLElement>('[data-site-copy]');
      const snippet = copy ? document.getElementById(copy.dataset.siteCopy ?? '') : null;
      return stage !== null && snippet?.textContent === stage.innerHTML.trim();
    }),
  );
  expect(matches).toBe(true);
});

test('quest and map scenes update, reset, and stay isolated', async ({ page }) => {
  await page.goto('');
  const quest = page.locator('[data-component="button"]');
  const map = page.locator('[data-component="button-group"]');
  const untouched = await map.locator('[data-site-output]').textContent();

  await activate(quest.getByRole('button', { name: 'Accept patrol' }));
  await expect(quest.locator('[data-site-output]')).toHaveText('Moonwell patrol accepted.');
  await expect(map.locator('[data-site-output]')).toHaveText(untouched ?? '');
  expect(
    await quest.evaluate((demo) => {
      const stage = demo.querySelector('.site-demo__stage');
      const snippet = demo.querySelector('#code-button');
      return stage?.innerHTML.trim() === snippet?.textContent;
    }),
  ).toBe(true);
  await activate(quest.getByRole('button', { name: 'Reset quest board' }));
  await expect(quest.locator('[data-site-output]')).toHaveText('Awaiting a command.');

  await activate(map.getByRole('button', { name: 'Zoom in' }));
  await expect(map.locator('[data-site-map-view]')).toHaveAttribute('data-zoom', '125');
  await expect(map.locator('[data-site-output]')).toContainText('125%');
  await activate(map.getByRole('button', { name: 'Reset map' }));
  await expect(map.locator('[data-site-map-view]')).toHaveAttribute('data-zoom', '100');
});

test('registry forms validate and update their local outputs', async ({ page }) => {
  await page.goto('');
  const registry = page.locator('[data-component="field"]');
  await registry.locator('input').fill('M');
  await registry.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(registry.locator('input')).toHaveAttribute('aria-invalid', 'true');
  await expect(registry.locator('[data-site-output]')).toContainText('2–20');
  await registry.locator('input').fill('Moss Ranger');
  await registry.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(registry.locator('[data-site-output]')).toContainText('Moss Ranger entered');
  await activate(registry.getByRole('button', { name: 'Reset card' }));
  await expect(registry.locator('input')).toHaveValue('Moss Knight');

  const rune = page.locator('[data-component="input"]');
  await rune.locator('input').fill('MOSS-21');
  await rune.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(rune.locator('input')).toHaveAttribute('aria-invalid', 'false');
  await expect(rune.locator('[data-site-output]')).toContainText('accepted');

  const range = page.locator('[data-component="range"]');
  await range.locator('input').fill('40');
  await expect(range.locator('[data-site-output]')).toContainText('40%');
});

test('inventory selection, feedback replay, dialog, and drawer flows reset cleanly', async ({ page }) => {
  await page.goto('');
  const card = page.locator('[data-component="card"]');
  await activate(card.getByRole('button', { name: 'Equip blade' }));
  await expect(card.locator('[data-site-output]')).toContainText('equipped');
  await activate(card.getByRole('button', { name: 'Reset inventory slot' }));
  await expect(card.locator('[data-site-output]')).toHaveText('No item equipped.');

  const saves = page.locator('[data-component="list"]');
  await activate(saves.getByRole('button', { name: /Meadow/ }));
  await expect(saves.locator('.pp-list > li').first()).toHaveAttribute('aria-selected', 'true');
  await activate(saves.getByRole('button', { name: 'Reset save stones' }));
  await expect(saves.locator('.pp-list > li').nth(1)).toHaveAttribute('aria-selected', 'true');

  const checkpoint = page.locator('[data-component="alert"]');
  await activate(checkpoint.getByRole('button', { name: 'Replay checkpoint' }));
  await activate(checkpoint.getByRole('button', { name: 'Replay checkpoint' }));
  await expect(checkpoint.locator('[data-site-output]')).toHaveText('Checkpoint signal replayed.');
  await activate(checkpoint.getByRole('button', { name: 'Reset checkpoint' }));
  await expect(checkpoint.locator('[data-site-output]')).toHaveText('Checkpoint glow ready.');

  await activate(page.locator('[data-component="dialog"] [data-pp-dialog-open]'));
  await activate(page.locator('#rest-dialog').getByRole('button', { name: 'Rest now' }));
  await expect(page.locator('#camp-dialog-output')).toContainText('8 hearts');

  await activate(page.locator('[data-component="drawer"] [data-pp-drawer-open]'));
  await activate(page.locator('#inventory-drawer').getByRole('button', { name: /Health soup/ }));
  await expect(page.locator('#camp-drawer-output')).toContainText('Health soup equipped');
  await activate(page.locator('#inventory-drawer [data-pp-dismiss]'));
  await expect(page.locator('#inventory-drawer')).toHaveAttribute('aria-hidden', 'true');
});

test('disabled and invalid state changes preserve control geometry', async ({ page }) => {
  await page.goto('');
  const button = page.locator('[data-component="button"] [data-site-action="quest"]').first();
  const buttonBefore = await button.boundingBox();
  await button.evaluate((element: HTMLButtonElement) => {
    element.disabled = true;
  });
  expect(await button.boundingBox()).toEqual(buttonBefore);

  const input = page.locator('#save-code');
  const inputBefore = await input.boundingBox();
  await input.evaluate((element) => element.setAttribute('aria-invalid', 'false'));
  expect(await input.boundingBox()).toEqual(inputBefore);
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

test('every Mossmere component chapter matches its visual baseline', async ({ page }) => {
  await page.goto('');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.site-topbar, .site-chapter-nav, .pp-skip-link').evaluateAll((elements) => {
    for (const element of elements) element.setAttribute('hidden', '');
  });
  for (const section of ['actions', 'forms', 'navigation', 'content', 'feedback', 'overlays']) {
    const target = page.locator(`#${section}`);
    await target.scrollIntoViewIfNeeded();
    await expect(target).toHaveScreenshot(`${section}.png`, { animations: 'disabled' });
  }
});

test('content remains readable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL ?? '');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('[data-component]')).toHaveCount(34);
  await expect(page.locator('.site-diorama')).toHaveCount(9);
  await expect(page.locator('[data-component="dropdown-menu"] [role="menu"]')).toBeVisible();
  await expect(page.locator('#panel-stats')).toBeVisible();
  await expect(page.locator('#panel-gear')).toBeVisible();
  await expect(page.locator('.site-game__rail')).toBeVisible();
  await expect(page.locator('.site-game__stats')).toBeVisible();
  await context.close();
});
