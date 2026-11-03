# Opacity and shadow

Two new looks for every block, set in the Properties panel, stored in the page, drawn by `<Render>`.
Rotation needs nothing: every free block already has a turn handle and a Rotation field (Advanced tab).

## Decisions (designer's calls; change any before building)

- **Opacity:** `styles.opacity`, a number from 0 to 100 (percent), 100 meaning opaque. 100 is the default, so
  setting it back to 100 removes the key. Whole numbers in the panel; any finite number from 0 to 100 is valid data.
- **Shadow:** `styles.shadow`, one shadow `{ x, y, blur, spread, color, opacity }`: `x` and `y` in px from -200 to
  200, `blur` from 0 to 200, `spread` from -200 to 200, `color` a stored `#rrggbb` or a theme colour (`@name`, as
  every other colour), `opacity` from 0 to 100 (percent of the colour; the colours of the page have no alpha).
  Drawn as `box-shadow: Xpx Ypx BLURpx SPREADpx color-mix(in srgb, COLOUR OPACITY%, transparent)`. No key means no
  shadow.
- **Panel:** a section "Effects" in the Design tab after Border: an Opacity slider with a number field, and a
  Shadow row of presets (None, Soft, Medium, Strong); a chosen shadow shows number fields for X, Y, Blur, Spread,
  Opacity and a colour row, so the presets are starting points and everything can be adjusted. Presets:
  Soft `0 2 8 0 #000000 15 %`, Medium `0 4 16 0 #000000 22 %`, Strong `0 8 28 0 #000000 32 %`.
- **Same on every screen:** like the other looks, one value for desktop and phone. Permissions: a change is an
  edit (`canEdit`). Copy, paste and duplicate carry it as they do any style. No migration: both keys are optional.
- **Drawn like the other looks:** `<Render>` writes `opacity` and `boxShadow` for every node with an explicit
  default (`1`, `none`), so an edit changes a value and never removes a key; a value that fails its check is the
  default.

## Tasks (each ends green: unit tests, `pnpm lint`, `pnpm typecheck`; tasks 4 and 5 also e2e and `pnpm perf`)

1. **core: the data.** `NodeStyles.opacity?: number` and `shadow?: Shadow`; `Shadow` type and `isShadow`,
   `isOpacity` checks (exported); `STYLE_CHECKS` in `tree/page.ts` accepts the two keys; tests: good values, bad
   values (NaN, out of range, extra keys, wrong colour), a page with both validates, `withStyle` sets and removes
   them. Rebuild `core` after.
2. **render: the drawing.** `lookOf` in `node-style.ts` writes `opacity` and `boxShadow`; tests in
   `node-style.test.ts`: default `1` and `none`, `50` gives `0.5`, a shadow gives the exact string, a theme colour
   is resolved, bad values give the defaults, and nothing else in the style changes.
3. **editor: the patch.** `StylePatch` gets `{ key: "opacity"; value: number | undefined }` and
   `{ key: "shadow"; value: Shadow | undefined }`; `store/apply-patch.ts` sets them, removes `opacity` at 100 and
   `shadow` on `undefined`, ignores an invalid value; tests: set, remove, undo through the store, a draft preview
   shows in `withDraft`, a refused edit under `canEdit: false`.
4. **editor: the panel.** The "Effects" section in `PropertiesPanel.tsx` with i18n keys in `i18n/en.ts` and
   `locales/vi.ts`; the slider previews while dragged and commits on release (same pattern as the border
   fields); tests: the section renders with a block selected, the presets set the three values above, the fields
   show a stored shadow, read-only under `canEdit: false`.
5. **playground, e2e and docs.** A block in the sample page that shows both; `e2e/effects.spec.ts`: change the
   opacity (number field) and see the computed opacity of the block, choose a preset and see the computed
   `box-shadow`, adjust Blur and see it change, remove it with None, undo each, and the published page
   (`?preview`) shows the same; both modes run under `E2E_STRICT=1`. README section "Looks"; regenerate the
   surface snapshots and `docs/reference.md`; add the size line to the baseline doc; `pnpm perf` unchanged.

## Not in this plan

Several shadows on one block, inner shadows, text shadows, filters and blur of the content, and per-screen values
for either look.
