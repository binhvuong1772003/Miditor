import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { DEFAULT_BREAKPOINT, PHONE_VAR, responsiveCss, splitStyles } from "./responsive";

describe("splitStyles", () => {
  it("writes a property that is the same on both screens as it is", () => {
    expect(
      splitStyles({ position: "absolute", left: "10px" }, { position: "absolute", left: "10px" }),
    ).toEqual({
      position: "absolute",
      left: "10px",
    });
  });

  it("writes a property that differs as a choice between two variables", () => {
    expect(splitStyles({ left: "10px" }, { left: "4%" })).toEqual({
      left: "var(--m-left-p, var(--m-left-d))",
      "--m-left-d": "10px",
      "--m-left-p": `var(${PHONE_VAR}) 4%`,
    });
  });

  it("names a variable after the property in kebab case", () => {
    const out = splitStyles(
      { fontSize: "24px", backgroundColor: "#fff" },
      { fontSize: "12px", backgroundColor: "#000" },
    );
    expect(out).toMatchObject({
      fontSize: "var(--m-font-size-p, var(--m-font-size-d))",
      "--m-font-size-d": "24px",
      backgroundColor: "var(--m-background-color-p, var(--m-background-color-d))",
      "--m-background-color-p": `var(${PHONE_VAR}) #000`,
    });
  });

  it("gives the initial value, spelled out, on the screen that does not set a layout property", () => {
    expect(splitStyles({ left: "10px" }, { right: "4px" })).toEqual({
      left: "var(--m-left-p, var(--m-left-d))",
      right: "var(--m-right-p, var(--m-right-d))",
      "--m-left-d": "10px",
      "--m-left-p": `var(${PHONE_VAR}) auto`,
      "--m-right-d": "auto",
      "--m-right-p": `var(${PHONE_VAR}) 4px`,
    });
  });

  it("writes numbers as text, and takes equal numbers and text to be the same", () => {
    expect(splitStyles({ fontWeight: 600 }, { fontWeight: 400 })).toMatchObject({
      "--m-font-weight-d": "600",
    });
    expect(splitStyles({ flexGrow: 1 }, { flexGrow: "1" })).toEqual({ flexGrow: 1 });
  });

  it("keeps the order of the desktop style, then the phone-only keys, then the variables", () => {
    const out = splitStyles(
      { all: "revert", left: "1px", top: "2px" },
      { all: "revert", left: "9px", bottom: "3px" },
    );
    expect(Object.keys(out)).toEqual([
      "all",
      "left",
      "top",
      "bottom",
      "--m-left-d",
      "--m-left-p",
      "--m-top-d",
      "--m-top-p",
      "--m-bottom-d",
      "--m-bottom-p",
    ]);
  });

  it("is empty for two empty styles", () => {
    expect(splitStyles({}, {})).toEqual({});
  });

  it("does not change the styles it is given", () => {
    const desktop = { left: "1px" };
    const phone = { left: "2px" };
    splitStyles(desktop, phone);
    expect(desktop).toEqual({ left: "1px" });
    expect(phone).toEqual({ left: "2px" });
  });

  /** What the browser makes of the result: a `var()` with a fallback, on a phone or not. */
  function resolve(style: Record<string, string | number>, phone: boolean) {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(style)) {
      if (key.startsWith("--")) continue;
      const text = String(value);
      const match = /^var\((--m-[a-z-]+)-p, var\((--m-[a-z-]+)-d\)\)$/.exec(text);
      if (!match) {
        out[key] = text;
        continue;
      }
      const wanted = String(style[`${match[1]}-p`]);
      // `var(--miditor-phone) X` is valid only when the phone variable has a value.
      out[key] = phone ? wanted.replace(`var(${PHONE_VAR}) `, "") : String(style[`${match[2]}-d`]);
    }
    return out;
  }
  const names = ["left", "right", "top", "bottom", "width", "fontSize", "color", "fontWeight"];
  const style = fc.dictionary(
    fc.constantFrom(...names),
    fc.oneof(
      fc.constantFrom("0", "10px", "4%", "auto", "#fff", "#000"),
      fc.integer({ min: 100, max: 900 }),
    ),
  );

  it("gives each screen its own style when the browser picks a variable, for any two styles", () => {
    fc.assert(
      fc.property(style, style, (desktop, phone) => {
        const split = splitStyles(desktop, phone) as Record<string, string | number>;
        const want = (
          side: Record<string, string | number>,
          other: Record<string, string | number>,
        ) =>
          Object.fromEntries(
            Object.keys({ ...desktop, ...phone }).map((key) => [
              key,
              side[key] === undefined
                ? other[key] === undefined
                  ? ""
                  : key === "fontSize" || key === "color" || key === "fontWeight"
                    ? "initial"
                    : "auto"
                : String(side[key]),
            ]),
          );
        expect(resolve(split, false)).toEqual(want(desktop, phone));
        expect(resolve(split, true)).toEqual(want(phone, desktop));
      }),
    );
  });
});

describe("responsiveCss", () => {
  const rule = `:where([data-miditor-render]) > * { ${PHONE_VAR}: ; }`;

  it("switches by the width of the box that holds the page, at 640 px by default", () => {
    expect(DEFAULT_BREAKPOINT).toBe(640);
    expect(responsiveCss()).toBe(`@container (max-width: 640px) { ${rule} }`);
    expect(responsiveCss({})).toBe(responsiveCss());
    expect(responsiveCss({ query: "container" })).toBe(responsiveCss());
  });

  it("can follow the window instead", () => {
    expect(responsiveCss({ query: "viewport" })).toBe(`@media (max-width: 640px) { ${rule} }`);
  });

  it("uses the breakpoint it is given", () => {
    expect(responsiveCss({ breakpoint: 480 })).toContain("(max-width: 480px)");
    expect(responsiveCss({ breakpoint: 1, query: "viewport" })).toContain("(max-width: 1px)");
    expect(responsiveCss({ breakpoint: 10000 })).toContain("(max-width: 10000px)");
  });

  it("uses the default for a breakpoint that is not a whole number of px from 1 to 10000", () => {
    for (const breakpoint of [
      0,
      -5,
      10001,
      480.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      "480" as unknown as number,
    ]) {
      expect(responsiveCss({ breakpoint }), String(breakpoint)).toBe(responsiveCss());
    }
  });

  it("cannot be made to carry anything but a number, or one of the two queries", () => {
    const attack = "480px) { } body { display: none } @media (max-width: 1" as unknown as number;
    expect(responsiveCss({ breakpoint: attack })).toBe(responsiveCss());
    expect(responsiveCss({ query: "x" as "viewport" })).toBe(responsiveCss());
    expect(responsiveCss({ breakpoint: 480, query: "viewport" })).toBe(
      `@media (max-width: 480px) { ${rule} }`,
    );
  });
});

describe("responsiveCss with scale", () => {
  const zoomAt = (css: string, width: number, query: "container" | "media" = "container") => {
    const head = query === "container" ? "@container" : "@media";
    let found: number | undefined;
    for (const match of css.matchAll(
      new RegExp(
        `${head} \\(min-width: (\\d+(?:\\.\\d+)?)px\\) and \\(max-width: (\\d+(?:\\.\\d+)?)px\\) \\{[^{}]*\\{[^{}]*zoom: ([0-9.]+)`,
        "g",
      ),
    )) {
      if (width >= Number(match[1]) && width <= Number(match[2])) found = Number(match[3]);
    }
    return found;
  };

  it("adds nothing when scale is not asked for", () => {
    expect(responsiveCss({})).not.toContain("zoom");
  });

  it("does not zoom at or below the breakpoint, or at or above the width of the desktop page", () => {
    const css = responsiveCss({ scale: true });
    for (const width of [100, 375, 640]) expect(zoomAt(css, width)).toBeUndefined();
    for (const width of [960, 1200, 3000]) expect(zoomAt(css, width)).toBeUndefined();
  });

  it("zooms less as the page gets narrower, never above 1, and never wider than the box", () => {
    const css = responsiveCss({ scale: true });
    let before = 1;
    for (let width = 959; width > 640; width--) {
      const zoom = zoomAt(css, width);
      expect(zoom).toBeDefined();
      expect(zoom as number).toBeLessThanOrEqual(1);
      expect(zoom as number).toBeLessThanOrEqual(before + 1e-9);
      // The page drawn at 960 px wide and zoomed fits the box.
      expect((zoom as number) * 960).toBeLessThanOrEqual(width + 1e-6);
      before = zoom as number;
    }
  });

  it("zooms the box around the page, not the box that is the container", () => {
    expect(responsiveCss({ scale: true })).toContain(
      ":where([data-miditor-render]) > [data-miditor-scale] { zoom:",
    );
  });

  it("follows the breakpoint and a width of the desktop page that the host gives", () => {
    const css = responsiveCss({ scale: { from: 1200 }, breakpoint: 480 });
    expect(zoomAt(css, 480)).toBeUndefined();
    expect(zoomAt(css, 1199)).toBeCloseTo(1184 / 1200, 2);
    expect(zoomAt(css, 1200)).toBeUndefined();
  });

  it("uses media queries for a query on the window", () => {
    const css = responsiveCss({ scale: true, query: "viewport" });
    expect(zoomAt(css, 800, "media")).toBeDefined();
    expect(css).not.toContain("@container");
  });
});
