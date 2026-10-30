import type { Registry } from "../registry/types";
import { colorRef, isColorValue, isTokenName } from "../styles/theme";
import type { JsonValue, NodeStyles, TreeNode } from "./types";

type Values = Record<string, JsonValue>;

/** `values` with the colour fields of `names` that hold `from` set to `to`, or the same object. */
function swapInProps(values: Values, names: readonly string[], from: string, to: string): Values {
  const hits = names.filter((name) => Object.hasOwn(values, name) && values[name] === from);
  return hits.length === 0
    ? values
    : { ...values, ...Object.fromEntries(hits.map((n) => [n, to])) };
}

/**
 * A new tree where every use of the theme colour `name` is `to` instead: the `background` and
 * `borderColor` styles of every block, and the props, and phone props, that are colour fields in the
 * registry. `to` is a `#rrggbb` (the colour is baked into the blocks, which is what deleting it from
 * the theme wants) or another reference (a rename). A text that happens to be `@name` in a prop that
 * is not a colour field is left alone. Only the blocks that change are copied, and the very same tree
 * comes back when nothing uses the colour, when `name` is not a good name or `to` is not a good colour.
 */
export function replaceColor(
  root: TreeNode,
  registry: Registry,
  name: string,
  to: string,
): TreeNode {
  if (!isTokenName(name) || !isColorValue(to)) return root;
  const from = colorRef(name);
  const walk = (node: TreeNode): TreeNode => {
    const def = Object.hasOwn(registry, node.type) ? registry[node.type] : undefined;
    const colourFields = def
      ? Object.entries(def.fields)
          .filter(([, field]) => field.type === "color")
          .map(([key]) => key)
      : [];
    let styles = node.styles;
    for (const key of ["background", "borderColor"] as const) {
      if (styles[key] === from) styles = { ...styles, [key]: to };
    }
    const props = swapInProps(node.props, colourFields, from, to);
    const phoneProps = node.phoneProps
      ? swapInProps(node.phoneProps, colourFields, from, to)
      : undefined;
    const children = node.children.map(walk);
    const same =
      styles === node.styles &&
      props === node.props &&
      phoneProps === node.phoneProps &&
      children.every((child, i) => child === node.children[i]);
    if (same) return node;
    return {
      ...node,
      styles,
      props,
      ...(phoneProps ? { phoneProps } : {}),
      children,
    } as TreeNode;
  };
  return walk(root);
}
