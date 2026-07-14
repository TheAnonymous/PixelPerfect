# PixelPerfect

Tiny UI. Big adventure.

PixelPerfect is a framework-neutral HTML/CSS toolkit for indie web and game developers. It combines a fixed four-color handheld palette, self-hosted Pixelify Sans, crisp borders, stepped shadows, and optional zero-dependency JavaScript. The [live showcase](https://theanonymous.github.io/PixelPerfect/) documents every component and state as a journey through Mossmere.

## Quick start

Download the latest release and copy its contents into your project:

```html
<link rel="stylesheet" href="pixelperfect.css">
<button class="pp-button" type="button">Start quest</button>
```

For interactive components, load either the ESM or IIFE bundle:

```html
<script type="module">
  import { init, toast } from './pixelperfect.es.js';

  init();
  toast('Ready, player one!');
</script>
```

```html
<script src="pixelperfect.iife.js"></script>
<script>PixelPerfect.init();</script>
```

Markup stays semantic and presentable without JavaScript. The script enhances behavior only.

## Components

PixelPerfect ships 34 documented components:

- Actions: button, icon button, button group, link.
- Forms: field, input, textarea, select, checkbox, radio, switch, range, file input.
- Navigation: navbar, breadcrumb, tabs, pagination, dropdown menu.
- Content: card, panel/window, list, table, avatar, badge, tag.
- Feedback: alert, progress, meter, spinner, skeleton, tooltip, toast.
- Overlays: dialog, drawer.

Relevant components include default, focused, selected, disabled, loading, empty, error, and compact examples in the showcase. Each chapter is a code-native HTML/CSS diorama, and the local interactive examples can be replayed or reset without storing state.

## Design tokens

Override stable custom properties on `:root` or a containing element:

```css
:root {
  --pp-color-screen: #e6f4a8;
  --pp-color-mid: #a9c46c;
  --pp-color-shadow: #526b46;
  --pp-color-ink: #16231d;
  --pp-pixel: 4px;
  --pp-content-width: 72rem;
}
```

PixelPerfect v2 intentionally ships one preset. The palette is part of its identity.

## JavaScript API

### `init(root?)`

Enhances supported `data-pp-*` controls within `document` or the supplied root. Repeated calls with the same root are safe.

### `destroy(root?)`

Removes listeners registered by `init` and closes enhanced dropdowns or drawers inside the root.

### `toast(message, options?)`

Creates a notification and returns `{ element, dismiss }`. Options:

- `tone`: `"info"`, `"success"`, or `"danger"`.
- `duration`: milliseconds before dismissal; use `0` to keep it open.
- `dismissible`: whether to show a close button.
- `container`: an element or selector; defaults to `[data-pp-toast-container]`.

Supported declarative hooks are `data-pp-tabs`, `data-pp-dropdown`, `data-pp-dialog-open`, `data-pp-drawer-open`, `data-pp-dismiss`, and `data-pp-toast-container`. The generic `data-pp-dismiss` hook closes its nearest alert, toast, drawer, or `dialog.pp-dialog`.

## v2 compatibility

PixelPerfect v2.1 is fully compatible with v2.0. For projects migrating from v1, v2 deliberately removed two old names without compatibility aliases:

| v1 | v2 |
| --- | --- |
| `pp-icon-button pp-button--secondary/ghost/small` | `pp-icon-button pp-icon-button--secondary/ghost/small` |
| `data-pp-dialog-close` | `data-pp-dismiss` |

The exported signatures of `init(root?)`, `destroy(root?)`, `toast(message, options?)`, `ToastOptions`, and `ToastHandle` are unchanged.

## Accessibility approach

PixelPerfect favors semantic elements, visible `:focus-visible` rings, keyboard interaction for enhanced widgets, native form state, and reduced-motion handling. Examples include sensible ARIA labels and relationships. No formal WCAG conformance claim is made; applications remain responsible for accessible content, testing, and integration.

## Release contents

The `v2.1.0` archive contains:

- `pixelperfect.css` and `pixelperfect.min.css`
- `pixelperfect.es.js` and `pixelperfect.iife.js`
- `pixelperfect.d.ts`
- `icons/pixelperfect-icons.svg`
- `font/PixelifySans-VariableFont_wght.ttf` and `font/OFL.txt`
- `LICENSE`, `THIRD_PARTY_NOTICES.md`, `README.md`, `CHANGELOG.md`
- `SHA256SUMS`

No runtime dependencies, backend, analytics, framework adapters, or npm publication are included.

## Development

Node 24 is the supported toolchain.

```sh
npm ci
npm run check
npx playwright install --with-deps
npm run test:e2e
```

The Vite showcase builds to `dist/site`; distributable files and the release archive build under `dist/`.

## License

PixelPerfect is available under the [MIT License](LICENSE). Pixelify Sans is licensed separately under the SIL Open Font License; see [third-party notices](THIRD_PARTY_NOTICES.md).
