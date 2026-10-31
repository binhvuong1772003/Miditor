import { emptyPage, type PageData } from "@midito-kitchen/core";
import { describe, expect, it } from "vitest";
import { pageMeta } from "./page-meta";

describe("pageMeta", () => {
  it("gives the title, description and picture of a page", () => {
    const data: PageData = {
      ...emptyPage(),
      meta: { title: "Shop", image: "https://x.test/a.png" },
    };
    expect(pageMeta(data)).toEqual({ title: "Shop", image: "https://x.test/a.png" });
  });
  it("is empty for a page without meta, with blank meta, and with meta that is not valid", () => {
    expect(pageMeta(emptyPage())).toEqual({});
    expect(pageMeta({ ...emptyPage(), meta: { title: "  " } })).toEqual({});
    const bad = { ...emptyPage(), meta: { image: "javascript:alert(1)" } } as unknown as PageData;
    expect(pageMeta(bad)).toEqual({});
  });
});
