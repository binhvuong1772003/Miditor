import { describe, expect, it } from "vitest";
import { emptyPage } from "./page";
import { PHONE_PAGE_MIN_HEIGHT, PHONE_PAGE_PADDING, phonePageHeight } from "./phone-height";
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
  const placedAt = (y: number) =>
    block("a", {
      phone: {
        x: { anchor: "start", offset: 0 },
        y: { anchor: "start", offset: y },
        w: { kind: "px", v: 100 },
        h: { kind: "px", v: 100 },
        rotation: 0,
      },
    });

  it("is a phone screen for a page with no blocks", () => {
    expect(phonePageHeight(pageWith())).toBe(PHONE_PAGE_MIN_HEIGHT);
  });

  it("is a phone screen when the blocks sit well above it", () => {
    // 600 px of desktop is 600 * 375 / 960 = 234.375 px on the phone: far from the bottom of 812.
    const tall = block("a", { size: { w: { kind: "px", v: 600 }, h: { kind: "px", v: 600 } } });
    expect(phonePageHeight(pageWith(tall))).toBe(PHONE_PAGE_MIN_HEIGHT);
  });

  it("holds the lowest block as it is placed on the phone, with a gap, when that is taller", () => {
    // The block ends at 1100 on the phone: 1100 and the gap.
    expect(phonePageHeight(pageWith(placedAt(1000)))).toBe(1100 + PHONE_PAGE_PADDING);
    expect(phonePageHeight(pageWith(placedAt(700)))).toBe(800 + PHONE_PAGE_PADDING);
  });

  it("holds a block that hangs from the bottom edge", () => {
    const hanging = block("a", {
      position: {
        mode: "free",
        x: { anchor: "start", offset: 0 },
        y: { anchor: "end", offset: 20 },
      },
    });
    expect(phonePageHeight(pageWith(hanging))).toBe(PHONE_PAGE_MIN_HEIGHT);
  });
});
