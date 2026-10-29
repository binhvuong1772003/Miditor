// @vitest-environment node
import { readFileSync } from "node:fs";
import { DEVICE_WIDTH } from "@midito-kitchen/core";
import { describe, expect, it } from "vitest";
import { pageWidthVariables } from "./page-width";

describe("pageWidthVariables", () => {
  it("carries the width of each screen from DEVICE_WIDTH", () => {
    expect(pageWidthVariables).toEqual({
      "--_page-desktop": `${DEVICE_WIDTH.desktop}px`,
      "--_page-phone": `${DEVICE_WIDTH.phone}px`,
    });
  });

  it("is what the style sheet uses for the width of the page, with no number of its own", () => {
    const css = readFileSync(new URL("./Editor.module.css", import.meta.url), "utf8");
    expect(css).toContain("max-inline-size: var(--_page-desktop)");
    expect(css).toContain("max-inline-size: var(--_page-phone)");
    expect(css).not.toMatch(/\b60rem\b|\b23\.4375rem\b|\b960px\b|\b375px\b/);
  });
});
