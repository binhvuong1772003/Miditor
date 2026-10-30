import type { Axis, FlowNode, FreeNode, TreeNode } from "@midito-kitchen/core";
import { cssFor, freeBoxOf } from "@midito-kitchen/core";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { isBuiltIn, nodeStyle } from "./node-style";

const flow = (type: string, id = "n"): FlowNode => ({
  id,
  type,
  props: {},
  styles: {},
  position: { mode: "flow" },
  children: [],
});

const free = (x: Axis, y: Axis = { anchor: "start", offset: 40 }): FreeNode => ({
  id: "f",
  type: "Container",
  props: {},
  styles: {},
  position: { mode: "free", x, y },
  size: { w: { kind: "px", v: 160 }, h: { kind: "percent", v: 20 } },
  rotation: 15,
  children: [],
});

const everyAnchor: Axis[] = [
  { anchor: "start", offset: 10 },
  { anchor: "end", offset: 20 },
  { anchor: "center", offset: 5 },
  { anchor: "stretch", start: 30, end: 50 },
  { anchor: "scale", start: 10, size: 25 },
];

const nodes: TreeNode[] = [
  flow("Page"),
  flow("Container"),
  flow("Mystery"),
  ...everyAnchor.map((a) => free(a)),
];

describe("nodeStyle", () => {
  it("starts with `all` on every node, so it drops the host's rules first", () => {
    for (const node of nodes) {
      for (const isRoot of [false, true]) {
        expect(Object.keys(nodeStyle(node, isRoot))[0]).toBe("all");
      }
      expect(nodeStyle(node, false).all).toBe("revert");
    }
  });

  it("uses `all: initial` on the root, so inherited rules of the host cannot reach the page", () => {
    expect(nodeStyle(flow("Page", "root"), true).all).toBe("initial");
    expect(nodeStyle(flow("Container"), false).all).toBe("revert");
  });

  it("writes the box values right after it, then the type's own values", () => {
    expect(Object.keys(nodeStyle(flow("Container"), false)).slice(0, 8)).toEqual([
      "all",
      "margin",
      "padding",
      "border",
      "boxSizing",
      "transform",
      "display",
      "flexDirection",
    ]);
  });

  it("writes `transform: none`, never `revert`, so a drag library can append to it", () => {
    for (const node of nodes) expect(nodeStyle(node, false).transform).toBe("none");
  });

  it("always sets display explicitly, because `all: revert` resets it", () => {
    for (const node of nodes) expect(nodeStyle(node, false).display).toBeDefined();
  });

  it("makes a flow node `relative`, so the order in the tree is the order of painting", () => {
    expect(nodeStyle(flow("Container"), false).position).toBe("relative");
    expect(nodeStyle(flow("Mystery"), false).position).toBe("relative");
  });

  it("gives a free node exactly what cssFor gives, for every kind of anchor", () => {
    for (const anchor of everyAnchor) {
      const node = free(anchor);
      const style = nodeStyle(node, false) as Record<string, string>;
      for (const [key, value] of Object.entries(cssFor(freeBoxOf(node)))) {
        expect(style[key]).toBe(value);
      }
    }
  });

  it("puts the position after the type's values, so nothing can undo it", () => {
    const keys = Object.keys(nodeStyle(free({ anchor: "end", offset: 20 }), false));
    expect(keys.indexOf("left")).toBe(-1);
    expect(keys.indexOf("right")).toBeGreaterThan(keys.indexOf("display"));
    expect(keys.indexOf("top")).toBeGreaterThan(keys.indexOf("flexDirection"));
  });

  it("writes the page typography only on the root", () => {
    const root = nodeStyle(flow("Page", "root"), true);
    expect(root.fontFamily).toBeDefined();
    expect(root.fontSize).toBe("16px");
    expect(root.flexGrow).toBe(1);
    expect(nodeStyle(flow("Container"), false).fontFamily).toBeUndefined();
  });

  it("does not leak a class-like property: every value is a string or a number", () => {
    for (const node of nodes) {
      for (const value of Object.values(nodeStyle(node, false))) {
        expect(["string", "number"]).toContain(typeof value);
      }
    }
  });
});

describe("isBuiltIn", () => {
  it("knows the two built-in types for now", () => {
    expect(isBuiltIn("Page")).toBe(true);
    expect(isBuiltIn("Container")).toBe(true);
    expect(isBuiltIn("Mystery")).toBe(false);
    // Names that exist on every object must not count as types.
    expect(isBuiltIn("toString")).toBe(false);
    expect(isBuiltIn("constructor")).toBe(false);
  });
});

describe("nodeStyle, the background colour", () => {
  const withBackground = <N extends TreeNode>(node: N, background: unknown): N =>
    ({ ...node, styles: { background } }) as N;

  it("writes a stored colour as backgroundColor, on flow and free nodes", () => {
    expect(nodeStyle(withBackground(flow("Container"), "#d5dae3"), false).backgroundColor).toBe(
      "#d5dae3",
    );
    expect(
      nodeStyle(withBackground(free({ anchor: "end", offset: 5 }), "#ff0000"), false)
        .backgroundColor,
    ).toBe("#ff0000");
    expect(nodeStyle(withBackground(flow("Page", "root"), "#ffffff"), true).backgroundColor).toBe(
      "#ffffff",
    );
  });

  it("writes a transparent background when there is no colour, never a missing key", () => {
    for (const node of nodes) expect(nodeStyle(node, false).backgroundColor).toBe("transparent");
  });

  it("writes a transparent background for anything that is not a stored colour", () => {
    for (const bad of [
      "red",
      "#FFF",
      "#fff",
      "ffffff",
      "#ffffffff",
      "#ffffff;position:fixed",
      "#ffffff } body { display:none",
      "url(javascript:alert(1))",
      "var(--x)",
      "",
      " #ffffff",
      0xffffff,
      null,
      undefined,
      {},
      ["#ffffff"],
    ]) {
      expect(nodeStyle(withBackground(flow("Container"), bad), false).backgroundColor).toBe(
        "transparent",
      );
    }
  });

  it("does not fail when the styles object is missing from the data", () => {
    // Data from outside is not checked yet, so a node can arrive without `styles`.
    const { styles: _missing, ...rest } = flow("Container");
    const broken = rest as unknown as FlowNode;
    expect(() => nodeStyle(broken, false)).not.toThrow();
    expect(nodeStyle(broken, false).backgroundColor).toBe("transparent");
    expect(nodeStyle(broken, false).border).toBe("0");
    expect(nodeStyle(broken, false).borderRadius).toBe("0");
  });

  it("puts the colour after the type's values and before the position", () => {
    const flowKeys = Object.keys(nodeStyle(withBackground(flow("Container"), "#123456"), false));
    expect(flowKeys.indexOf("backgroundColor")).toBeGreaterThan(flowKeys.indexOf("flexDirection"));
    expect(flowKeys.indexOf("backgroundColor")).toBeLessThan(flowKeys.indexOf("position"));
    const freeKeys = Object.keys(
      nodeStyle(withBackground(free({ anchor: "end", offset: 5 }), "#123456"), false),
    );
    expect(freeKeys.indexOf("backgroundColor")).toBeGreaterThan(freeKeys.indexOf("flexDirection"));
    expect(freeKeys.indexOf("backgroundColor")).toBeLessThan(freeKeys.indexOf("right"));
  });

  it("for any text, the background is either transparent or exactly a stored colour", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 16 }), (text) => {
        const style = nodeStyle(withBackground(flow("Container"), text), false) as Record<
          string,
          unknown
        >;
        return (
          style.backgroundColor === "transparent" ||
          (style.backgroundColor === text && /^#[0-9a-f]{6}$/.test(text))
        );
      }),
      { numRuns: 2000 },
    );
  });
});

describe("nodeStyle, the border and the radius", () => {
  const styled = <N extends TreeNode>(node: N, styles: Record<string, unknown>): N =>
    ({ ...node, styles }) as N;
  const border = (styles: Record<string, unknown>, node: TreeNode = flow("Container")) =>
    nodeStyle(styled(node, styles), false).border;
  const radius = (styles: Record<string, unknown>) =>
    nodeStyle(styled(flow("Container"), styles), false).borderRadius;

  it("draws a border from a width and a colour", () => {
    expect(border({ borderWidth: 2, borderColor: "#112233" })).toBe("2px solid #112233");
    expect(border({ borderWidth: 0.5, borderColor: "#112233" })).toBe("0.5px solid #112233");
  });

  it("draws a width without a colour in the text colour", () => {
    expect(border({ borderWidth: 2 })).toBe("2px solid currentcolor");
    expect(border({ borderWidth: 2, borderColor: "red" })).toBe("2px solid currentcolor");
  });

  it("draws nothing for a colour without a width, or for a width of 0", () => {
    expect(border({ borderColor: "#112233" })).toBe("0");
    expect(border({ borderWidth: 0, borderColor: "#112233" })).toBe("0");
    expect(border({})).toBe("0");
  });

  it("draws nothing for a width that is not a usable length", () => {
    for (const bad of [
      -1,
      Number.NaN,
      Infinity,
      1001,
      null,
      undefined,
      "2px",
      "2",
      {},
      [2],
      true,
    ]) {
      expect(border({ borderWidth: bad, borderColor: "#112233" })).toBe("0");
    }
  });

  it("rounds a width to 0.01 and draws nothing when it rounds to 0", () => {
    expect(border({ borderWidth: 1.234 })).toBe("1.23px solid currentcolor");
    expect(border({ borderWidth: 0.004 })).toBe("0");
  });

  it("never lets a colour written as CSS reach the border", () => {
    for (const bad of [
      "red",
      "#fff;position:fixed",
      "url(x)",
      "var(--x)",
      "#ffffff } body {",
      0,
      null,
    ]) {
      expect(border({ borderWidth: 1, borderColor: bad })).toBe("1px solid currentcolor");
    }
  });

  it("rounds the corners from a radius, and draws square corners otherwise", () => {
    expect(radius({ borderRadius: 4 })).toBe("4px");
    expect(radius({ borderRadius: 999.999 })).toBe("1000px");
    expect(radius({ borderRadius: 0 })).toBe("0");
    expect(radius({})).toBe("0");
    for (const bad of [-1, Number.NaN, Infinity, 1001, null, "4px", {}, [4], true]) {
      expect(radius({ borderRadius: bad })).toBe("0");
    }
  });

  it("works the same on free nodes", () => {
    const node = styled(free({ anchor: "end", offset: 5 }), { borderWidth: 3, borderRadius: 8 });
    const style = nodeStyle(node, false);
    expect(style.border).toBe("3px solid currentcolor");
    expect(style.borderRadius).toBe("8px");
  });

  it("puts the border and the radius after the type's values and before the position", () => {
    const keys = Object.keys(nodeStyle(styled(flow("Container"), { borderWidth: 1 }), false));
    for (const key of ["backgroundColor", "borderRadius"]) {
      expect(keys.indexOf(key)).toBeGreaterThan(keys.indexOf("flexDirection"));
      expect(keys.indexOf(key)).toBeLessThan(keys.indexOf("position"));
    }
    // `border` overrides the box value in place, so it stays among the box values.
    expect(keys.indexOf("border")).toBeLessThan(keys.indexOf("display"));
  });
});

describe("nodeStyle, a style never adds or removes a key", () => {
  const anything = fc.oneof(
    fc.string({ maxLength: 12 }),
    fc.double(),
    fc.integer(),
    fc.constantFrom(null, undefined, true, false, Number.NaN, Infinity, -Infinity),
    fc.constant({}),
    fc.constant([]),
  );
  const garbage = fc.record(
    { background: anything, borderWidth: anything, borderColor: anything, borderRadius: anything },
    { requiredKeys: [] },
  );

  it("has the same keys, in the same order, whatever the styles are", () => {
    fc.assert(
      fc.property(
        garbage,
        fc.boolean(),
        fc.constantFrom(...nodes.map((_, i) => i)),
        (styles, isRoot, i) => {
          const node = nodes[i] as TreeNode;
          const plain = Object.keys(nodeStyle({ ...node, styles: {} } as TreeNode, isRoot));
          const odd = Object.keys(nodeStyle({ ...node, styles } as unknown as TreeNode, isRoot));
          return plain.join() === odd.join();
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("only ever writes a stored colour, a plain length or the default", () => {
    fc.assert(
      fc.property(garbage, (styles) => {
        const style = nodeStyle(
          { ...flow("Container"), styles } as unknown as TreeNode,
          false,
        ) as Record<string, string>;
        return (
          (style.backgroundColor === "transparent" ||
            /^#[0-9a-f]{6}$/.test(style.backgroundColor as string)) &&
          /^(0|\d+(\.\d+)?px solid (#[0-9a-f]{6}|currentcolor))$/.test(style.border as string) &&
          /^(0|\d+(\.\d+)?px)$/.test(style.borderRadius as string)
        );
      }),
      { numRuns: 2000 },
    );
  });
});

describe("nodeStyle, the theme", () => {
  const theme = {
    colors: { primary: "#112233", line: "#445566" },
    fonts: { body: "Inter, sans-serif" },
  };
  const styled = (styles: Record<string, unknown>) =>
    ({ ...flow("Container"), styles }) as unknown as TreeNode;

  it("draws a background and a border in the colours that references name", () => {
    const style = nodeStyle(
      styled({ background: "@primary", borderColor: "@line", borderWidth: 2 }),
      false,
      "desktop",
      theme,
    );
    expect(style.backgroundColor).toBe("#112233");
    expect(style.border).toBe("2px solid #445566");
  });

  it("falls back to the defaults for a reference the theme does not have, or when there is no theme", () => {
    const node = styled({ background: "@missing", borderColor: "@missing", borderWidth: 2 });
    expect(nodeStyle(node, false, "desktop", theme)).toMatchObject({
      backgroundColor: "transparent",
      border: "2px solid currentcolor",
    });
    expect(nodeStyle(styled({ background: "@primary" }), false).backgroundColor).toBe(
      "transparent",
    );
  });

  it("sets the page in the body font of the theme, on the root only", () => {
    expect(nodeStyle(flow("Page", "root"), true, "desktop", theme).fontFamily).toBe(
      "Inter, sans-serif",
    );
    expect(nodeStyle(flow("Page", "root"), true).fontFamily).toContain("system-ui");
    expect(nodeStyle(flow("Container"), false, "desktop", theme).fontFamily).toBeUndefined();
  });
});
