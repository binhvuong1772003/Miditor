import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  EASINGS,
  ENTER_EFFECTS,
  ENTER_TRIGGERS,
  HOVER_EFFECTS,
  isEffects,
  MAX_DELAY,
  MAX_DURATION,
  MAX_STAGGER,
  MIN_DURATION,
} from "./effects";

const effects = fc.record(
  {
    hover: fc.constantFrom(...HOVER_EFFECTS),
    press: fc.boolean(),
    stagger: fc.integer({ min: 0, max: MAX_STAGGER }),
    enter: fc.record(
      {
        effect: fc.constantFrom(...ENTER_EFFECTS),
        trigger: fc.constantFrom(...ENTER_TRIGGERS),
        duration: fc.integer({ min: MIN_DURATION, max: MAX_DURATION }),
        delay: fc.integer({ min: 0, max: MAX_DELAY }),
        easing: fc.constantFrom(...EASINGS),
      },
      { requiredKeys: ["effect", "trigger"] },
    ),
  },
  { requiredKeys: [] },
);

describe("isEffects", () => {
  it("accepts every motion built from the lists and the ranges, as it comes back from JSON", () => {
    fc.assert(fc.property(effects, (value) => isEffects(JSON.parse(JSON.stringify(value)))));
  });

  it("accepts no motion at all", () => {
    expect(isEffects({})).toBe(true);
  });

  it("refuses a number outside its range or not whole", () => {
    const enter = { effect: "fade", trigger: "load" };
    for (const duration of [MIN_DURATION - 1, MAX_DURATION + 1, 500.5, Number.NaN, "600"]) {
      expect(isEffects({ enter: { ...enter, duration } })).toBe(false);
    }
    for (const delay of [-1, MAX_DELAY + 1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(isEffects({ enter: { ...enter, delay } })).toBe(false);
    }
    for (const stagger of [-1, MAX_STAGGER + 1, 0.5, "50"]) {
      expect(isEffects({ stagger })).toBe(false);
    }
  });

  it("refuses a name that is not on the lists, and CSS in its place", () => {
    expect(isEffects({ hover: "Lift" })).toBe(false);
    expect(isEffects({ hover: "transform: scale(9)" })).toBe(false);
    expect(isEffects({ enter: { effect: "spin", trigger: "load" } })).toBe(false);
    expect(isEffects({ enter: { effect: "fade", trigger: "hover" } })).toBe(false);
    expect(
      isEffects({ enter: { effect: "fade", trigger: "load", easing: "cubic-bezier(0,0,0,0)" } }),
    ).toBe(false);
  });

  it("refuses an entrance without its effect or trigger, an unknown key, and a non-object", () => {
    expect(isEffects({ enter: { effect: "fade" } })).toBe(false);
    expect(isEffects({ enter: { trigger: "load" } })).toBe(false);
    expect(isEffects({ enter: { effect: "fade", trigger: "load", css: "x" } })).toBe(false);
    expect(isEffects({ onClick: "alert(1)" })).toBe(false);
    expect(isEffects({ press: "yes" })).toBe(false);
    expect(isEffects({ hover: undefined })).toBe(false);
    for (const bad of [null, undefined, 1, "lift", [], [{ hover: "lift" }]]) {
      expect(isEffects(bad)).toBe(false);
    }
  });
});
