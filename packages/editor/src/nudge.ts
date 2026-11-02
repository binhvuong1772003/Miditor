import type { Rect } from "@miditor/core";

/** The keys that move a block, and the way each one goes. */
const STEP: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

/** Whether this key is one of the four arrows. */
export const isNudgeKey = (key: string) => Object.hasOwn(STEP, key);

/** How far one press moves a block, in px, and how far with Shift. */
export const NUDGE = 1;
export const NUDGE_FAR = 10;

/** The rect moved one step by an arrow key, 10 px with Shift. Other keys leave it as it is. */
export function nudgeRect(rect: Rect, key: string, far: boolean): Rect {
  const step = Object.hasOwn(STEP, key) ? STEP[key] : undefined;
  if (!step) return { ...rect };
  const by = far ? NUDGE_FAR : NUDGE;
  return { ...rect, x: rect.x + step.x * by, y: rect.y + step.y * by };
}
