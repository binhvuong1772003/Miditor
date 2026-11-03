import { describe, expect, it } from "vitest";
import { MIN_PAGE_HEIGHT } from "../styles/page-height";
import { emptyPage } from "./page";
import { PHONE_PAGE_PADDING, phonePageHeight } from "./phone-height";
import type { FreeNode, TreeNode } from "./types";

const block = (id: string, patch: Partial<FreeNode> = {}): FreeNode => ({
  id,
  type: "Container",
  props: {},
  styles: {},
  children: [],
  position: { mode: "free", x: { anchor: "start", offset: 0 }, y: { anchor: "start", offset: 0 } },
  size: { w: { kind: "px", v: 100 }, h: { kind: "px", v: 100 } },
  rotation: 0,
  ...patch,
});

const pageWith = (...children: TreeNode[]): TreeNode => ({ ...emptyPage().root, children });

describe("phonePageHeight", () => {
  it("is the shortest page for a page with no blocks", () => {
    expect(phonePageHeight(pageWith())).toBe(MIN_PAGE_HEIGHT);
  });

  it("holds the lowest block as it is placed on the phone, with a gap", () => {
    // 600 px of desktop is 600 * 375 / 960 = 234.375 px on the phone, rounded to 0.01.
    const tall = block("a", { size: { w: { kind: "px", v: 600 }, h: { kind: "px", v: 600 } } });
    expect(phonePageHeight(pageWith(tall))).toBe(Math.ceil(234.38) + PHONE_PAGE_PADDING);
  });

  it("uses the phone placement a person set by hand", () => {
    const set = block("a", {
      phone: {
        x: { anchor: "start", offset: 0 },
        y: { anchor: "start", offset: 700 },
        w: { kind: "px", v: 100 },
        h: { kind: "px", v: 100 },
        rotation: 0,
      },
    });
    expect(phonePageHeight(pageWith(set))).toBe(800 + PHONE_PAGE_PADDING);
  });

  it("holds a block that hangs from the bottom edge", () => {
    const hanging = block("a", {
      position: { mode: "free", x: { anchor: "start", offset: 0 }, y: { anchor: "end", offset: 20 } },
    });
    // 100 px of height shrinks to 39.06, 20 px of offset to 7.81: the page needs 46.87, so the shortest page.
    expect(phonePageHeight(pageWith(hanging))).toBe(MIN_PAGE_HEIGHT + PHONE_PAGE_PADDING);
  });
});
