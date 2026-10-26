import { cssFor, freeBoxOf, isFreeNode, type TreeNode } from "@midito-kitchen/core";
import type { CSSProperties } from "react";

/**
 * Explicit box values on every node, so rules of the host page (Tailwind's preflight, `* { margin }`
 * and the like) cannot change the box model.
 */
const BOX: CSSProperties = { margin: 0, padding: 0, border: 0, boxSizing: "border-box" };

/** What each built-in type needs on top of the box values. `display` is always explicit. */
const BY_TYPE: Record<string, CSSProperties> = {
  Page: { display: "block" },
  Container: { display: "flex", flexDirection: "column" },
};

/** Typography the whole page inherits, written out so the host's inherited styles do not leak in. */
const PAGE_TEXT: CSSProperties = {
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontSize: "16px",
  lineHeight: "1.5",
  color: "#1b2330",
};

/** The types `<Render>` can draw. The registry will decide this later; until then it is this list. */
export const isBuiltIn = (type: string) => Object.hasOwn(BY_TYPE, type);

/**
 * The inline style of one node. The order is part of the contract: `all: revert` comes first so it
 * drops every rule of the host page on this element, then the explicit values win over it, and the
 * position comes last. A rule written in a class could never beat an inline `all: revert`, so the
 * look of a node must come from its data.
 */
export function nodeStyle(node: TreeNode, isRoot: boolean): CSSProperties {
  const style: CSSProperties = {
    all: "revert",
    ...BOX,
    ...(isBuiltIn(node.type) ? BY_TYPE[node.type] : { display: "block" }),
    ...(isRoot ? { ...PAGE_TEXT, flexGrow: 1, minWidth: 0 } : {}),
  };
  // A flow node is `relative` so that every sibling is positioned and the order in the tree is the
  // order of painting. A free node sits where its anchors put it.
  return isFreeNode(node)
    ? { ...style, ...cssFor(freeBoxOf(node)) }
    : { ...style, position: "relative" };
}
