import { inferBox } from "./infer-box";
import { resolveRect } from "./resolve-rect";
import type { Axis, AxisAnchor, Container, FreeBox } from "./types";

/** An axis of this anchor kind with every number at 0: the shape `inferBox` fills in. */
function blank(anchor: AxisAnchor): Axis {
  switch (anchor) {
    case "start":
    case "end":
    case "center":
      return { anchor, offset: 0 };
    case "stretch":
      return { anchor, start: 0, end: 0 };
    case "scale":
      return { anchor, start: 0, size: 0 };
  }
}

/**
 * The same box with one axis anchored another way, where the node stays exactly where it is: the
 * rect it has in `container` is the same before and after (up to the rounding `inferBox` stores).
 * The other axis, the rotation and the size of the other direction are untouched. On `stretch` and
 * `scale` the axis owns the size, so the saved size of that direction is kept for switching back.
 * Returns the very same box when the axis already has that anchor, or when the container is empty
 * along that axis (percentages and distances of nothing say nothing).
 */
export function setAnchor(
  box: FreeBox,
  axis: "x" | "y",
  anchor: AxisAnchor,
  container: Container,
): FreeBox {
  if (box[axis].anchor === anchor) return box;
  if (!((axis === "x" ? container.w : container.h) >= 0.01)) return box;
  const next = inferBox({ ...box, [axis]: blank(anchor) }, resolveRect(box, container), container);
  return axis === "x" ? { ...box, x: next.x, w: next.w } : { ...box, y: next.y, h: next.h };
}
