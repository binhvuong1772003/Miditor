/**
 * The block to select next when blocks lie over each other at one point. `stack` is what is at the
 * point, the topmost first, each block once. With nothing selected, or a selected block that is not
 * in the stack, it is the topmost. Otherwise it is the one just under the selected block, and under
 * the last one the topmost again, so repeated presses go through every layer and come back.
 * `undefined` when there is nothing at the point.
 */
export function nextLayer(stack: readonly string[], current: string | null): string | undefined {
  if (stack.length === 0) return undefined;
  const at = current === null ? -1 : stack.indexOf(current);
  return stack[(at + 1) % stack.length];
}
