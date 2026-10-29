import type { Device, PageData, TreeNode } from "@midito-kitchen/core";
import { shapeLayerStyle, textOf, textStyle } from "./kind-style";
import { isBuiltIn, nodeStyle } from "./node-style";

export interface RenderProps {
  data: PageData;
  /**
   * A class for the box around the page, for sizing it inside the host. It goes on a wrapper that has
   * no reset, because a class on a node would be dropped by the node's own `all: revert`.
   */
  className?: string | undefined;
  /**
   * The screen to draw the page for: `"desktop"` (the default) or `"phone"`. A phone shows each free
   * block where a person put it for the phone, or, when nobody did, the desktop placement made
   * smaller. Anything else is the desktop.
   */
  device?: Device | undefined;
}

function RenderNode({ node, isRoot, device }: { node: TreeNode; isRoot: boolean; device: Device }) {
  const common = {
    "data-midito-id": node.id,
    "data-midito-type": node.type,
    style:
      node.type === "Text"
        ? { ...nodeStyle(node, isRoot, device), ...textStyle(node.props, device) }
        : nodeStyle(node, isRoot, device),
  };
  // A type nobody registered stays an empty box in the same place, so the layout around it holds.
  if (!isBuiltIn(node.type)) return <div {...common} data-midito-unknown="" />;
  // A text is its words: it has no blocks inside, so any in the data are not drawn.
  if (node.type === "Text") return <div {...common}>{textOf(node.props)}</div>;
  return (
    <div {...common}>
      {node.type === "Shape" && <div aria-hidden="true" style={shapeLayerStyle(node.props)} />}
      {node.children.map((child) => (
        <RenderNode key={child.id} node={child} isRoot={false} device={device} />
      ))}
    </div>
  );
}

/**
 * Draws a page from its data. Read-only and safe to render on the server: it touches neither
 * `window` nor `document`. The wrapper is a column so the page fills it.
 */
export function Render({ data, className, device }: RenderProps) {
  const screen = device === "phone" ? "phone" : "desktop";
  return (
    <div
      className={className}
      data-midito-render=""
      style={{ display: "flex", flexDirection: "column" }}
    >
      <RenderNode node={data.root} isRoot device={screen} />
    </div>
  );
}
