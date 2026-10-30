import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { normalizeAngle } from "../styles/angle";
import { box, solidContainer } from "./arbitraries";
import { type Frame, moveBetweenFrames } from "./frames";
import { reparentBox } from "./reparent-box";
import { resolveRect } from "./resolve-rect";
import type { FreeBox } from "./types";

const at = (over: Partial<FreeBox> = {}): FreeBox => ({
  x: { anchor: "start", offset: 0 },
  y: { anchor: "start", offset: 0 },
  w: { kind: "px", v: 40 },
  h: { kind: "px", v: 20 },
  rotation: 0,
  ...over,
});
const frame = (w: number, h: number, cx: number, cy: number, rotation = 0): Frame => ({
  size: { w, h },
  center: { x: cx, y: cy },
  rotation,
});

/** Where a block is in the common space, worked out on its own: centre and turn. */
function worldOf(b: FreeBox, f: Frame) {
  const rect = resolveRect(b, f.size);
  const lx = rect.x + rect.w / 2 - f.size.w / 2;
  const ly = rect.y + rect.h / 2 - f.size.h / 2;
  const a = (f.rotation * Math.PI) / 180;
  return {
    x: f.center.x + lx * Math.cos(a) - ly * Math.sin(a),
    y: f.center.y + lx * Math.sin(a) + ly * Math.cos(a),
    w: rect.w,
    h: rect.h,
    rotation: normalizeAngle(b.rotation + f.rotation),
  };
}

describe("moveBetweenFrames", () => {
  it("carries a block out of a parent turned a quarter and keeps it where it is", () => {
    // The parent is 200 x 100 with its middle at (500, 300), turned 90 degrees. The block is at its
    // top left corner. Its middle is (-80, -40) from the parent's middle, which turned is (40, -80).
    const out = moveBetweenFrames(at(), frame(200, 100, 500, 300, 90), frame(800, 600, 400, 300));
    expect(resolveRect(out, { w: 800, h: 600 })).toMatchObject({ x: 520, y: 210, w: 40, h: 20 });
    expect(out.rotation).toBe(90);
  });

  it("carries a block into a turned parent and turns it back by the parent's turn", () => {
    const out = moveBetweenFrames(
      at({
        x: { anchor: "start", offset: 520 },
        y: { anchor: "start", offset: 210 },
        rotation: 90,
      }),
      frame(800, 600, 400, 300),
      frame(200, 100, 500, 300, 90),
    );
    expect(out.rotation).toBe(0);
    // The block's middle at (540, 220) is (40, -80) from the parent's middle, (-80, -40) turned back.
    expect(resolveRect(out, { w: 200, h: 100 })).toMatchObject({ x: 0, y: 0, w: 40, h: 20 });
  });

  it("adds the turns of both frames to the block's own", () => {
    const out = moveBetweenFrames(
      at({ rotation: 30 }),
      frame(100, 100, 50, 50, 20),
      frame(100, 100, 50, 50, -40),
    );
    expect(out.rotation).toBe(90);
  });

  it("keeps the rotation in the stored range", () => {
    const out = moveBetweenFrames(
      at({ rotation: 170 }),
      frame(100, 100, 50, 50, 50),
      frame(100, 100, 50, 50, 0),
    );
    expect(out.rotation).toBe(-140);
  });

  it("is reparentBox when neither frame is turned", () => {
    fc.assert(
      fc.property(
        box,
        solidContainer,
        solidContainer,
        fc.integer({ min: -300, max: 300 }),
        fc.integer({ min: -300, max: 300 }),
        (b, from, to, sx, sy) => {
          const viaFrames = moveBetweenFrames(
            b,
            frame(from.w, from.h, from.w / 2, from.h / 2),
            frame(to.w, to.h, sx + to.w / 2, sy + to.h / 2),
          );
          const direct = reparentBox(b, from, to, { x: sx, y: sy });
          const a = resolveRect(viaFrames, to);
          const d = resolveRect(direct, to);
          expect(a.x).toBeCloseTo(d.x, 1);
          expect(a.y).toBeCloseTo(d.y, 1);
          expect(a.w).toBeCloseTo(d.w, 1);
          expect(a.h).toBeCloseTo(d.h, 1);
          expect(viaFrames.rotation).toBe(normalizeAngle(direct.rotation));
        },
      ),
    );
  });

  /** How far apart two angles are, going round the circle, so 180 and -179.99 are close. */
  const apart = (a: number, b: number) => Math.abs(normalizeAngle(a - b));
  const turned = fc.integer({ min: -180, max: 180 });
  const place = fc.integer({ min: -500, max: 1500 });

  it("keeps the block where it is and as turned in the common space, whatever the frames", () => {
    fc.assert(
      fc.property(
        box,
        solidContainer,
        solidContainer,
        place,
        place,
        place,
        place,
        turned,
        turned,
        (b, fromSize, toSize, ax, ay, bx, by, ra, rb) => {
          const from = { size: fromSize, center: { x: ax, y: ay }, rotation: ra };
          const to = { size: toSize, center: { x: bx, y: by }, rotation: rb };
          const moved = moveBetweenFrames(b, from, to);
          const before = worldOf(b, from);
          const after = worldOf(moved, to);
          expect(after.x).toBeCloseTo(before.x, 0);
          expect(after.y).toBeCloseTo(before.y, 0);
          expect(after.w).toBeCloseTo(before.w, 1);
          expect(after.h).toBeCloseTo(before.h, 1);
          expect(apart(after.rotation, before.rotation)).toBeLessThan(0.05);
        },
      ),
    );
  });

  it("gives the same box back after going to another frame and back", () => {
    fc.assert(
      fc.property(
        box,
        solidContainer,
        solidContainer,
        place,
        place,
        place,
        place,
        turned,
        turned,
        (b, fromSize, toSize, ax, ay, bx, by, ra, rb) => {
          const from = { size: fromSize, center: { x: ax, y: ay }, rotation: ra };
          const to = { size: toSize, center: { x: bx, y: by }, rotation: rb };
          const back = moveBetweenFrames(moveBetweenFrames(b, from, to), to, from);
          const was = resolveRect(b, fromSize);
          const now = resolveRect(back, fromSize);
          expect(now.x).toBeCloseTo(was.x, 0);
          expect(now.y).toBeCloseTo(was.y, 0);
          expect(now.w).toBeCloseTo(was.w, 1);
          expect(now.h).toBeCloseTo(was.h, 1);
          expect(apart(back.rotation, b.rotation)).toBeLessThan(0.05);
        },
      ),
    );
  });
});
