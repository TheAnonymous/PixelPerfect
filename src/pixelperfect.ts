export type ToastTone = 'info' | 'success' | 'danger';

export interface ToastOptions {
  container?: HTMLElement | string;
  dismissible?: boolean;
  duration?: number;
  tone?: ToastTone;
}

export interface ToastHandle {
  dismiss: () => void;
  element: HTMLElement;
}

type InitRoot = Document | DocumentFragment | HTMLElement;

interface RootState {
  controller: AbortController;
  cleanups: Set<() => void>;
}

const roots = new WeakMap<InitRoot, RootState>();
const dialogTriggers = new WeakMap<HTMLDialogElement, HTMLElement>();
const drawerTriggers = new WeakMap<HTMLElement, HTMLElement>();

function elements(root: InitRoot, selector: string): HTMLElement[] {
  const matches = Array.from(root.querySelectorAll<HTMLElement>(selector));
  if (root instanceof HTMLElement && root.matches(selector)) matches.unshift(root);
  return matches;
}

function closestElement(target: EventTarget | null, selector: string): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(selector) : null;
}

function targetElement(trigger: HTMLElement, attribute: string): HTMLElement | null {
  const selector = trigger.getAttribute(attribute);
  if (!selector) return null;
  try {
    return document.querySelector<HTMLElement>(selector);
  } catch {
    return null;
  }
}

function setupTabs(root: InitRoot): void {
  for (const tabs of elements(root, '[data-pp-tabs]')) {
    const tabList = tabs.querySelector<HTMLElement>('[role="tablist"]');
    const tabButtons = Array.from(tabs.querySelectorAll<HTMLElement>('[role="tab"]'));
    if (!tabList || tabButtons.length === 0) continue;

    const selected = tabButtons.find((tab) => tab.getAttribute('aria-selected') === 'true') ?? tabButtons[0];
    for (const tab of tabButtons) {
      const panelId = tab.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;
      const isSelected = tab === selected;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
      if (panel) panel.hidden = !isSelected;
    }
  }
}

function activateTab(tab: HTMLElement, moveFocus = false): void {
  const tabs = tab.closest<HTMLElement>('[data-pp-tabs]');
  if (!tabs) return;
  for (const item of tabs.querySelectorAll<HTMLElement>('[role="tab"]')) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    const panelId = item.getAttribute('aria-controls');
    const panel = panelId ? document.getElementById(panelId) : null;
    if (panel) panel.hidden = !selected;
  }
  if (moveFocus) tab.focus();
  tab.dispatchEvent(new CustomEvent('pp:tabchange', { bubbles: true, detail: { tab } }));
}

function closeDropdown(dropdown: HTMLElement, restoreFocus = false): void {
  const trigger = dropdown.querySelector<HTMLElement>('[aria-haspopup="menu"]');
  const menu = dropdown.querySelector<HTMLElement>('[role="menu"]');
  if (!trigger || !menu) return;
  trigger.setAttribute('aria-expanded', 'false');
  menu.hidden = true;
  if (restoreFocus) trigger.focus();
}

function closeOtherDropdowns(root: InitRoot, except?: HTMLElement): void {
  for (const dropdown of elements(root, '[data-pp-dropdown]')) {
    if (dropdown !== except) closeDropdown(dropdown);
  }
}

function toggleDropdown(dropdown: HTMLElement): void {
  const trigger = dropdown.querySelector<HTMLElement>('[aria-haspopup="menu"]');
  const menu = dropdown.querySelector<HTMLElement>('[role="menu"]');
  if (!trigger || !menu) return;
  const opening = trigger.getAttribute('aria-expanded') !== 'true';
  closeOtherDropdowns(document, dropdown);
  trigger.setAttribute('aria-expanded', String(opening));
  menu.hidden = !opening;
}

function openDialog(trigger: HTMLElement): void {
  const dialog = targetElement(trigger, 'data-pp-dialog-open');
  if (!(dialog instanceof HTMLDialogElement)) return;
  dialogTriggers.set(dialog, trigger);
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  dialog.querySelector<HTMLElement>('[autofocus], button, [href], input, select, textarea')?.focus();
}

function closeDialog(dialog: HTMLDialogElement): void {
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
  dialogTriggers.get(dialog)?.focus();
}

function closeDrawer(drawer: HTMLElement, restoreFocus = true): void {
  drawer.setAttribute('aria-hidden', 'true');
  drawer.setAttribute('inert', '');
  document.querySelector<HTMLElement>(`[data-pp-drawer-backdrop="${drawer.id}"]`)?.remove();
  document.body.style.removeProperty('overflow');
  if (restoreFocus) drawerTriggers.get(drawer)?.focus();
  drawer.dispatchEvent(new CustomEvent('pp:drawerclose', { bubbles: true }));
}

function openDrawer(trigger: HTMLElement): void {
  const drawer = targetElement(trigger, 'data-pp-drawer-open');
  if (!drawer) return;
  for (const open of document.querySelectorAll<HTMLElement>('.pp-drawer[aria-hidden="false"]')) closeDrawer(open, false);
  drawerTriggers.set(drawer, trigger);
  drawer.setAttribute('aria-hidden', 'false');
  drawer.removeAttribute('inert');
  document.body.style.overflow = 'hidden';
  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'pp-drawer-backdrop';
  backdrop.dataset.ppDrawerBackdrop = drawer.id;
  backdrop.setAttribute('aria-label', 'Close drawer');
  drawer.before(backdrop);
  backdrop.addEventListener('click', () => closeDrawer(drawer), { once: true });
  drawer.querySelector<HTMLElement>('[autofocus], button, [href], input, select, textarea')?.focus();
  drawer.dispatchEvent(new CustomEvent('pp:draweropen', { bubbles: true }));
}

function dismissElement(trigger: HTMLElement): void {
  const dismissible = trigger.closest<HTMLElement>('.pp-alert, .pp-toast, .pp-drawer');
  if (!dismissible) return;
  if (dismissible.classList.contains('pp-drawer')) {
    closeDrawer(dismissible);
    return;
  }
  dismissible.dispatchEvent(new CustomEvent('pp:dismiss', { bubbles: true }));
  dismissible.remove();
}

function menuItems(menu: HTMLElement): HTMLElement[] {
  return Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
}

function focusableItems(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

function handleClick(event: Event, root: InitRoot): void {
  const target = event.target;
  const tab = closestElement(target, '[role="tab"]');
  if (tab?.closest('[data-pp-tabs]')) {
    activateTab(tab);
    return;
  }

  const dropdownTrigger = closestElement(target, '[data-pp-dropdown] [aria-haspopup="menu"]');
  if (dropdownTrigger) {
    const dropdown = dropdownTrigger.closest<HTMLElement>('[data-pp-dropdown]');
    if (dropdown) toggleDropdown(dropdown);
    return;
  }

  const menuItem = closestElement(target, '[data-pp-dropdown] [role="menuitem"]');
  if (menuItem) {
    const dropdown = menuItem.closest<HTMLElement>('[data-pp-dropdown]');
    if (dropdown) closeDropdown(dropdown, true);
    return;
  }

  const dialogOpen = closestElement(target, '[data-pp-dialog-open]');
  if (dialogOpen) {
    openDialog(dialogOpen);
    return;
  }

  const dialogClose = closestElement(target, '[data-pp-dialog-close]');
  if (dialogClose) {
    const dialog = dialogClose.closest('dialog');
    if (dialog instanceof HTMLDialogElement) closeDialog(dialog);
    return;
  }

  const drawerOpen = closestElement(target, '[data-pp-drawer-open]');
  if (drawerOpen) {
    openDrawer(drawerOpen);
    return;
  }

  const dismiss = closestElement(target, '[data-pp-dismiss]');
  if (dismiss) {
    dismissElement(dismiss);
    return;
  }

  if (!closestElement(target, '[data-pp-dropdown]')) closeOtherDropdowns(root);
}

function handleKeydown(event: KeyboardEvent, root: InitRoot): void {
  const target = event.target;
  const tab = closestElement(target, '[role="tab"]');
  if (tab?.closest('[data-pp-tabs]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    const tabs = Array.from(tab.closest<HTMLElement>('[data-pp-tabs]')?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []);
    const index = tabs.indexOf(tab);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    const nextTab = tabs[next];
    if (nextTab) activateTab(nextTab, true);
    event.preventDefault();
    return;
  }

  const dropdown = closestElement(target, '[data-pp-dropdown]');
  if (dropdown) {
    const trigger = dropdown.querySelector<HTMLElement>('[aria-haspopup="menu"]');
    const menu = dropdown.querySelector<HTMLElement>('[role="menu"]');
    if (event.key === 'Escape') {
      closeDropdown(dropdown, true);
      event.preventDefault();
      return;
    }
    if (menu && trigger && target === trigger && event.key === 'ArrowDown') {
      trigger.setAttribute('aria-expanded', 'true');
      menu.hidden = false;
      menuItems(menu)[0]?.focus();
      event.preventDefault();
      return;
    }
    if (menu && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      const items = menuItems(menu);
      const index = items.indexOf(target as HTMLElement);
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      items[(index + delta + items.length) % items.length]?.focus();
      event.preventDefault();
      return;
    }
  }

  if (event.key === 'Escape') {
    const drawer = elements(root, '.pp-drawer[aria-hidden="false"]')[0];
    if (drawer) {
      closeDrawer(drawer);
      event.preventDefault();
    }
  }

  if (event.key === 'Tab') {
    const drawer = closestElement(target, '.pp-drawer[aria-hidden="false"]');
    if (!drawer) return;
    const focusable = focusableItems(drawer);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && target === first) {
      last.focus();
      event.preventDefault();
    } else if (!event.shiftKey && target === last) {
      first.focus();
      event.preventDefault();
    }
  }
}

export function init(root: InitRoot = document): void {
  if (roots.has(root)) return;
  const controller = new AbortController();
  const state: RootState = { controller, cleanups: new Set() };
  roots.set(root, state);
  setupTabs(root);
  closeOtherDropdowns(root);
  root.addEventListener('click', (event) => handleClick(event, root), { signal: controller.signal });
  root.addEventListener('keydown', (event) => handleKeydown(event as KeyboardEvent, root), { signal: controller.signal });

  for (const dialog of elements(root, 'dialog.pp-dialog')) {
    if (!(dialog instanceof HTMLDialogElement)) continue;
    const restore = (): void => dialogTriggers.get(dialog)?.focus();
    dialog.addEventListener('close', restore, { signal: controller.signal });
  }
}

export function destroy(root: InitRoot = document): void {
  const state = roots.get(root);
  if (!state) return;
  state.controller.abort();
  for (const cleanup of state.cleanups) cleanup();
  closeOtherDropdowns(root);
  for (const drawer of elements(root, '.pp-drawer[aria-hidden="false"]')) closeDrawer(drawer, false);
  roots.delete(root);
}

function resolveToastContainer(option?: HTMLElement | string): HTMLElement {
  if (option instanceof HTMLElement) return option;
  if (typeof option === 'string') {
    const selected = document.querySelector<HTMLElement>(option);
    if (selected) return selected;
  }
  const existing = document.querySelector<HTMLElement>('[data-pp-toast-container]');
  if (existing) return existing;
  const container = document.createElement('div');
  container.className = 'pp-toast-container';
  container.dataset.ppToastContainer = '';
  container.setAttribute('aria-label', 'Notifications');
  document.body.append(container);
  return container;
}

export function toast(message: string, options: ToastOptions = {}): ToastHandle {
  const { dismissible = true, duration = 4000, tone = 'info' } = options;
  const container = resolveToastContainer(options.container);
  const element = document.createElement('div');
  element.className = `pp-toast pp-toast--${tone}`;
  element.setAttribute('role', tone === 'danger' ? 'alert' : 'status');

  const text = document.createElement('span');
  text.textContent = message;
  element.append(text);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const dismiss = (): void => {
    if (!element.isConnected) return;
    if (timer) clearTimeout(timer);
    element.classList.add('pp-toast--leaving');
    globalThis.setTimeout(() => element.remove(), 160);
  };

  if (dismissible) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pp-icon-button pp-button--small';
    button.setAttribute('aria-label', 'Dismiss notification');
    button.textContent = '×';
    button.addEventListener('click', dismiss, { once: true });
    element.append(button);
  }

  container.append(element);
  if (duration > 0) timer = globalThis.setTimeout(dismiss, duration);
  return { dismiss, element };
}
