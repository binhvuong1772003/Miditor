import { inferBox } from "./infer-box";
import { resolveRect } from "./resolve-rect";
import type { Container, FreeBox } from "./types";

/**
 * The same placement written for another parent, so that the node stays where it is on the page.
 * `from` and `to` are the sizes of the old and the new parent (their padding boxes, like
 * `resolveRect`), and `shift` is where the new parent's top left corner is, measured from the old
 * parent's top left corner, in px. Each axis keeps its anchor type and each size its kind, only the
 * numbers change, as with `inferBox`; the rotation is the node's own and stays. Both parents are
 * taken as upright rectangles: a turned parent is not accounted for.
 */
export function reparentBox(
  box: FreeBox,
  from: Container,
  to: Container,
  shift: { x: number; y: number },
): FreeBox {
  const rect = resolveRect(box, from);
  return inferBox(box, { ...rect, x: rect.x - shift.x, y: rect.y - shift.y }, to);
}
