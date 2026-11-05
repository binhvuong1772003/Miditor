import { isHtmlElement } from "../dom";

/**
 * The first block, topmost first, among the elements under a point that `accepts` it: the deepest block
 * under the pointer that may take what is dropped. What may be taken is for the caller to say (a new
 * block, a block that moves), so each keeps its own rules.
 */
export function firstAccepting(
  candidates: Iterable<Element>,
  accepts: (id: string, element: HTMLElement) => boolean,
): { id: string; element: HTMLElement } | undefined {
  for (const element of candidates) {
    if (!isHtmlElement(element)) continue;
    const id = element.dataset.miditorId;
    if (id !== undefined && accepts(id, element)) return { id, element };
  }
  return undefined;
}
