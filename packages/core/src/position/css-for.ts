import type { Axis, FreeBox, Size } from "./types";

/** Inline styles as strings with units, so they work with `el.style`, React and server-side CSS. */
export type PositionStyle = Record<string, string>;

/** Rounds away float noise such as 37.50000000000001, and never prints "-0". */
const num = (n: number) => String(Math.round(n * 1e4) / 1e4 || 0);
const px = (n: number) => `${num(n)}px`;
const pct = (n: number) => `${num(n)}%`;
const sizeCss = (size: Size) => (size.kind === "px" ? px(size.v) : pct(size.v));

/** `calc(50% + 12px)`, with the sign written out as CSS wants it. */
const calcFrom = (percent: number, offset: number) =>
  `calc(${num(percent)}% ${offset < 0 ? "-" : "+"} ${num(Math.abs(offset))}px)`;

function axisCss(
  style: PositionStyle,
  axis: Axis,
  size: Size,
  names: { start: string; end: string; size: string },
) {
  switch (axis.anchor) {
    case "start":
      style[names.start] = px(axis.offset);
      style[names.size] = sizeCss(size);
      break;
    case "end":
      style[names.end] = px(axis.offset);
      style[names.size] = sizeCss(size);
      break;
    case "center":
      // Centring is folded into calc(): the `translate` property makes react-moveable's handles collapse.
      style[names.start] =
        size.kind === "px"
          ? calcFrom(50, axis.offset - size.v / 2)
          : calcFrom(50 - size.v / 2, axis.offset);
      style[names.size] = sizeCss(size);
      break;
    case "stretch":
      // No size here: a size next to both edges is over-constrained and CSS would drop the end edge.
      style[names.start] = px(axis.start);
      style[names.end] = px(axis.end);
      break;
    case "scale":
      style[names.start] = pct(axis.start);
      style[names.size] = pct(axis.size);
      break;
  }
}

/**
 * The CSS that makes the browser place a free node the way `resolveRect` computes, at any container
 * size. The container must be a positioned element (`position: relative`).
 */
export function cssFor(box: FreeBox): PositionStyle {
  const style: PositionStyle = { position: "absolute", boxSizing: "border-box" };
  axisCss(style, box.x, box.w, { start: "left", end: "right", size: "width" });
  axisCss(style, box.y, box.h, { start: "top", end: "bottom", size: "height" });
  if (box.rotation !== 0) style.rotate = `${num(box.rotation)}deg`;
  return style;
}
