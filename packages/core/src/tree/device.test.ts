import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { box, solidContainer } from "../position/arbitraries";
import { resolveRect } from "../position/resolve-rect";
import { shrinkBox } from "../position/shrink-box";
import type { FreeBox } from "../position/types";
import { boxFor, DEVICE_WIDTH, PHONE_RATIO } from "./device";
import { freeBoxOf, withFreeBox } from "./free-box";
import type { FreeNode } from "./types";

const base: FreeBox = {
  x: { anchor: "start", offset: 96 },
  y: { anchor: "end", offset: 48 },
  w: { kind: "px", v: 480 },
  h: { kind: "percent", v: 20 },
  rotation: 15,
};
const nodeWith = (b: FreeBox, phone?: FreeBox): FreeNode => {
  const node = withFreeBox(
    {
      id: "a",
      type: "Shape",
      props: {},
      styles: {},
      position: { mode: "free", x: b.x, y: b.y },
      size: { w: b.w, h: b.h },
      rotation: b.rotation,
      children: [],
    },
    b,
  );
  return phone ? { ...node, phone } : node;
};

describe("DEVICE_WIDTH and PHONE_RATIO", () => {
  it("are the two page widths and the ratio between them", () => {
    expect(DEVICE_WIDTH).toEqual({ desktop: 960, phone: 375 });
    expect(PHONE_RATIO).toBe(375 / 960);
  });
});

describe("boxFor", () => {
  it("on the desktop is the placement of the node, even when it has a phone one", () => {
    const phone = { ...base, rotation: -90 };
    expect(boxFor(nodeWith(base), "desktop")).toEqual(base);
    expect(boxFor(nodeWith(base, phone), "desktop")).toEqual(base);
  });

  it("on a phone is the one set by hand when there is one", () => {
    const phone: FreeBox = { ...base, x: { anchor: "start", offset: 5 }, rotation: -90 };
    expect(boxFor(nodeWith(base, phone), "phone")).toBe(phone);
  });

  it("on a phone is the desktop one made smaller when nobody set one", () => {
    expect(boxFor(nodeWith(base), "phone")).toEqual(shrinkBox(base, PHONE_RATIO));
    expect(boxFor(nodeWith(base), "phone").x).toEqual({ anchor: "start", offset: 37.5 });
  });

  it("puts a block on a phone in the same relative place as on the desktop", () => {
    fc.assert(
      fc.property(box, solidContainer, (b, c) => {
        const node = nodeWith(b);
        const desktop = resolveRect(boxFor(node, "desktop"), c);
        const phone = resolveRect(boxFor(node, "phone"), {
          w: c.w * PHONE_RATIO,
          h: c.h * PHONE_RATIO,
        });
        for (const key of ["x", "y", "w", "h"] as const) {
          expect(Math.abs(phone[key] - desktop[key] * PHONE_RATIO)).toBeLessThan(0.05);
        }
        // The desktop placement is the node's, unchanged.
        expect(boxFor(node, "desktop")).toEqual(freeBoxOf(node));
      }),
    );
  });
});
