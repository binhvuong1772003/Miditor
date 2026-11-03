# Phone Auto Flow Implementation Plan

> **For agentic workers:** work task by task; each task ends green and committed.

**Goal:** A page nobody has placed by hand on the phone is drawn on the phone as a flow (stacked, wrapped, text growing), not as a shrunk copy of the desktop. People who only edit the desktop get a good phone page for free.

**Architecture:** Render decides the phone layout itself, from the data, with CSS (`flex-wrap`, `order`, `height: auto`). No measuring, so it is the same on a server and in the editor. A page is in **auto mode** when no node in the tree has a `phone` box. The first edit that writes phone geometry **freezes** the page: the editor measures what is drawn and writes it as `phone` boxes, in the same history step as the edit. "Arrange for phone" (behind a confirm) clears every `phone` box and goes back to auto.

**Spec:** the conversation of 2026-11-03; decisions below.

## Decisions

- Auto mode is worked out from the data: no `phone` box on any node. No new key, no migration. `phoneProps` and `phoneMinHeight` do not freeze a page.
- A page with any `phone` box draws exactly as it does today (shrink, 12 px text floor).
- Phone side only. The desktop is untouched.
- Flow rules for a free child of the page or of a container, from its desktop box:
  - Order: bands of vertically overlapping blocks, by y; inside a band, by x.
  - **Compact** block (desktop width at most 300 px and height at most 64 px: buttons, logos, small labels, icons): its own width, sharing a row when it fits, with auto margins from its desktop side. Everything else is full width.
  - Text and a container with children: `height: auto`. A shape or image without children keeps its aspect ratio. A box without children keeps its height in px.
  - Text size: up to 20 px as is, above that `20 + (size - 20) / 2`.
  - A container with children gets padding of 16 px and a gap of 12 px.
- The phone page height in auto mode is `phoneMinHeight` or 812 as a minimum, and grows with its content.
- Freeze: measure `offsetLeft/Top/Width/Height` against the parent element, write `phone` boxes and `phoneProps.size` for every Text and Button, through the permission guard, before any phone-geometry write, in the same history step.
- A block added while the page is frozen goes at the bottom of the phone layout.
- Overlapping siblings (a cup of ellipses) are one flow item, a wrapper with `aspect-ratio` and its members in percent. Own task, after the basic flow works.

## Tasks

1. **Core: flow data.** `isPhoneAuto(root)`, `phoneFlowOf(parent)` (order, compact or full, side), `phoneTextSize(size)`. Tests with the coffee page shape.
2. **Render: auto mode.** Phone side styles in `styleOn`, parent flow styles, `responsive` markup through `splitStyles`. Tests on markup; the page with `phone` boxes is unchanged.
3. **Editor: reading geometry in auto mode.** Phone root height and the sheet, the page edge, the Advanced numbers.
4. **Editor: freeze.** One choke point before drag, resize, turn, nudge, number fields, align, distribute. Same history step. "Arrange for phone" with a confirm.
5. **Editor: new block on a frozen page; hide the per-block reset.**
6. **Render and editor: clusters of overlapping blocks.**
7. **e2e, docs, full check.** Acceptance: `?landing=coffee` on the phone stacks the cards, no text overflows, desktop unchanged. Regression: `?landing` looks as before.
