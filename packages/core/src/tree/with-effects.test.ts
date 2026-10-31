import { describe, expect, it } from "vitest";
import { emptyPage, isPageData } from "./page";
import { withEffects } from "./with-effects";

const node = () => emptyPage().root;

describe("withEffects", () => {
  it("sets the motion of a node", () => {
    const next = withEffects(node(), { hover: "lift", press: true });
    expect(next.effects).toEqual({ hover: "lift", press: true });
  });

  it("removes the key for an empty motion or undefined, and returns the same node when none was set", () => {
    const base = node();
    expect(withEffects(base, undefined)).toBe(base);
    expect(withEffects(base, {})).toBe(base);
    const set = withEffects(base, { hover: "grow" });
    const cleared = withEffects(set, {});
    expect("effects" in cleared).toBe(false);
    expect("effects" in withEffects(set, undefined)).toBe(false);
  });

  it("returns the very same node when nothing changes", () => {
    const set = withEffects(node(), { enter: { effect: "fade", trigger: "scroll", delay: 100 } });
    expect(withEffects(set, { enter: { effect: "fade", trigger: "scroll", delay: 100 } })).toBe(
      set,
    );
  });
});

describe("a page with motion", () => {
  it("is valid, and so is one saved before motion existed", () => {
    const page = emptyPage();
    expect(isPageData(page)).toBe(true);
    const root = withEffects(page.root, { hover: "glow", stagger: 80 });
    expect(isPageData({ ...page, root })).toBe(true);
  });

  it("is refused when the motion is not one the types allow", () => {
    const page = emptyPage();
    expect(isPageData({ ...page, root: { ...page.root, effects: { hover: "spin" } } })).toBe(false);
    expect(isPageData({ ...page, root: { ...page.root, effects: null } })).toBe(false);
  });
});
