import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { destroy, init, toast } from '../src/pixelperfect';

function click(selector: string): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing test element: ${selector}`);
  element.click();
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  destroy();
  vi.useRealTimers();
  document.body.style.removeProperty('overflow');
});

describe('initialization and teardown', () => {
  it('is idempotent and removes delegated listeners on destroy', () => {
    document.body.innerHTML = `
      <div data-pp-tabs>
        <div role="tablist">
          <button id="one" role="tab" aria-controls="panel-one" aria-selected="true">One</button>
          <button id="two" role="tab" aria-controls="panel-two" aria-selected="false">Two</button>
        </div>
        <section id="panel-one" role="tabpanel">First</section>
        <section id="panel-two" role="tabpanel">Second</section>
      </div>`;

    init();
    init();
    click('#two');
    expect(document.querySelector('#two')).toHaveAttribute('aria-selected', 'true');
    expect(document.querySelector('#panel-one')).toHaveProperty('hidden', true);

    destroy();
    click('#one');
    expect(document.querySelector('#two')).toHaveAttribute('aria-selected', 'true');
  });
});

describe('tabs', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-pp-tabs>
        <div role="tablist">
          <button id="one" role="tab" aria-controls="panel-one" aria-selected="true">One</button>
          <button id="two" role="tab" aria-controls="panel-two" aria-selected="false">Two</button>
          <button id="three" role="tab" aria-controls="panel-three" aria-selected="false">Three</button>
        </div>
        <section id="panel-one" role="tabpanel">First</section>
        <section id="panel-two" role="tabpanel">Second</section>
        <section id="panel-three" role="tabpanel">Third</section>
      </div>`;
    init();
  });

  it('selects a clicked tab and its panel', () => {
    click('#two');
    expect(document.querySelector('#two')).toHaveAttribute('aria-selected', 'true');
    expect(document.querySelector('#panel-two')).toHaveProperty('hidden', false);
    expect(document.querySelector('#panel-one')).toHaveProperty('hidden', true);
  });

  it('supports arrow, Home, and End navigation', () => {
    const first = document.querySelector<HTMLButtonElement>('#one');
    first?.focus();
    first?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }));
    expect(document.activeElement).toBe(document.querySelector('#three'));
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }));
    expect(document.activeElement).toBe(document.querySelector('#one'));
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End' }));
    expect(document.activeElement).toBe(document.querySelector('#three'));
  });
});

describe('dropdown menus', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-pp-dropdown>
        <button id="menu-trigger" aria-haspopup="menu" aria-expanded="false">Menu</button>
        <ul id="menu" role="menu"><li><button id="first-item" role="menuitem">First</button></li><li><button id="second-item" role="menuitem">Second</button></li></ul>
      </div>
      <button id="outside">Outside</button>`;
    init();
  });

  it('opens, dismisses outside, and closes after selection', () => {
    click('#menu-trigger');
    expect(document.querySelector('#menu-trigger')).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelector('#menu')).toHaveProperty('hidden', false);
    click('#outside');
    expect(document.querySelector('#menu')).toHaveProperty('hidden', true);
    click('#menu-trigger');
    click('#first-item');
    expect(document.querySelector('#menu')).toHaveProperty('hidden', true);
  });

  it('supports Arrow keys and Escape', () => {
    const trigger = document.querySelector<HTMLButtonElement>('#menu-trigger');
    trigger?.focus();
    trigger?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    expect(document.activeElement).toBe(document.querySelector('#first-item'));
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    expect(document.activeElement).toBe(document.querySelector('#second-item'));
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    expect(document.activeElement).toBe(trigger);
    expect(document.querySelector('#menu')).toHaveProperty('hidden', true);
  });
});

describe('overlays', () => {
  it('opens and closes a dialog and restores focus', () => {
    document.body.innerHTML = `
      <button id="dialog-trigger" data-pp-dialog-open="#dialog">Open</button>
      <dialog id="dialog" class="pp-dialog"><button id="dialog-close" data-pp-dialog-close>Close</button></dialog>`;
    const dialog = document.querySelector<HTMLDialogElement>('#dialog');
    if (dialog && typeof dialog.showModal !== 'function') {
      dialog.showModal = (): void => dialog.setAttribute('open', '');
      dialog.close = (): void => dialog.removeAttribute('open');
    }
    init();
    click('#dialog-trigger');
    expect(dialog).toHaveAttribute('open');
    click('#dialog-close');
    expect(dialog).not.toHaveAttribute('open');
    expect(document.activeElement).toBe(document.querySelector('#dialog-trigger'));
  });

  it('opens a drawer and closes it with Escape', () => {
    document.body.innerHTML = `
      <button id="drawer-trigger" data-pp-drawer-open="#drawer">Open</button>
      <aside id="drawer" class="pp-drawer" aria-hidden="true"><button data-pp-dismiss>Close</button></aside>`;
    init();
    click('#drawer-trigger');
    expect(document.querySelector('#drawer')).toHaveAttribute('aria-hidden', 'false');
    expect(document.querySelector('[data-pp-drawer-backdrop="drawer"]')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    expect(document.querySelector('#drawer')).toHaveAttribute('aria-hidden', 'true');
    expect(document.querySelector('[data-pp-drawer-backdrop="drawer"]')).toBeNull();
    expect(document.activeElement).toBe(document.querySelector('#drawer-trigger'));
  });
});

describe('dismissible feedback', () => {
  it('removes an alert and emits a dismiss event', () => {
    document.body.innerHTML = '<div id="alert" class="pp-alert"><button data-pp-dismiss>Close</button></div>';
    const handler = vi.fn();
    document.querySelector('#alert')?.addEventListener('pp:dismiss', handler);
    init();
    click('[data-pp-dismiss]');
    expect(handler).toHaveBeenCalledOnce();
    expect(document.querySelector('#alert')).toBeNull();
  });

  it('creates safe toast text and follows its lifecycle', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div data-pp-toast-container></div>';
    const handle = toast('<b>Saved</b>', { duration: 1000, tone: 'success' });
    expect(handle.element.textContent).toContain('<b>Saved</b>');
    expect(handle.element.innerHTML).not.toContain('<b>Saved</b>');
    expect(handle.element).toHaveClass('pp-toast--success');
    vi.advanceTimersByTime(1000);
    expect(handle.element).toHaveClass('pp-toast--leaving');
    vi.advanceTimersByTime(160);
    expect(handle.element.isConnected).toBe(false);
  });

  it('supports manual toast dismissal and a non-dismissible option', () => {
    vi.useFakeTimers();
    const handle = toast('Persistent', { dismissible: false, duration: 0 });
    expect(handle.element.querySelector('button')).toBeNull();
    handle.dismiss();
    vi.advanceTimersByTime(160);
    expect(handle.element.isConnected).toBe(false);
  });
});
