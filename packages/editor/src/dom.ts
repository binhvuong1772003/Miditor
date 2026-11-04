// Checks that hold for an element of any document. `instanceof HTMLElement` is false for an element of the
// frame the page is drawn in, since the frame has its own `HTMLElement`; these look at what the node is.

export const isElement = (value: unknown): value is Element =>
  typeof value === "object" && value !== null && (value as Node).nodeType === 1;

export const isHtmlElement = (value: unknown): value is HTMLElement =>
  isElement(value) && typeof (value as HTMLElement).dataset === "object";

export const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && typeof (value as Node).nodeType === "number";
