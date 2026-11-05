import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { solidContainer } from "../position/arbitraries";
import { resolveRect } from "../position/resolve-rect";
import { freeBoxOf, isFreeNode } from "./free-box";
import { NEW_BLOCK_SIZE, newBlock } from "./new-block";
import { insertNode } from "./nodes";
import { emptyPage, isPageData } from "./page";

const page = { w: 960, h: 640 };

describe("newBlock", () => {
  it("is a free Container with the given id, scaled across and pinned to the start down", () => {
    const block = newBlock("n1", page);
    expect(block).toMatchObject({ id: "n1", type: "Container", rotation: 0, children: [] });
    expect(isFreeNode(block)).toBe(true);
    expect(block.position.x).toEqual({ anchor: "scale", start: 37.5, size: 25 });
    expect(block.position.y).toEqual({ anchor: "start", offset: 280 });
  });

  it("makes a page that is still valid when it is added to the empty page", () => {
    const empty = emptyPage();
    const grown = { ...empty, root: insertNode(empty.root, "root", newBlock("n1", page)) };
    expect(grown.root.children).toHaveLength(1);
    expect(isPageData(grown)).toBe(true);
  });

  it("sits in the middle of the container and keeps its height", () => {
    fc.assert(
      fc.property(solidContainer, (c) => {
        const rect = resolveRect(freeBoxOf(newBlock("n1", c)), c);
        expect(rect.w).toBeCloseTo((c.w * NEW_BLOCK_SIZE.widthPercent) / 100);
        expect(rect.h).toBe(NEW_BLOCK_SIZE.h);
        expect(rect.x + rect.w / 2).toBeCloseTo(c.w / 2);
        // Down the page the middle is found to the pixel; a container shorter than the block starts at 0.
        if (c.h >= NEW_BLOCK_SIZE.h)
          expect(Math.abs(rect.y + rect.h / 2 - c.h / 2)).toBeLessThanOrEqual(0.5);
        else expect(rect.y).toBe(0);
      }),
    );
  });

  it("stays on screen when the page gets narrower", () => {
    const rect = resolveRect(freeBoxOf(newBlock("n1", page)), { w: 375, h: 640 });
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.w).toBeLessThanOrEqual(375);
  });

  it("with a size, has exactly that size and sits in the middle across, on the page it is added to", () => {
    fc.assert(
      fc.property(solidContainer, (c) => {
        const block = newBlock("n1", c, { w: 90, h: 70 });
        const rect = resolveRect(freeBoxOf(block), c);
        expect(rect.w).toBeCloseTo(90);
        expect(rect.h).toBe(70);
        expect(rect.x + rect.w / 2).toBeCloseTo(c.w / 2);
        if (c.h >= 70) expect(Math.abs(rect.y + rect.h / 2 - c.h / 2)).toBeLessThanOrEqual(0.5);
        else expect(rect.y).toBe(0);
      }),
    );
  });

  it("with a size, scales across with the page and keeps its height", () => {
    const block = newBlock("n1", page, { w: 240, h: 60 });
    expect(block.position.x).toEqual({ anchor: "scale", start: 37.5, size: 25 });
    const narrow = resolveRect(freeBoxOf(block), { w: 480, h: 640 });
    expect(narrow.w).toBeCloseTo(120);
    expect(narrow.x + narrow.w / 2).toBeCloseTo(240);
    expect(narrow.h).toBe(60);
  });

  it("with a size on a container with no width, keeps the size in px, centred", () => {
    const block = newBlock("n1", { w: 0, h: 640 }, { w: 90, h: 70 });
    expect(block.position.x).toEqual({ anchor: "center", offset: 0 });
    expect(block.size.w).toEqual({ kind: "px", v: 90 });
  });

  it("ignores a size that is not finite or not above 0", () => {
    const plain = newBlock("n1", page);
    for (const size of [
      { w: 0, h: 10 },
      { w: 10, h: -1 },
      { w: Number.NaN, h: 10 },
      { w: 10, h: Number.POSITIVE_INFINITY },
      { w: Number.POSITIVE_INFINITY, h: 10 },
      { w: 10, h: Number.NaN },
    ]) {
      expect(newBlock("n1", page, size)).toEqual(plain);
    }
  });

  it("returns a new object each time", () => {
    expect(newBlock("n1", page)).not.toBe(newBlock("n1", page));
    expect(newBlock("n1", page)).toEqual(newBlock("n1", page));
  });
});
