import { describe, expect, it } from "vitest";
import { emptyPage, isPageData } from "../tree/page";
import { isPageMeta, MAX_DESCRIPTION, MAX_TITLE, tidyMeta } from "./page-meta";

describe("isPageMeta", () => {
  it("accepts any mix of title, description and a safe picture, and nothing at all", () => {
    expect(isPageMeta({})).toBe(true);
    expect(isPageMeta({ title: "Hi", description: "A page", image: "https://x.test/a.png" })).toBe(
      true,
    );
    expect(isPageMeta({ title: "t".repeat(MAX_TITLE) })).toBe(true);
  });
  it("refuses long text, control characters, unsafe pictures, other keys and non-objects", () => {
    expect(isPageMeta({ title: "t".repeat(MAX_TITLE + 1) })).toBe(false);
    expect(isPageMeta({ description: "d".repeat(MAX_DESCRIPTION + 1) })).toBe(false);
    expect(isPageMeta({ title: "a\nb" })).toBe(false);
    expect(isPageMeta({ image: "javascript:alert(1)" })).toBe(false);
    expect(isPageMeta({ title: 5 })).toBe(false);
    expect(isPageMeta({ html: "<script>" })).toBe(false);
    for (const bad of [null, undefined, "x", [], [{ title: "a" }]])
      expect(isPageMeta(bad)).toBe(false);
  });
});

describe("tidyMeta", () => {
  it("drops empty and blank fields, trims, and gives undefined when nothing is left", () => {
    expect(tidyMeta({ title: "  Hi  ", description: "  " })).toEqual({ title: "Hi" });
    expect(tidyMeta({ title: "", image: "" })).toBeUndefined();
  });
});

describe("a page with meta", () => {
  it("is valid, and a bad meta makes the page invalid", () => {
    const page = emptyPage();
    expect(isPageData({ ...page, meta: { title: "Shop" } })).toBe(true);
    expect(isPageData({ ...page, meta: { title: 3 } })).toBe(false);
    expect(isPageData({ ...page, meta: null })).toBe(false);
  });
});
