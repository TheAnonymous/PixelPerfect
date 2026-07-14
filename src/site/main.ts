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

setupChapterNavigation();
setupComponentSearch();
setupRevealMotion();

document.addEventListener('click', async (event) => {
  if (!(event.target instanceof Element)) return;

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
