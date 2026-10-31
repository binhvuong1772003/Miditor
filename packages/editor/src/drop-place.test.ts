import { newBlock, resolveRect } from "@midito-kitchen/core";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { localPoint, placeAt } from "./drop-place";

const container = { w: 800, h: 600 };
const block = newBlock("a", container, { w: 160, h: 44 });

describe("placeAt", () => {
  it("keeps a block that fits inside the container, whatever the point", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -500, max: 1500 }),
        fc.integer({ min: -500, max: 1500 }),
        (x, y) => {
          const placed = placeAt(block, container, { x, y });
          const rect = resolveRect(
            {
              x: placed.position.x,
              y: placed.position.y,
              w: placed.size.w,
              h: placed.size.h,
              rotation: placed.rotation,
            },
            container,
          );
          return (
            rect.x >= 0 &&
            rect.y >= 0 &&
            rect.x + rect.w <= container.w + 1 &&
            rect.y + rect.h <= container.h + 1 &&
            rect.w === 160 &&
            rect.h === 44
          );
        },
      ),
    );
  });

  it("is centred on the point when there is room", () => {
    const placed = placeAt(block, container, { x: 300, y: 200 });
    const rect = resolveRect(
      {
        x: placed.position.x,
        y: placed.position.y,
        w: placed.size.w,
        h: placed.size.h,
        rotation: placed.rotation,
      },
      container,
    );
    expect(rect.x + rect.w / 2).toBeCloseTo(300, 0);
    expect(rect.y + rect.h / 2).toBeCloseTo(200, 0);
  });

  it("does not change the kind of the block or its id", () => {
    const placed = placeAt(block, container, { x: 10, y: 10 });
    expect(placed.id).toBe("a");
    expect(placed.type).toBe(block.type);
  });
});

describe("localPoint", () => {
  it("is the pointer inside the element at 100%", () => {
    const box = { left: 100, top: 50, clientLeft: 0, clientTop: 0 };
    expect(localPoint({ x: 160, y: 90 }, box, 1)).toEqual({ x: 60, y: 40 });
  });
  it("divides by the zoom and leaves out the border", () => {
    const box = { left: 100, top: 50, clientLeft: 1, clientTop: 1 };
    expect(localPoint({ x: 200, y: 150 }, box, 0.5)).toEqual({ x: 199, y: 199 });
    expect(localPoint({ x: 200, y: 150 }, box, 2)).toEqual({ x: 49, y: 49 });
  });
});
