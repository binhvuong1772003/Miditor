import { describe, expect, it } from "vitest";
import { frameOfElement, pageUnit } from "./frames";

// The unit tests have no DOM: an element is what these functions read of one.
const main = { name: "main" } as unknown as Document;
const frameDoc = { name: "frame" } as unknown as Document;
const el = (
  ownerDocument: Document,
  rect: { left: number; top: number; width: number; height: number },
) =>
  ({
    ownerDocument,
    clientWidth: 300,
    clientHeight: 200,
    getBoundingClientRect: () => rect,
  }) as unknown as HTMLElement;

describe("pageUnit", () => {
  it("is the zoom for a block on the screen, whose rects the zoom scales", () => {
    expect(pageUnit(el(main, { left: 0, top: 0, width: 1, height: 1 }), 0.5, main)).toBe(0.5);
  });
  it("is 1 for a block in the frame of the page, whose rects the zoom does not scale", () => {
    expect(pageUnit(el(frameDoc, { left: 0, top: 0, width: 1, height: 1 }), 0.5, main)).toBe(1);
  });
});

describe("frameOfElement", () => {
  it("is the padding box, the middle of the element in page px and the turn", () => {
    const box = el(main, { left: 100, top: 40, width: 150, height: 100 });
    expect(frameOfElement(box, 0.5, 30)).toEqual({
      size: { w: 300, h: 200 },
      center: { x: (100 + 75) / 0.5, y: (40 + 50) / 0.5 },
      rotation: 30,
    });
  });
});
