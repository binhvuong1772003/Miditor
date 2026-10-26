import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { box } from "./arbitraries";
import { cssFor } from "./css-for";
import type { Axis, FreeBox, Size } from "./types";

const at = (x: Axis, w: Size = { kind: "px", v: 100 }): FreeBox => ({
  x,
  y: { anchor: "start", offset: 0 },
  w,
  h: { kind: "px", v: 50 },
  rotation: 0,
});

describe("cssFor, one case per anchor", () => {
  it("start sets the start edge and the size", () => {
    expect(cssFor(at({ anchor: "start", offset: 20 }))).toMatchObject({
      left: "20px",
      width: "100px",
    });
  });

  it("end sets the end edge and the size", () => {
    const css = cssFor(at({ anchor: "end", offset: 8 }, { kind: "percent", v: 25 }));
    expect(css).toMatchObject({ right: "8px", width: "25%" });
    expect(css.left).toBeUndefined();
  });

  it("center folds the centring into calc() for a px size", () => {
    expect(cssFor(at({ anchor: "center", offset: 12 })).left).toBe("calc(50% - 38px)");
    expect(cssFor(at({ anchor: "center", offset: 60 })).left).toBe("calc(50% + 10px)");
  });

  it("center folds the centring into calc() for a percent size", () => {
    const size: Size = { kind: "percent", v: 20 };
    expect(cssFor(at({ anchor: "center", offset: 12 }, size))).toMatchObject({
      left: "calc(40% + 12px)",
      width: "20%",
    });
    expect(cssFor(at({ anchor: "center", offset: -5 }, size)).left).toBe("calc(40% - 5px)");
  });

  it("stretch sets both edges and no size", () => {
    const css = cssFor(at({ anchor: "stretch", start: 30, end: 50 }, { kind: "px", v: 999 }));
    expect(css).toMatchObject({ left: "30px", right: "50px" });
    expect(css.width).toBeUndefined();
  });

  it("scale sets position and width as percentages and ignores the size", () => {
    const css = cssFor(at({ anchor: "scale", start: 10, size: 25 }, { kind: "px", v: 999 }));
    expect(css).toMatchObject({ left: "10%", width: "25%" });
  });
});

describe("cssFor, the whole box", () => {
  it("writes both axes and nothing else when there is no rotation", () => {
    const css = cssFor({
      x: { anchor: "end", offset: 20 },
      y: { anchor: "start", offset: 40 },
      w: { kind: "px", v: 100 },
      h: { kind: "px", v: 40 },
      rotation: 0,
    });
    expect(css).toEqual({
      position: "absolute",
      boxSizing: "border-box",
      right: "20px",
      width: "100px",
      top: "40px",
      height: "40px",
    });
  });

  it("uses top, bottom and height for the vertical axis", () => {
    const css = cssFor({
      x: { anchor: "start", offset: 0 },
      y: { anchor: "stretch", start: 10, end: 20 },
      w: { kind: "px", v: 100 },
      h: { kind: "px", v: 50 },
      rotation: 0,
    });
    expect(css).toMatchObject({ top: "10px", bottom: "20px" });
    expect(css.height).toBeUndefined();
  });

  it("adds the rotate property only when the rotation is not zero", () => {
    expect(cssFor({ ...at({ anchor: "start", offset: 0 }), rotation: 15 }).rotate).toBe("15deg");
    expect(cssFor({ ...at({ anchor: "start", offset: 0 }), rotation: 0 }).rotate).toBeUndefined();
  });

  it("rounds float noise away", () => {
    // 50 - 33.3 / 2 is 33.349999999999994 in floating point.
    const css = cssFor(at({ anchor: "center", offset: 0 }, { kind: "percent", v: 33.3 }));
    expect(css.left).toBe("calc(33.35% + 0px)");
  });
});

describe("cssFor, properties", () => {
  it("never uses translate or transform, which break react-moveable's handles", () => {
    fc.assert(
      fc.property(box, (b) => {
        const css = cssFor(b);
        return !("translate" in css) && !("transform" in css);
      }),
      { numRuns: 1000 },
    );
  });

  it("only writes string values with units and at most four decimals", () => {
    const value =
      /^(absolute|border-box|-?\d+(\.\d{1,4})?(px|%|deg)|calc\(-?\d+(\.\d{1,4})?% [+-] \d+(\.\d{1,4})?px\))$/;
    fc.assert(
      fc.property(box, (b) => Object.values(cssFor(b)).every((v) => value.test(v))),
      { numRuns: 1000 },
    );
  });

  it("writes exactly the edges and the size that each anchor owns", () => {
    const edges = (a: Axis, names: { start: string; end: string; size: string }) => {
      switch (a.anchor) {
        case "start":
        case "center":
          return [names.start, names.size];
        case "end":
          return [names.end, names.size];
        case "stretch":
          return [names.start, names.end];
        case "scale":
          return [names.start, names.size];
      }
    };
    fc.assert(
      fc.property(box, (b) => {
        const expected = [
          "position",
          "boxSizing",
          ...edges(b.x, { start: "left", end: "right", size: "width" }),
          ...edges(b.y, { start: "top", end: "bottom", size: "height" }),
          ...(b.rotation !== 0 ? ["rotate"] : []),
        ];
        return Object.keys(cssFor(b)).sort().join() === expected.sort().join();
      }),
      { numRuns: 1000 },
    );
  });
});
