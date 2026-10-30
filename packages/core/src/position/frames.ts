import { normalizeAngle } from "../styles/angle";
import { inferBox } from "./infer-box";
import { resolveRect } from "./resolve-rect";
import type { Container, FreeBox } from "./types";

/**
 * The box that a block's placement is measured in, as seen from one common space (the page, say).
 * `size` is the padding box of the parent, `center` is where the middle of that box is in the common
 * space, and `rotation` is how far the box is turned there in degrees, all of its parents' turns
 * included. A parent that is not turned and sits at `(x, y)` has the centre `(x + w / 2, y + h / 2)`.
 */
export interface Frame {
  size: Container;
  center: { x: number; y: number };
  rotation: number;
}

/** The vector turned by `degrees`, clockwise on the screen, like CSS `rotate` and `moveRect`. */
const turn = (v: { x: number; y: number }, degrees: number) => {
  const a = (degrees * Math.PI) / 180;
  return { x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) };
};

/**
 * The same placement written for another parent, so that the block stays where it is, and turned
 * the way it is, in the common space: the general form of `reparentBox`, which cannot account for a
 * parent that is turned. The centre of the block is carried from `from` to `to` and its rotation
 * becomes its own plus the turn of `from` minus the turn of `to`. Each axis keeps its anchor type
 * and each size its kind, as with `inferBox`, and the size of the block is not changed.
 */
export function moveBetweenFrames(box: FreeBox, from: Frame, to: Frame): FreeBox {
  const rect = resolveRect(box, from.size);
  const inFrom = turn(
    { x: rect.x + rect.w / 2 - from.size.w / 2, y: rect.y + rect.h / 2 - from.size.h / 2 },
    from.rotation,
  );
  const inTo = turn(
    { x: from.center.x + inFrom.x - to.center.x, y: from.center.y + inFrom.y - to.center.y },
    -to.rotation,
  );
  const x = to.size.w / 2 + inTo.x;
  const y = to.size.h / 2 + inTo.y;
  const moved = inferBox(
    box,
    { x: x - rect.w / 2, y: y - rect.h / 2, w: rect.w, h: rect.h },
    to.size,
  );
  return { ...moved, rotation: normalizeAngle(box.rotation + from.rotation - to.rotation) };
}
