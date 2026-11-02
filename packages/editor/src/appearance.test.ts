import { describe, expect, it } from "vitest";
import { appearanceVariables, schemeOf } from "./appearance";

describe("appearanceVariables", () => {
  it("is empty without an appearance", () => {
    expect(appearanceVariables(undefined)).toEqual({});
    expect(appearanceVariables({})).toEqual({});
  });

  it("turns colours and the other fields into the public variables", () => {
    expect(
      appearanceVariables({
        colors: { chrome: "#111", borderInput: " #222 ", onAccent: "white" },
        radius: "2px",
        radiusCard: "4px",
        control: "2rem",
        font: "Lora, serif",
      }),
    ).toEqual({
      "--miditor-chrome": "#111",
      "--miditor-border-input": "#222",
      "--miditor-on-accent": "white",
      "--miditor-radius": "2px",
      "--miditor-radius-card": "4px",
      "--miditor-control": "2rem",
      "--miditor-font": "Lora, serif",
    });
  });

  it("leaves out a value that is empty, long or would end a rule, and a colour it does not know", () => {
    const colors = {
      chrome: "",
      workspace: "red; background: url(x)",
      canvas: "x".repeat(201),
      text: "} body {",
      nope: "#000",
      soft: "#eee",
    } as Record<string, string>;
    expect(appearanceVariables({ colors, radius: 4 as unknown as string })).toEqual({
      "--miditor-soft": "#eee",
    });
  });
});

describe("schemeOf", () => {
  it("is dark only when asked for", () => {
    expect(schemeOf({ scheme: "dark" })).toBe("dark");
    expect(schemeOf({ scheme: "light" })).toBe("light");
    expect(schemeOf({ scheme: "blue" as "dark" })).toBe("light");
    expect(schemeOf(undefined)).toBe("light");
  });
});
