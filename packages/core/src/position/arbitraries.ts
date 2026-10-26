// Shared fast-check generators for the position tests. Not exported from the package.
import fc from "fast-check";
import type { Axis, FreeBox, Size } from "./types";

export const num = (lo: number, hi: number) =>
  fc.double({ min: lo, max: hi, noNaN: true, noDefaultInfinity: true });

export const container = fc.record({ w: num(0, 1600), h: num(0, 1200) });

export const axis: fc.Arbitrary<Axis> = fc.oneof(
  num(-100, 200).map((offset): Axis => ({ anchor: "start", offset })),
  num(-100, 200).map((offset): Axis => ({ anchor: "end", offset })),
  num(-100, 100).map((offset): Axis => ({ anchor: "center", offset })),
  fc
    .tuple(num(0, 800), num(0, 800))
    .map(([start, end]): Axis => ({ anchor: "stretch", start, end })),
  fc
    .tuple(num(0, 40), num(10, 50))
    .map(([start, size]): Axis => ({ anchor: "scale", start, size })),
);

export const size: fc.Arbitrary<Size> = fc.oneof(
  num(10, 200).map((v): Size => ({ kind: "px", v })),
  num(5, 40).map((v): Size => ({ kind: "percent", v })),
);

export const box: fc.Arbitrary<FreeBox> = fc.record({
  x: axis,
  y: axis,
  w: size,
  h: size,
  rotation: num(-180, 180),
});
