import { describe, expect, it } from "vitest";
import { builtInRegistry } from "../registry/built-in";
import { replaceColor } from "./replace-color";
import type { FlowNode, TreeNode } from "./types";

const node = (
  id: string,
  type: string,
  over: Partial<FlowNode> = {},
  children: TreeNode[] = [],
): FlowNode => ({
  id,
  type,
  props: {},
  styles: {},
  position: { mode: "flow" },
  children,
  ...over,
});
const find = (root: TreeNode, id: string): TreeNode | undefined =>
  root.id === id ? root : root.children.map((c) => find(c, id)).find(Boolean);

describe("replaceColor", () => {
  const text = node("t", "Text", { props: { text: "@primary", color: "@primary", bold: true } });
  const shape = node(
    "s",
    "Shape",
    {
      props: { fill: "@primary", shape: "ellipse" },
      styles: { background: "@primary", borderColor: "@accent", borderWidth: 2 },
    },
    [text],
  );
  const root = node("root", "Page", { styles: { background: "@primary" } }, [
    shape,
    node("x", "Text", { props: { color: "@accent" } }),
  ]);

  it("bakes a colour into every place that uses it: styles and colour fields, at any depth", () => {
    const out = replaceColor(root, builtInRegistry, "primary", "#112233");
    expect(out.styles).toEqual({ background: "#112233" });
    const s = find(out, "s") as FlowNode;
    expect(s.styles).toEqual({ background: "#112233", borderColor: "@accent", borderWidth: 2 });
    expect(s.props).toEqual({ fill: "#112233", shape: "ellipse" });
    expect((find(out, "t") as FlowNode).props).toEqual({
      text: "@primary",
      color: "#112233",
      bold: true,
    });
  });

  it("leaves a text that only looks like a reference, in a field that is not a colour", () => {
    const out = replaceColor(root, builtInRegistry, "primary", "#112233");
    expect((find(out, "t") as FlowNode).props.text).toBe("@primary");
  });

  it("changes the border colour as well as the background", () => {
    const framed = node("root", "Page", {}, [
      node("b", "Container", { styles: { borderColor: "@primary", borderWidth: 1 } }),
    ]);
    const out = replaceColor(framed, builtInRegistry, "primary", "#112233");
    expect((find(out, "b") as FlowNode).styles).toEqual({ borderColor: "#112233", borderWidth: 1 });
  });

  it("renames a colour by replacing the reference with another one", () => {
    const out = replaceColor(root, builtInRegistry, "primary", "@brand");
    expect((find(out, "s") as FlowNode).props.fill).toBe("@brand");
    expect(out.styles.background).toBe("@brand");
  });

  it("does not touch the other colours, and shares what did not change", () => {
    const out = replaceColor(root, builtInRegistry, "primary", "#112233");
    expect(find(out, "x")).toBe(root.children[1]);
    expect((find(out, "s") as FlowNode).styles.borderColor).toBe("@accent");
  });

  it("changes the phone props that are colour fields as well", () => {
    const withPhone = node("root", "Page", {}, [
      node("t", "Text", {
        props: { color: "#000000" },
        phoneProps: { color: "@primary", size: 12 },
      }),
    ]);
    const out = replaceColor(withPhone, builtInRegistry, "primary", "#112233");
    expect((find(out, "t") as FlowNode).phoneProps).toEqual({ color: "#112233", size: 12 });
  });

  it("changes the styles of a kind the registry does not have, and its props are left alone", () => {
    const odd = node("root", "Page", {}, [
      node("h", "Heart", { props: { color: "@primary" }, styles: { background: "@primary" } }),
    ]);
    const out = replaceColor(odd, builtInRegistry, "primary", "#112233");
    expect((find(out, "h") as FlowNode).styles.background).toBe("#112233");
    expect((find(out, "h") as FlowNode).props.color).toBe("@primary");
  });

  it("returns the same tree when nothing uses the colour", () => {
    expect(replaceColor(root, builtInRegistry, "nobody", "#112233")).toBe(root);
    const empty = node("root", "Page");
    expect(replaceColor(empty, builtInRegistry, "primary", "#112233")).toBe(empty);
  });

  it("returns the same tree for a name or a colour that is not good", () => {
    for (const name of ["", "Primary", "@primary", "a b"]) {
      expect(replaceColor(root, builtInRegistry, name, "#112233"), name).toBe(root);
    }
    for (const to of ["red", "#abc", "", "@", "url(x)"]) {
      expect(replaceColor(root, builtInRegistry, "primary", to), to).toBe(root);
    }
  });

  it("does not change the tree it is given", () => {
    const before = JSON.stringify(root);
    replaceColor(root, builtInRegistry, "primary", "#112233");
    expect(JSON.stringify(root)).toBe(before);
  });

  it("does not look up a kind named like something on the prototype", () => {
    const odd = node("root", "Page", {}, [
      node("c", "constructor", { props: { color: "@primary" } }),
    ]);
    expect(
      (find(replaceColor(odd, builtInRegistry, "primary", "#112233"), "c") as FlowNode).props.color,
    ).toBe("@primary");
  });
});
