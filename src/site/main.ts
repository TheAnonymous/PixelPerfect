import '../css/pixelperfect.css';
import './site.css';
import { init, toast } from '../pixelperfect';

init();

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

document.addEventListener('click', async (event) => {
  if (!(event.target instanceof Element)) return;

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

  const toastTrigger = event.target.closest<HTMLElement>('[data-site-toast]');
  if (toastTrigger) {
    toast(toastTrigger.dataset.siteToast ?? 'Quest saved!', { tone: 'success' });
  }
});
