/**
 * The block that Tab or Shift+Tab selects next among the blocks of one level, in the order they are
 * stacked, `order`. With nothing selected (or a selected block that is not in the list) Tab takes the
 * first and Shift+Tab the last. At the end of the list `null` is given: the key goes on to the next
 * control of the page, so the canvas is never a place the keyboard cannot leave. `undefined` for a
 * level with no blocks.
 */
export function stepSelection(
  order: readonly string[],
  current: string | null,
  backward: boolean,
): string | null | undefined {
  if (order.length === 0) return undefined;
  const at = current === null ? -1 : order.indexOf(current);
  if (at < 0) return (backward ? order[order.length - 1] : order[0]) ?? undefined;
  const next = at + (backward ? -1 : 1);
  return order[next] ?? null;
}
