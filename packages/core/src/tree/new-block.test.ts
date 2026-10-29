import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { container } from "../position/arbitraries";
import { resolveRect } from "../position/resolve-rect";
import { freeBoxOf, isFreeNode } from "./free-box";
import { newBlock } from "./new-block";
import { insertNode } from "./nodes";
import { emptyPage, isPageData } from "./page";

describe("newBlock", () => {
  it("is a free Container of 120 by 80 with the given id", () => {
    const block = newBlock("n1");
    expect(block).toMatchObject({ id: "n1", type: "Container", rotation: 0, children: [] });
    expect(isFreeNode(block)).toBe(true);
  });

  it("makes a page that is still valid when it is added to the empty page", () => {
    const page = emptyPage();
    const grown = { ...page, root: insertNode(page.root, "root", newBlock("n1")) };
    expect(grown.root.children).toHaveLength(1);
    expect(isPageData(grown)).toBe(true);
  });

  it("sits in the middle of any container", () => {
    fc.assert(
      fc.property(container, (c) => {
        const rect = resolveRect(freeBoxOf(newBlock("n1")), c);
        expect(rect.w).toBe(120);
        expect(rect.h).toBe(80);
        expect(rect.x + rect.w / 2).toBeCloseTo(c.w / 2);
        expect(rect.y + rect.h / 2).toBeCloseTo(c.h / 2);
      }),
    );
  });

  it("returns a new object each time", () => {
    expect(newBlock("n1")).not.toBe(newBlock("n1"));
    expect(newBlock("n1")).toEqual(newBlock("n1"));
  });
});
