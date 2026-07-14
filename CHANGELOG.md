# Changelog

All notable changes to PixelPerfect are documented here. The project follows Semantic Versioning.

## 2.1.0 - 2026-07-14

### Added

- Nine connected HTML/CSS Mossmere dioramas spanning the Trailhead, Field Guide, Camp Command Post, Adventurer Registry, Overworld Map, Quest Log and Inventory, Checkpoint Shrine, Camp, and Journey's End.
- Showcase-private, resettable micro-scenes for quest actions, map zoom, registry validation, selection and equip flows, repeatable feedback, and camp overlays.
- Cross-browser desktop and mobile visual baselines for Actions, Forms, Navigation, Content, Feedback, and Overlays.
- Regression coverage for local state isolation, exact visible snippets, inverted-surface contrast, unchanged toolkit exports, and stable disabled/invalid geometry.

### Changed

- All 34 demos are curated Mossmere compositions with clearer default, selected, disabled, loading, empty, and error context.
- Inverted chapters now give light component surfaces explicit foreground and background colors.
- Mobile and reduced-motion presentations retain every component, state, action, and completed diorama while simplifying layout and motion.

### Compatibility

- No migration is required from v2.0. Public classes, modifiers, icons, themes, `data-pp-*` hooks, exports, and types are unchanged.

## 2.0.0 - 2026-07-14

### Added

- A sticky desktop chapter navigator and complete mobile Map navigator with active-section tracking and accessible focus handling.
- Search across all 34 components by name, category, and fixed UI keywords, including direct jump and highlight behavior.
- Code-native animated pixel worlds in the hero and Game UI, shared pause/resume controls, section reveals, and static reduced-motion equivalents.
- Complete dropdown keyboard navigation with Arrow Up/Down, Home, End, Escape, and Tab closing.
- Unit, cross-browser E2E, no-JS, reduced-motion, and updated visual coverage for the polished showcase.

### Changed

- Icon button modifiers now use their own `pp-icon-button--secondary`, `pp-icon-button--ghost`, and `pp-icon-button--small` names.
- `data-pp-dismiss` now closes alerts, toasts, drawers, and the nearest `dialog.pp-dialog`; `data-pp-dialog-close` has been removed.
- Dialog and drawer focus restoration, drawer body-overflow restoration, disabled interaction states, invalid form geometry, and component motion states are more robust.
- Packaging and verification derive the release version from `package.json`; tagged releases reject mismatched versions and derive archive names dynamically.

### Migration

| v1 | v2 |
| --- | --- |
| `pp-icon-button pp-button--secondary/ghost/small` | `pp-icon-button pp-icon-button--secondary/ghost/small` |
| `data-pp-dialog-close` | `data-pp-dismiss` |

## 1.0.0 - 2026-07-13

### Added

- The handheld-green palette, Pixelify Sans, stepped layout/elevation tokens, and pixel focus treatment.
- Thirty-four semantic HTML/CSS components covering actions, forms, navigation, content, feedback, and overlays.
- Optional dependency-free tabs, dropdown, dialog, drawer, dismiss, and toast behavior.
- ESM and IIFE builds with TypeScript declarations.
- A responsive showcase, custom SVG icon sprite, release checksums, and GitHub Pages deployment workflow.
