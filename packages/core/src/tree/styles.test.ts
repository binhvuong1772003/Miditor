import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { freeNode, hexColor } from "../position/arbitraries";
import { findNode, updateNode } from "./nodes";
import { withStyle } from "./styles";
import type { FlowNode, FreeNode, NodeStyles } from "./types";

const flow: FlowNode = {
  id: "box",
  type: "Container",
  props: { label: "x" },
  styles: {},
  position: { mode: "flow" },
  children: [],
};

const free: FreeNode = {
  id: "hero",
  type: "Container",
  props: {},
  styles: { background: "#d5dae3" },
  position: { mode: "free", x: { anchor: "end", offset: 20 }, y: { anchor: "start", offset: 40 } },
  size: { w: { kind: "px", v: 160 }, h: { kind: "px", v: 96 } },
  rotation: 0,
  children: [flow],
};

describe("withStyle", () => {
  it("sets a style on a node that had none", () => {
    const out = withStyle(flow, "background", "#ff0000");
    expect(out.styles).toEqual({ background: "#ff0000" });
    expect(out).not.toBe(flow);
  });

  it("replaces a style that was set", () => {
    expect(withStyle(free, "background", "#00ff00").styles).toEqual({ background: "#00ff00" });
  });

  it("removes the key when the value is undefined, and never stores undefined", () => {
    const out = withStyle(free, "background", undefined);
    expect(out.styles).toEqual({});
    expect("background" in out.styles).toBe(false);
  });

  it("returns the very same node when nothing changes", () => {
    expect(withStyle(free, "background", "#d5dae3")).toBe(free);
    expect(withStyle(flow, "background", undefined)).toBe(flow);
  });

  it("keeps every other part of the node as it was", () => {
    const out = withStyle(free, "background", "#123456");
    expect(out.id).toBe(free.id);
    expect(out.type).toBe(free.type);
    expect(out.props).toBe(free.props);
    expect(out.children).toBe(free.children);
    expect(out.position).toBe(free.position);
    expect(out.size).toBe(free.size);
    expect(out.rotation).toBe(free.rotation);
  });

  it("keeps the kind of node, so a free node stays a free node", () => {
    const out = withStyle(free, "background", "#123456");
    expect(out.position.mode).toBe("free");
    expect(out.size.w).toBe(free.size.w);
  });

  it("does not modify the node it was given", () => {
    const before = structuredClone(free);
    withStyle(free, "background", "#123456");
    withStyle(free, "background", undefined);
    expect(free).toEqual(before);
  });

  it("accepts a deeply frozen node", () => {
    const deepFreeze = <T extends object>(o: T): T => {
      for (const v of Object.values(o)) if (v && typeof v === "object") deepFreeze(v);
      return Object.freeze(o);
    };
    expect(() =>
      withStyle(deepFreeze(structuredClone(free)), "background", "#abcdef"),
    ).not.toThrow();
  });

  it("keeps styles it does not know about, which newer data may carry", () => {
    const future = { ...free, styles: { background: "#aaaaaa", future: "kept" } as NodeStyles };
    const removed = withStyle(future, "background", undefined);
    expect(removed.styles).toEqual({ future: "kept" });
    const replaced = withStyle(future, "background", "#bbbbbb");
    expect(replaced.styles).toEqual({ background: "#bbbbbb", future: "kept" });
  });

  it("lets updateNode give back the same tree when the style is already set", () => {
    const root: FlowNode = { ...flow, children: [free] };
    expect(updateNode(root, "hero", (n) => withStyle(n, "background", "#d5dae3"))).toBe(root);
    const changed = updateNode(root, "hero", (n) => withStyle(n, "background", "#000000"));
    expect(changed).not.toBe(root);
    expect(findNode(changed, "hero")?.styles).toEqual({ background: "#000000" });
  });
});

describe("withStyle, properties", () => {
  it("what was set can be read back, and removing it restores the empty styles", () => {
    fc.assert(
      fc.property(freeNode, hexColor, (n, color) => {
        const set = withStyle(n, "background", color);
        const removed = withStyle(set, "background", undefined);
        return set.styles.background === color && !("background" in removed.styles);
      }),
      { numRuns: 1000 },
    );
  });

  it("never stores an undefined value", () => {
    fc.assert(
      fc.property(freeNode, fc.option(hexColor, { nil: undefined }), (n, color) => {
        const out = withStyle(n, "background", color);
        return Object.values(out.styles).every((value) => value !== undefined);
      }),
      { numRuns: 1000 },
    );
  });

  it("only the styles change", () => {
    fc.assert(
      fc.property(freeNode, hexColor, (n, color) => {
        const out = withStyle(n, "background", color);
        return (
          out.id === n.id &&
          out.type === n.type &&
          out.props === n.props &&
          out.children === n.children &&
          out.position === n.position &&
          out.size === n.size &&
          out.rotation === n.rotation
        );
      }),
    );
  });

  it("setting the same value twice gives the same node the second time", () => {
    fc.assert(
      fc.property(freeNode, hexColor, (n, color) => {
        const once = withStyle(n, "background", color);
        return withStyle(once, "background", color) === once;
      }),
    );
  });
});
