import { inferBox } from "./infer-box";
import { MAX_COORDINATE } from "./limits";
import { resolveRect } from "./resolve-rect";
import type { Container, FreeBox } from "./types";

/** What to change in a rect: any of its four numbers, in px. */
export interface RectPatch {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface RectOptions {
  /** The smallest width and height in px. Defaults to 1. */
  minSize?: number;
  /** A change of the width or of the height alone changes the other one to keep the proportions. */
  lockRatio?: boolean;
}

const usable = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const clamp = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);

/** Whether every number of the placement is one that `isPageData` accepts. */
function fits(box: FreeBox): boolean {
  const numbers = [
    ...Object.entries(box.x).flatMap(([key, value]) => (key === "anchor" ? [] : [value])),
    ...Object.entries(box.y).flatMap(([key, value]) => (key === "anchor" ? [] : [value])),
    box.w.v,
    box.h.v,
  ];
  return numbers.every((n) => typeof n === "number" && Math.abs(n) <= MAX_COORDINATE);
}

/**
 * The placement with some numbers of its rect changed: where the block is (`x`, `y`) and how big
 * (`w`, `h`), as `resolveRect` reports them (unrotated, in px, from the parent's padding box). What
 * the patch leaves out stays, so a new width keeps the left edge and a new `x` keeps the size.
 * Each axis keeps its anchor and each size its kind, as with `inferBox`: a block stuck to the right
 * edge stays stuck to it, a stretched one changes its margins, a scaled one its percentages. The
 * rotation does not change.
 *
 * A number that is not finite is ignored. Width and height are not smaller than `minSize`, and
 * every number is kept inside what a page may store. With `lockRatio` a change of only the width
 * or only the height moves the other one too, and at the smallest size the proportions win: both
 * grow until neither is below `minSize`. The very same box comes back when nothing changes (a change
 * of less than 0.005 px is none), when
 * the parent is empty (percentages could not be worked out), and when the result could not be
 * stored.
 */
export function withRect(
  box: FreeBox,
  patch: RectPatch,
  container: Container,
  options: RectOptions = {},
): FreeBox {
  if (!(container.w >= 0.01 && container.h >= 0.01)) return box;
  const min = usable(options.minSize) && options.minSize > 0 ? options.minSize : 1;
  const rect = resolveRect(box, container);
  const w = usable(patch.w) ? patch.w : undefined;
  const h = usable(patch.h) ? patch.h : undefined;

  let width = rect.w;
  let height = rect.h;
  if (options.lockRatio && rect.w > 0 && rect.h > 0 && (w === undefined) !== (h === undefined)) {
    const wanted = w !== undefined ? w / rect.w : (h as number) / rect.h;
    const scale = clamp(
      Math.max(wanted, min / rect.w, min / rect.h),
      0,
      Math.min(MAX_COORDINATE / rect.w, MAX_COORDINATE / rect.h),
    );
    width = rect.w * scale;
    height = rect.h * scale;
  } else {
    if (w !== undefined) width = clamp(w, min, MAX_COORDINATE);
    if (h !== undefined) height = clamp(h, min, MAX_COORDINATE);
  }
  const x = usable(patch.x) ? clamp(patch.x, -MAX_COORDINATE, MAX_COORDINATE) : rect.x;
  const y = usable(patch.y) ? clamp(patch.y, -MAX_COORDINATE, MAX_COORDINATE) : rect.y;

  // Less than half a hundredth of a px is nothing: it is what the stored numbers round to.
  const same = (a: number, b: number) => Math.abs(a - b) < 0.005;
  if (same(x, rect.x) && same(y, rect.y) && same(width, rect.w) && same(height, rect.h)) return box;
  const moved = inferBox(box, { x, y, w: width, h: height }, container);
  return fits(moved) ? moved : box;
}
