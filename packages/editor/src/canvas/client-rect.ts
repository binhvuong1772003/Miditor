import { isNode } from "../dom";
/**
 * Where an element is on the screen of the page that holds the editor. An element of the frame the page is
 * drawn in is measured in the frame, from its own top left, and the frame may be scaled by the zoom: this
 * moves it to where it is on the screen, so it can be put against the panels and the workspace around.
 */
export function clientRect(element: Element): DOMRect {
  const rect = element.getBoundingClientRect();
  const frame = element.ownerDocument.defaultView?.frameElement;
  if (!frame || frame.ownerDocument === element.ownerDocument) return rect;
  const outer = frame.getBoundingClientRect();
  const scale =
    frame instanceof HTMLElement && frame.offsetWidth > 0 ? outer.width / frame.offsetWidth : 1;
  return new DOMRect(
    outer.left + rect.left * scale,
    outer.top + rect.top * scale,
    rect.width * scale,
    rect.height * scale,
  );
}

/** A point of an event on the screen of the page that holds the editor, whichever document it came from. */
export function clientPoint(event: {
  clientX: number;
  clientY: number;
  target: EventTarget | null;
}) {
  const target = event.target;
  const doc = isNode(target)
    ? target.nodeType === 9
      ? (target as Document)
      : target.ownerDocument
    : null;
  const frame = doc?.defaultView?.frameElement;
  if (!frame || frame.ownerDocument === doc) return { x: event.clientX, y: event.clientY };
  const outer = frame.getBoundingClientRect();
  const scale =
    frame instanceof HTMLElement && frame.offsetWidth > 0 ? outer.width / frame.offsetWidth : 1;
  return { x: outer.left + event.clientX * scale, y: outer.top + event.clientY * scale };
}

/** The elements of `doc` at a point of the screen of the page that holds the editor, the topmost first. */
export function elementsAtClient(doc: Document, x: number, y: number): Element[] {
  const frame = doc.defaultView?.frameElement;
  if (!frame || frame.ownerDocument === doc) return doc.elementsFromPoint(x, y);
  const outer = frame.getBoundingClientRect();
  const scale =
    frame instanceof HTMLElement && frame.offsetWidth > 0 ? outer.width / frame.offsetWidth : 1;
  return doc.elementsFromPoint((x - outer.left) / scale, (y - outer.top) / scale);
}

/** The document of the frame the page is drawn in, inside the workspace, or `null` when it is drawn in place. */
export function frameDocumentOf(workspace: Element): Document | null {
  return (
    workspace.querySelector<HTMLIFrameElement>("iframe[title='Page']")?.contentDocument ?? null
  );
}

/**
 * Listens on the window of the page that holds the editor and on the window of the frame the page is drawn
 * in (inside `scope`), since a pointer let go over the frame is told to the frame only. Gives the function
 * that stops listening.
 */
export function onWindows<K extends keyof WindowEventMap>(
  scope: Element | null,
  type: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions,
): () => void {
  const frame = scope?.ownerDocument.defaultView;
  const windows = frame && frame !== window ? [window, frame] : [window];
  for (const target of windows) target.addEventListener(type, handler as EventListener, options);
  return () => {
    for (const target of windows)
      target.removeEventListener(type, handler as EventListener, options);
  };
}
