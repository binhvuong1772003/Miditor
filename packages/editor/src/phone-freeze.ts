import {
  isFreeNode,
  phoneTextSize,
  type TreeNode,
  withPhoneBox,
  withPhoneProp,
} from "@miditor/core";
import { elementOf } from "./canvas/element-of";
import { isHtmlElement } from "./dom";

/** Where a block is drawn inside its parent, in px, measured from the padding box of the parent. */
export interface Measured {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The page with every block placed for the phone where it is drawn (`measured`, by id), and a text or
 * a button given the size it is drawn in. Nothing that is drawn changes: the page goes from being laid
 * out as a flow to being placed by constraints. Free blocks without a measure are left as they are.
 */
export function freezeRoot(root: TreeNode, measured: ReadonlyMap<string, Measured>): TreeNode {
  const children = root.children.map((child) => freezeRoot(child, measured));
  const same = children.every((child, i) => child === root.children[i]);
  let node: TreeNode = same ? root : { ...root, children };
  const box = measured.get(node.id);
  if (!isFreeNode(node) || !box) return node;
  node = withPhoneBox(node, {
    x: { anchor: "start", offset: box.x },
    y: { anchor: "start", offset: box.y },
    w: { kind: "px", v: box.w },
    h: { kind: "px", v: box.h },
    rotation: node.rotation,
  });
  const size = node.props.size;
  if ((node.type === "Text" || node.type === "Button") && typeof size === "number") {
    const own = node.phoneProps !== undefined && Object.hasOwn(node.phoneProps, "size");
    if (!own) node = withPhoneProp(node, "size", node.type === "Text" ? phoneTextSize(size) : size);
  }
  return node;
}

/** Where an element is drawn inside its offset parent: layout px, which a zoom or a turn does not change. */
export const drawnBox = (element: HTMLElement): Measured => {
  // A block inside a cluster is placed in the box of the cluster, which is not its parent in the page.
  const holder = element.offsetParent;
  const inCluster = isHtmlElement(holder) && holder.hasAttribute("data-miditor-cluster");
  return {
    x: element.offsetLeft + (inCluster ? holder.offsetLeft : 0),
    y: element.offsetTop + (inCluster ? holder.offsetTop : 0),
    w: element.offsetWidth,
    h: element.offsetHeight,
  };
};

/** The free blocks of the tree as they are drawn now, from their elements in `scope`. */
export function measureRoot(scope: HTMLElement, root: TreeNode): Map<string, Measured> {
  const measured = new Map<string, Measured>();
  const visit = (node: TreeNode) => {
    if (isFreeNode(node)) {
      const element = elementOf(scope, node.id);
      if (element) {
        measured.set(node.id, drawnBox(element));
      }
    }
    node.children.forEach(visit);
  };
  visit(root);
  return measured;
}
