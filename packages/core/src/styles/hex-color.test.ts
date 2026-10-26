import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isHexColor, parseHexColor } from "./hex-color";

const DIGITS = [..."0123456789abcdefABCDEF"];
const digits = (n: number) =>
  fc.array(fc.constantFrom(...DIGITS), { minLength: n, maxLength: n }).map((a) => a.join(""));
const spaces = fc.constantFrom("", " ", "  ", "\t", "\n", " \n ");

describe("isHexColor", () => {
  it("accepts the stored form only", () => {
    for (const ok of ["#000000", "#ffffff", "#d5dae3", "#0a1b2c"])
      expect(isHexColor(ok)).toBe(true);
  });

  it("refuses everything else, including what parseHexColor would accept", () => {
    for (const bad of [
      "#FFFFFF",
      "#fff",
      "ffffff",
      "#ffffffff",
      "#fffffg",
      "#ffffff ",
      " #ffffff",
      "#ffffff\n",
      "",
      "#",
      "red",
      "rgb(0,0,0)",
      "url(x)",
      "#fff;position:fixed",
      "#ffffff;",
    ]) {
      expect(isHexColor(bad)).toBe(false);
    }
  });

  it("refuses values that are not strings", () => {
    for (const bad of [undefined, null, 0xffffff, {}, [], ["#ffffff"], true]) {
      expect(isHexColor(bad)).toBe(false);
    }
  });
});

describe("parseHexColor", () => {
  it("returns the stored form of a six digit colour", () => {
    expect(parseHexColor("#d5dae3")).toBe("#d5dae3");
    expect(parseHexColor("#D5DAE3")).toBe("#d5dae3");
    expect(parseHexColor("d5dae3")).toBe("#d5dae3");
    expect(parseHexColor("  #d5dae3  ")).toBe("#d5dae3");
  });

  it("expands a three digit colour", () => {
    expect(parseHexColor("#abc")).toBe("#aabbcc");
    expect(parseHexColor("F0a")).toBe("#ff00aa");
    expect(parseHexColor("#000")).toBe("#000000");
  });

  it("refuses what is not a colour", () => {
    for (const bad of [
      "",
      " ",
      "#",
      "#12",
      "#1234",
      "#12345",
      "#1234567",
      "#12345678",
      "#fffffg",
      "##fff",
      "# fff",
      "ff ff ff",
      "red",
      "rgb(1,2,3)",
      "#fff;color:red",
      "url(x)",
      "#ﬀﬀﬀ",
    ]) {
      expect(parseHexColor(bad)).toBeUndefined();
    }
  });
});

describe("hex colours, properties", () => {
  it("every spelling of six digits gives the same stored colour", () => {
    fc.assert(
      fc.property(digits(6), fc.boolean(), spaces, spaces, (six, hash, before, after) => {
        const out = parseHexColor(`${before}${hash ? "#" : ""}${six}${after}`);
        return out === `#${six.toLowerCase()}` && isHexColor(out);
      }),
      { numRuns: 1000 },
    );
  });

  it("every spelling of three digits expands to the same stored colour", () => {
    fc.assert(
      fc.property(digits(3), fc.boolean(), spaces, spaces, (three, hash, before, after) => {
        const [r, g, b] = three.toLowerCase();
        const out = parseHexColor(`${before}${hash ? "#" : ""}${three}${after}`);
        return out === `#${r}${r}${g}${g}${b}${b}` && isHexColor(out);
      }),
      { numRuns: 1000 },
    );
  });

  it("a stored colour parses to itself, and parsing twice changes nothing", () => {
    fc.assert(
      fc.property(digits(6), (six) => {
        const stored = parseHexColor(six) as string;
        return parseHexColor(stored) === stored;
      }),
    );
  });

  it("for any text, the result is either nothing or a stored colour", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 12 }), (text) => {
        const out = parseHexColor(text);
        return out === undefined || isHexColor(out);
      }),
      { numRuns: 2000 },
    );
  });

  it("refuses six digits with one more character before or after them", () => {
    fc.assert(
      fc.property(digits(6), fc.constantFrom("0", "f", "g", ";", ")", "x", "-"), (six, extra) => {
        return (
          parseHexColor(`${six}${extra}`) === undefined &&
          parseHexColor(`${extra}${six}`) === undefined
        );
      }),
    );
  });
});
