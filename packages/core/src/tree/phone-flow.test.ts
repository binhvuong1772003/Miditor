import { describe, expect, it } from "vitest";
import { emptyPage } from "./page";
import { isPhoneAuto, phoneFlowOf, phoneTextSize } from "./phone-flow";
import type { FreeNode, TreeNode } from "./types";

const at = (
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  extra: Partial<FreeNode> = {},
) =>
  ({
    id,
    type: "Container",
    props: {},
    styles: {},
    children: [],
    position: {
      mode: "free",
      x: { anchor: "start", offset: x },
      y: { anchor: "start", offset: y },
    },
    size: { w: { kind: "px", v: w }, h: { kind: "px", v: h } },
    rotation: 0,
    ...extra,
  }) as FreeNode;

const page = (...children: TreeNode[]): TreeNode => ({ ...emptyPage().root, children });
const size = { w: 960, h: 1600 };

describe("isPhoneAuto", () => {
  it("is true when no node has a placement for the phone", () => {
    expect(isPhoneAuto(page(at("a", 0, 0, 10, 10)))).toBe(true);
    expect(isPhoneAuto(page())).toBe(true);
  });

  it("is false when any node has one, however deep", () => {
    const phone = {
      x: { anchor: "start", offset: 0 },
      y: { anchor: "start", offset: 0 },
      w: { kind: "px", v: 10 },
      h: { kind: "px", v: 10 },
      rotation: 0,
    } as const;
    const inner = at("b", 0, 0, 10, 10, { phone });
    expect(isPhoneAuto(page(at("a", 0, 0, 100, 100, { children: [inner] })))).toBe(false);
  });

  it("is not changed by a phone text size or a phone page height", () => {
    const text = at("a", 0, 0, 10, 10, { phoneProps: { size: 12 } });
    expect(isPhoneAuto(page(text))).toBe(true);
  });
});

describe("phoneTextSize", () => {
  it("keeps a small size and takes half of what is over 20", () => {
    expect(phoneTextSize(14)).toBe(14);
    expect(phoneTextSize(20)).toBe(20);
    expect(phoneTextSize(52)).toBe(36);
    expect(phoneTextSize(40)).toBe(30);
  });
});

describe("phoneFlowOf", () => {
  it("orders top to bottom, and left to right inside a band", () => {
    const flow = phoneFlowOf(
      page(
        at("card3", 640, 940, 272, 190),
        at("title", 48, 860, 864, 48),
        at("card1", 48, 940, 272, 190),
        at("card2", 344, 940, 272, 190),
      ),
      size,
    );
    const order = [...flow.entries()].sort((a, b) => a[1].order - b[1].order).map(([id]) => id);
    expect(order).toEqual(["title", "card1", "card2", "card3"]);
  });

  it("puts blocks that overlap vertically in one band, by x", () => {
    const flow = phoneFlowOf(
      page(at("right", 700, 20, 124, 40), at("left", 48, 24, 200, 32)),
      size,
    );
    expect(flow.get("left")?.order).toBe(0);
    expect(flow.get("right")?.order).toBe(1);
  });

  it("calls a small block compact and anything else full width", () => {
    const flow = phoneFlowOf(
      page(
        at("button", 300, 430, 170, 48),
        at("card", 48, 940, 272, 190),
        at("bar", 48, 76, 864, 1),
      ),
      size,
    );
    expect(flow.get("button")?.compact).toBe(true);
    expect(flow.get("card")?.compact).toBe(false);
    expect(flow.get("bar")?.compact).toBe(false);
  });

  it("says which side a block sits on", () => {
    const flow = phoneFlowOf(
      page(at("l", 48, 0, 100, 40), at("c", 430, 100, 100, 40), at("r", 800, 200, 100, 40)),
      size,
    );
    expect(flow.get("l")?.side).toBe("start");
    expect(flow.get("c")?.side).toBe("center");
    expect(flow.get("r")?.side).toBe("end");
  });

  it("leaves blocks that are not free out", () => {
    const flowing = { ...at("f", 0, 0, 10, 10), position: { mode: "flow" } } as unknown as TreeNode;
    expect(phoneFlowOf(page(flowing), size).size).toBe(0);
  });
});
