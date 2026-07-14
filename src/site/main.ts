import '../css/pixelperfect.css';
import './site.css';
import { init, toast } from '../pixelperfect';

init();

const chapterIds = ['quick-start', 'foundations', 'actions', 'forms', 'navigation', 'content', 'feedback', 'overlays', 'game-ui'] as const;

const componentKeywords: Record<string, string> = {
  button: 'action submit primary click control',
  'icon-button': 'action compact icon favorite settings control',
  'button-group': 'action grouped toolbar zoom control',
  link: 'anchor navigation action',
  field: 'form label help validation',
  input: 'form text invalid error validation',
  textarea: 'form multiline notes text',
  select: 'form option choice dropdown',
  checkbox: 'form multiple choice toggle',
  radio: 'form single choice option',
  switch: 'form setting boolean toggle',
  range: 'form slider volume value',
  'file-input': 'form upload file image',
  navbar: 'navigation header menu links',
  breadcrumb: 'navigation trail hierarchy path',
  pagination: 'navigation pages next previous',
  tabs: 'navigation panels selection keyboard',
  'dropdown-menu': 'navigation popup menu actions keyboard',
  card: 'content container item selected',
  'panel-window': 'content panel window titlebar container',
  list: 'content rows selection items',
  table: 'content data grid rows columns',
  avatar: 'content profile user character',
  badge: 'content count status label',
  tag: 'content metadata filter label',
  alert: 'feedback message status warning dismiss',
  progress: 'feedback loading completion value',
  meter: 'feedback gauge value health',
  spinner: 'feedback loading busy wait',
  skeleton: 'feedback placeholder loading busy',
  tooltip: 'feedback hint hover focus help',
  toast: 'feedback notification message dismiss',
  dialog: 'overlay modal popup dismiss',
  drawer: 'overlay sidebar panel dismiss',
};

async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const buffer = document.createElement('textarea');
    buffer.className = 'site-copy-buffer';
    buffer.value = value;
    buffer.setAttribute('readonly', '');
    document.body.append(buffer);
    buffer.select();
    const copied = document.execCommand('copy');
    buffer.remove();
    if (!copied) throw new Error('The browser rejected both clipboard methods.');
  }
}

function buttonTarget(button: HTMLElement, attribute: string): HTMLElement | null {
  const id = button.getAttribute(attribute);
  return id ? document.getElementById(id) : null;
}

function setupChapterNavigation(): void {
  const map = document.querySelector<HTMLElement>('[data-site-map]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-site-map-toggle]');
  const panel = document.querySelector<HTMLElement>('[data-site-map-panel]');
  const current = document.querySelector<HTMLElement>('[data-site-current-chapter]');
  const sections = chapterIds.map((id) => document.getElementById(id)).filter((section): section is HTMLElement => section !== null);

  const setMapOpen = (open: boolean, restoreFocus = false): void => {
    if (!toggle || !panel) return;
    toggle.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    if (open) globalThis.requestAnimationFrame(() => panel.querySelector<HTMLElement>('a')?.focus());
    else if (restoreFocus) toggle.focus();
  };

  const setActiveChapter = (id: string): void => {
    const label = document.querySelector<HTMLHeadingElement>(`#${id} h2`)?.textContent ?? id;
    if (current) current.textContent = label;
    for (const link of document.querySelectorAll<HTMLAnchorElement>('.site-chapter-nav a[href^="#"]')) {
      if (link.hash === `#${id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };

  toggle?.addEventListener('click', () => setMapOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  map?.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
    if (!link) return;
    setMapOpen(false);
    const target = document.querySelector<HTMLElement>(link.hash);
    const heading = target?.querySelector<HTMLElement>('h2');
    if (heading) {
      heading.tabIndex = -1;
      globalThis.requestAnimationFrame(() => heading.focus({ preventScroll: true }));
    }
  });

  document.addEventListener('click', (event) => {
    if (toggle?.getAttribute('aria-expanded') === 'true' && event.target instanceof Node && !map?.contains(event.target)) {
      setMapOpen(false);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
      setMapOpen(false, true);
      event.preventDefault();
    }
  });

  setActiveChapter(chapterIds.includes(location.hash.slice(1) as (typeof chapterIds)[number]) ? location.hash.slice(1) : 'quick-start');
  if (!('IntersectionObserver' in globalThis)) return;

  const visible = new Set<HTMLElement>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target as HTMLElement);
        else visible.delete(entry.target as HTMLElement);
      }
      const nearest = [...visible].sort(
        (first, second) => Math.abs(first.getBoundingClientRect().top - 140) - Math.abs(second.getBoundingClientRect().top - 140),
      )[0];
      if (nearest) setActiveChapter(nearest.id);
    },
    { rootMargin: '-116px 0px -58% 0px', threshold: [0, 0.1] },
  );
  for (const section of sections) observer.observe(section);
}

function setupComponentSearch(): void {
  const input = document.querySelector<HTMLInputElement>('[data-site-component-search]');
  const results = document.querySelector<HTMLElement>('[data-site-search-results]');
  const count = document.getElementById('component-result-count');
  if (!input || !results || !count) return;

  const entries = [...document.querySelectorAll<HTMLElement>('[data-component]')].map((article) => {
    const key = article.dataset.component ?? '';
    const name = article.querySelector('h3')?.textContent?.trim() ?? key;
    const category = article.closest('section')?.querySelector('h2')?.textContent?.trim() ?? 'Components';
    article.id = `component-${key}`;
    article.tabIndex = -1;
    return { article, category, key, name, searchable: `${name} ${category} ${componentKeywords[key] ?? ''}`.toLowerCase() };
  });

  const render = (): void => {
    const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matches = entries.filter((entry) => terms.every((term) => entry.searchable.includes(term)));
    results.replaceChildren();
    count.textContent = matches.length === 1 ? '1 component' : `${matches.length} components`;

    if (matches.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'site-search-empty';
      empty.textContent = 'No components found. Try a broader map clue.';
      results.append(empty);
      return;
    }

    for (const entry of matches) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      const category = document.createElement('span');
      link.href = `#${entry.article.id}`;
      link.dataset.siteSearchResult = entry.article.id;
      link.textContent = entry.name;
      category.textContent = entry.category;
      link.append(category);
      item.append(link);
      results.append(item);
    }
  };

  input.addEventListener('input', render);
  render();
}

function setupRevealMotion(): void {
  const items = document.querySelectorAll<HTMLElement>('.pp-section, .site-demo, .site-component-finder');
  if (!('IntersectionObserver' in globalThis)) {
    for (const item of items) item.classList.add('site-is-revealed');
    return;
  }
  const observer = new IntersectionObserver(
    (entries, currentObserver) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('site-is-revealed');
        currentObserver.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  for (const item of items) observer.observe(item);
}

const sceneSnapshots = new Map<HTMLElement, string>();

function sceneFor(element: Element): HTMLElement | null {
  return element.closest<HTMLElement>('[data-site-scene]');
}

function outputFor(element: HTMLElement): HTMLElement | null {
  const targetId = element.dataset.siteOutputTarget;
  if (targetId) return document.getElementById(targetId);
  return sceneFor(element)?.querySelector<HTMLElement>('[data-site-output]') ?? null;
}

function syncSceneSnippet(scene: HTMLElement | null): void {
  if (!scene?.classList.contains('site-demo')) return;
  const stage = scene.querySelector<HTMLElement>('.site-demo__stage');
  const copy = scene.querySelector<HTMLElement>('[data-site-copy]');
  const snippet = copy ? buttonTarget(copy, 'data-site-copy') : null;
  if (stage && snippet) snippet.textContent = stage.innerHTML.trim();
}

function setSceneOutput(element: HTMLElement, message: string): void {
  const output = outputFor(element);
  const scene = sceneFor(element) ?? (output ? sceneFor(output) : null);
  if (scene) scene.dataset.siteState = 'changed';
  if (output) output.textContent = message;
  syncSceneSnippet(scene);
}

function setupLiveDemos(): void {
  for (const scene of document.querySelectorAll<HTMLElement>('.site-demo[data-site-scene]')) {
    const stage = scene.querySelector<HTMLElement>('.site-demo__stage');
    if (!stage) continue;
    scene.dataset.siteState = 'ready';
    sceneSnapshots.set(stage, stage.innerHTML);

    syncSceneSnippet(scene);
  }
}

function resetScene(control: HTMLElement): void {
  const scene = sceneFor(control);
  const stage = scene?.querySelector<HTMLElement>('.site-demo__stage');
  const snapshot = stage ? sceneSnapshots.get(stage) : undefined;
  if (!scene || !stage || snapshot === undefined) return;
  stage.innerHTML = snapshot;
  scene.dataset.siteState = 'ready';
  syncSceneSnippet(scene);
}

function updateRegistry(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): void {
  const scene = sceneFor(control);
  if (!scene) return;

  if (control instanceof HTMLTextAreaElement) {
    setSceneOutput(control, `${control.value.length} runes recorded.`);
    return;
  }

  if (control instanceof HTMLSelectElement) {
    setSceneOutput(control, `${control.value} selected.`);
    return;
  }

  if (control.type === 'range') {
    const value = control.value;
    scene.querySelector<HTMLElement>('[data-site-range-output]')?.replaceChildren(value);
    setSceneOutput(control, `Lantern hum set to ${value}%.`);
    return;
  }

  if (control.type === 'file') {
    setSceneOutput(control, control.files?.[0] ? `${control.files[0].name} attached.` : 'No sprite parcel attached.');
    return;
  }

  if (control.type === 'radio') {
    const label = control.closest('label')?.textContent?.trim() ?? 'Familiar';
    setSceneOutput(control, `${label} familiar selected.`);
    return;
  }

  if (control.type === 'checkbox') {
    const enabled = scene.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked').length;
    setSceneOutput(control, `${enabled} registry ${enabled === 1 ? 'option' : 'options'} enabled.`);
  }
}

function handleSceneAction(action: HTMLElement, event: MouseEvent): void {
  const kind = action.dataset.siteAction;
  const scene = sceneFor(action);
  if (!kind) return;

  if (kind === 'route') {
    event.preventDefault();
    setSceneOutput(action, 'Field guide route marked on your map.');
    return;
  }

  if (kind === 'quest') {
    setSceneOutput(action, action.dataset.quest ?? 'Quest order received.');
    return;
  }

  if (kind === 'toggle-tool' || kind === 'pin-quest' || kind === 'filter-tag') {
    const pressed = action.getAttribute('aria-pressed') !== 'true';
    if (kind === 'filter-tag') {
      for (const peer of scene?.querySelectorAll<HTMLElement>('[data-site-action="filter-tag"]') ?? []) peer.setAttribute('aria-pressed', 'false');
    }
    action.setAttribute('aria-pressed', String(pressed));
    const label = action.getAttribute('aria-label') ?? action.textContent?.trim() ?? 'Control';
    setSceneOutput(action, kind === 'filter-tag' ? `Showing ${label} quests.` : `${label} ${pressed ? 'active' : 'inactive'}.`);
    return;
  }

  if (kind.startsWith('zoom-')) {
    const view = scene?.querySelector<HTMLElement>('[data-site-map-view]');
    const readout = scene?.querySelector<HTMLElement>('[data-site-action="zoom-reset"]');
    if (!view || !readout) return;
    const current = Number(view.dataset.zoom ?? 100);
    const next = kind === 'zoom-reset' ? 100 : Math.min(150, Math.max(50, current + (kind === 'zoom-in' ? 25 : -25)));
    view.dataset.zoom = String(next);
    readout.textContent = `${next}%`;
    readout.setAttribute('aria-pressed', String(next === 100));
    setSceneOutput(action, `Moonwell · ${next}% map scale.`);
    return;
  }

  if (kind === 'equip') {
    const pressed = action.getAttribute('aria-pressed') !== 'true';
    action.setAttribute('aria-pressed', String(pressed));
    action.textContent = pressed ? 'Blade equipped' : 'Equip blade';
    setSceneOutput(action, pressed ? 'Moonspore blade equipped.' : 'No item equipped.');
    return;
  }

  if (kind === 'select-save') {
    for (const row of scene?.querySelectorAll('.pp-list > li') ?? []) row.removeAttribute('aria-selected');
    action.closest('li')?.setAttribute('aria-selected', 'true');
    setSceneOutput(action, `${action.textContent?.replace(/\s+/g, ' ').trim() ?? 'Save stone'} selected.`);
    return;
  }

  if (kind === 'replay') {
    scene?.classList.remove('site-scene--replaying');
    if (scene) void scene.offsetWidth;
    scene?.classList.add('site-scene--replaying');
    setSceneOutput(action, 'Checkpoint signal replayed.');
    return;
  }

  if (kind === 'advance-progress') {
    const progress = scene?.querySelector<HTMLProgressElement>('progress');
    const readout = scene?.querySelector<HTMLElement>('[data-site-progress-output]');
    if (!progress) return;
    progress.value = progress.value >= progress.max ? 0 : Math.min(progress.max, progress.value + 19);
    if (readout) readout.textContent = String(progress.value);
    setSceneOutput(action, `Moonwell route is ${progress.value}% complete.`);
    return;
  }

  if (kind === 'toast-count') {
    const count = Number(scene?.dataset.toastCount ?? 0) + 1;
    if (scene) scene.dataset.toastCount = String(count);
    setSceneOutput(action, `${count} shrine ${count === 1 ? 'message' : 'messages'} replayed.`);
    return;
  }

  if (kind === 'camp-rest') {
    setSceneOutput(action, 'Rest complete · 8 hearts · moonrise.');
    return;
  }

  if (kind === 'drawer-equip') {
    const list = action.closest('.pp-list');
    for (const row of list?.querySelectorAll(':scope > li') ?? []) row.removeAttribute('aria-selected');
    action.closest('li')?.setAttribute('aria-selected', 'true');
    const item = action.childNodes[0]?.textContent?.trim() ?? 'Item';
    document.getElementById('inventory-drawer-output')?.replaceChildren(`${item} equipped.`);
    setSceneOutput(action, `Pack open · ${item} equipped.`);
  }
}

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.matches('[data-site-registry-form]')) {
    event.preventDefault();
    const input = form.querySelector<HTMLInputElement>('input');
    if (!input) return;
    const length = [...input.value.trim()].length;
    const valid = length >= 2 && length <= 20;
    input.setAttribute('aria-invalid', String(!valid));
    setSceneOutput(form, valid ? `${input.value} entered in the Mossmere registry.` : 'Name must contain 2–20 characters.');
  }
  if (form.matches('[data-site-rune-form]')) {
    event.preventDefault();
    const input = form.querySelector<HTMLInputElement>('input');
    const error = form.querySelector<HTMLElement>('.pp-error');
    if (!input) return;
    const valid = input.value.trim().toUpperCase() === 'MOSS-21';
    input.setAttribute('aria-invalid', String(!valid));
    if (error) error.textContent = valid ? 'Rune accepted. The trail gate is open.' : 'That rune is not in this realm.';
    setSceneOutput(form, valid ? 'MOSS-21 accepted. Registry restored.' : 'Rune rejected. Try MOSS-21.');
  }
});

document.addEventListener('input', (event) => {
  const control = event.target;
  if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
    if (control.closest('[data-site-action="registry-update"]')) updateRegistry(control);
  }
});

document.addEventListener('change', (event) => {
  const control = event.target;
  if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
    if (control.closest('[data-site-action="registry-update"]')) updateRegistry(control);
  }
});

for (const eventName of ['pp:dismiss', 'pp:tabchange']) {
  document.addEventListener(eventName, (event) => {
    const target = event.target;
    if (target instanceof Element) globalThis.queueMicrotask(() => syncSceneSnippet(sceneFor(target)));
  });
}

setupChapterNavigation();
setupComponentSearch();
setupRevealMotion();
setupLiveDemos();

document.addEventListener('click', async (event) => {
  if (!(event.target instanceof Element)) return;

  const reset = event.target.closest<HTMLElement>('[data-site-reset]');
  if (reset) {
    resetScene(reset);
    return;
  }

  const sceneAction = event.target.closest<HTMLElement>('[data-site-action]');
  if (sceneAction) handleSceneAction(sceneAction, event);

  const searchResult = event.target.closest<HTMLAnchorElement>('[data-site-search-result]');
  if (searchResult) {
    const target = document.getElementById(searchResult.dataset.siteSearchResult ?? '');
    if (!target) return;
    event.preventDefault();
    history.replaceState(null, '', searchResult.hash);
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    target.focus({ preventScroll: true });
    target.classList.remove('site-demo--highlight');
    void target.offsetWidth;
    target.classList.add('site-demo--highlight');
    globalThis.setTimeout(() => target.classList.remove('site-demo--highlight'), 1400);
    return;
  }

  const toggle = event.target.closest<HTMLElement>('[data-site-code-toggle]');
  if (toggle) {
    const code = buttonTarget(toggle, 'data-site-code-toggle');
    if (!code) return;
    const open = code.dataset.open !== 'true';
    code.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Hide code' : 'View code';
    return;
  }

  const copy = event.target.closest<HTMLElement>('[data-site-copy]');
  if (copy) {
    const source = buttonTarget(copy, 'data-site-copy');
    if (!source) return;
    try {
      await copyText(source.textContent?.trim() ?? '');
      const previous = copy.textContent;
      copy.textContent = 'Copied!';
      globalThis.setTimeout(() => {
        copy.textContent = previous;
      }, 1400);
      toast('Markup copied to clipboard.', { duration: 2200, tone: 'success' });
    } catch {
      toast('Copy failed. Select the snippet manually.', { tone: 'danger' });
    }
    return;
  }

  const sceneToggle = event.target.closest<HTMLButtonElement>('[data-site-scene-toggle]');
  if (sceneToggle) {
    const paused = !document.body.classList.contains('site-scenes-paused');
    document.body.classList.toggle('site-scenes-paused', paused);
    sceneToggle.setAttribute('aria-pressed', String(paused));
    sceneToggle.textContent = paused ? 'Resume world' : 'Pause world';
    toast(paused ? 'Pixel world paused.' : 'Pixel world moving again.', { duration: 1800 });
    return;
  }

  const toastTrigger = event.target.closest<HTMLElement>('[data-site-toast]');
  if (toastTrigger) toast(toastTrigger.dataset.siteToast ?? 'Quest saved!', { tone: 'success' });
});

for (const eventName of ['click', 'keydown']) {
  document.addEventListener(eventName, (event) => {
    const target = event.target;
    if (target instanceof Element) globalThis.queueMicrotask(() => syncSceneSnippet(sceneFor(target)));
  });
}
