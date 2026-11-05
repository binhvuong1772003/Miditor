import type { Frame } from "@miditor/core";

/**
 * What a page px is in the rects of a block: `zoom` when the block is on the screen, whose rects the zoom scales,
 * and 1 when it is in the frame of the page, whose own coordinates the zoom does not scale. `main` is the document
 * of the editor, which is what the screen is.
 */
export function pageUnit(
  element: HTMLElement,
  zoom: number,
  main: Document | undefined = typeof document === "undefined" ? undefined : document,
): number {
  return element.ownerDocument === main ? zoom : 1;
}

/**
 * A block as a frame: its padding box, where its middle is (the middle of a turned element is the middle of the
 * box around it) in page px, and how far it and its parents are turned (`rotation`, which the caller knows).
 */
export function frameOfElement(element: HTMLElement, unit: number, rotation: number): Frame {
  const box = element.getBoundingClientRect();
  return {
    size: { w: element.clientWidth, h: element.clientHeight },
    center: { x: (box.left + box.width / 2) / unit, y: (box.top + box.height / 2) / unit },
    rotation,
  };
}
