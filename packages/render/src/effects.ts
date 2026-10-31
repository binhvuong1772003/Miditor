import {
  DEFAULT_DURATION,
  DEFAULT_EASING,
  type Easing,
  ENTER_EFFECTS,
  isEffects,
  type NodeEffects,
  type PageData,
  type TreeNode,
} from "@midito-kitchen/core";
import type { CSSProperties } from "react";

/** The curve of each pace. */
const CURVES: Record<Easing, string> = {
  smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
  snappy: "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

/** Where a block starts from, for each entrance. It ends where it is: a `from` with no `to`. */
const FROM: Record<(typeof ENTER_EFFECTS)[number], string> = {
  fade: "opacity: 0",
  "slide-up": "opacity: 0; translate: 0 24px",
  "slide-down": "opacity: 0; translate: 0 -24px",
  "slide-left": "opacity: 0; translate: 24px 0",
  "slide-right": "opacity: 0; translate: -24px 0",
  zoom: "opacity: 0; scale: 0.92",
};

/** How long a press and a hover take to show. */
const QUICK = "180ms";

/**
 * The style sheet that every page with motion needs, with no part that depends on the page. A style
 * on an element beats every rule of a style sheet, and `all: revert` on it would undo a rule, so the
 * sheet only sets custom properties (`all` does not touch them) that the inline style of a block
 * reads: `--m-fx-enter`, `--m-t`, `--m-s`, `--m-f`, `--m-sh` and `--m-tr`. An entrance is a
 * `@keyframes` with only a `from`, so a block ends where its own style puts it, rotation included.
 * Only `opacity`, `translate` and `scale` move, apart from the colour of a hover.
 *
 * - A hover only counts where the device has a pointer to rest on something.
 * - Where the person asks for less motion nothing moves; a block is simply there.
 * - An entrance on scroll needs `animation-timeline`; a browser without it shows the block as it is.
 */
export function effectsCss(): string {
  const keyframes = ENTER_EFFECTS.map(
    (name) => `@keyframes midito-${name} { from { ${FROM[name]} } }`,
  ).join(" ");
  const enter = ENTER_EFFECTS.map(
    (name) =>
      `[data-midito-enter="${name}"] { --m-fx-enter: midito-${name} var(--m-dur, ${DEFAULT_DURATION}ms) var(--m-ease, ${CURVES[DEFAULT_EASING]}) var(--m-delay, 0ms) both; }`,
  ).join(" ");
  const scroll = ENTER_EFFECTS.map(
    (name) =>
      `[data-midito-trigger="scroll"][data-midito-enter="${name}"] { --m-fx-enter: midito-${name} 1s linear both; --m-fx-timeline: view(); --m-fx-range: entry 0% entry 70%; }`,
  ).join(" ");
  return [
    keyframes,
    `@media (prefers-reduced-motion: no-preference) {`,
    enter,
    `@supports (animation-timeline: view()) { ${scroll} }`,
    `[data-midito-hover], [data-midito-press] { --m-tr: translate ${QUICK} var(--m-ease, ${CURVES.smooth}), scale ${QUICK} var(--m-ease, ${CURVES.smooth}), filter ${QUICK}, box-shadow ${QUICK}; }`,
    `}`,
    `@media (hover: hover) {`,
    `[data-midito-hover="brighten"]:hover { --m-f: brightness(1.08); }`,
    `[data-midito-hover="glow"]:hover { --m-sh: 0 8px 24px rgb(0 0 0 / 0.18); }`,
    `}`,
    `@media (hover: hover) and (prefers-reduced-motion: no-preference) {`,
    `[data-midito-hover="lift"]:hover { --m-t: 0 -4px; --m-sh: 0 8px 24px rgb(0 0 0 / 0.14); }`,
    `[data-midito-hover="grow"]:hover { --m-s: 1.04; }`,
    `[data-midito-press]:active { --m-s: 0.97; }`,
    `}`,
  ].join("\n");
}

/** Whether any block of the page has motion, so that a page without any carries no style sheet. */
export function hasMotion(node: TreeNode): boolean {
  return node.effects !== undefined || node.children.some(hasMotion);
}

/** The place of a block among its brothers, which an entrance with a stagger follows. */
export interface Slot {
  index: number;
  stagger: number;
}

export interface Motion {
  attrs: Record<string, string>;
  style: CSSProperties;
}

const NONE: Motion = { attrs: {}, style: {} };

/**
 * What a block needs to move: data attributes that the style sheet selects on, and the inline
 * properties that read the variables it sets. Nothing for a block without motion, and nothing for
 * motion that does not pass the strict check, since data comes from outside.
 */
export function motionOf(node: TreeNode, slot?: Slot): Motion {
  const effects: NodeEffects | undefined = node.effects;
  if (!isEffects(effects) || Object.keys(effects).length === 0) return NONE;
  const { hover, press, enter } = effects;
  const attrs: Record<string, string> = {};
  const style: Record<string, string> = {};
  if (hover || press) {
    if (hover) attrs["data-midito-hover"] = hover;
    if (press) attrs["data-midito-press"] = "";
    style.translate = "var(--m-t, none)";
    style.scale = "var(--m-s, none)";
    style.filter = "var(--m-f, none)";
    style.boxShadow = "var(--m-sh, none)";
    style.transition = "var(--m-tr, none)";
  }
  if (enter) {
    attrs["data-midito-enter"] = enter.effect;
    attrs["data-midito-trigger"] = enter.trigger;
    style.animation = "var(--m-fx-enter, none)";
    style.animationTimeline = "var(--m-fx-timeline, auto)";
    style.animationRange = "var(--m-fx-range, normal)";
    if (enter.duration !== undefined) style["--m-dur"] = `${enter.duration}ms`;
    if (enter.easing !== undefined) style["--m-ease"] = CURVES[enter.easing];
    const delay = (enter.delay ?? 0) + (slot ? slot.index * slot.stagger : 0);
    if (delay > 0) style["--m-delay"] = `${delay}ms`;
  }
  return { attrs, style: style as CSSProperties };
}

/** The page's own check, for the root of data that may have come from anywhere. */
export const pageHasMotion = (data: PageData) => hasMotion(data.root);
