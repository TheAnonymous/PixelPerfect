# PixelPerfect v2.0.0

Tiny UI. Bigger adventure.

PixelPerfect v2 polishes the complete 34-component toolkit and turns its single-page showcase into a faster, livelier field guide. The four-color handheld palette, self-hosted Pixelify Sans, semantic HTML, optional dependency-free JavaScript, and zero runtime dependencies remain intact.

Highlights:

- Sticky desktop chapter navigation and a complete, keyboard-friendly mobile Map navigator.
- Search by component name, category, and UI keyword with accessible counts and direct highlighted jumps.
- Code-native stepped pixel scenes in the hero and final Game UI, with shared pause/resume and a fully static reduced-motion presentation.
- Complete dropdown keyboard behavior and reliable focus restoration for dialogs and drawers.
- Exact body-overflow restoration for drawers plus more consistent focus, disabled, invalid, selected, open, and motion states.
- Dynamic package/release version checks, ESM and IIFE bundles, declarations, checksums, and no npm publication.

## Migrating from v1

PixelPerfect v2 removes two v1 names without compatibility aliases:

| v1 | v2 |
| --- | --- |
| `pp-icon-button pp-button--secondary/ghost/small` | `pp-icon-button pp-icon-button--secondary/ghost/small` |
| `data-pp-dialog-close` | `data-pp-dismiss` |

The public `init`, `destroy`, and `toast` signatures and the `ToastOptions` and `ToastHandle` types are unchanged.

Verify the downloaded archive with the accompanying `.sha256` file, then use the archive's internal `SHA256SUMS` to verify every packaged file.
