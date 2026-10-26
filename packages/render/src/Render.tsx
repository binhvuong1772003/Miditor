import type { PageData, TreeNode } from "@midito-kitchen/core";
import { isBuiltIn, nodeStyle } from "./node-style";

export interface RenderProps {
  data: PageData;
  /**
   * A class for the box around the page, for sizing it inside the host. It goes on a wrapper that has
   * no reset, because a class on a node would be dropped by the node's own `all: revert`.
   */
  className?: string;
}

function RenderNode({ node, isRoot }: { node: TreeNode; isRoot: boolean }) {
  const common = {
    "data-midito-id": node.id,
    "data-midito-type": node.type,
    style: nodeStyle(node, isRoot),
  };
  // A type nobody registered stays an empty box in the same place, so the layout around it holds.
  if (!isBuiltIn(node.type)) return <div {...common} data-midito-unknown="" />;
  return (
    <div {...common}>
      {node.children.map((child) => (
        <RenderNode key={child.id} node={child} isRoot={false} />
      ))}
    </div>
  );
}

/**
 * Draws a page from its data. Read-only and safe to render on the server: it touches neither
 * `window` nor `document`. The wrapper is a column so the page fills it.
 */
export function Render({ data, className }: RenderProps) {
  return (
    <div
      className={className}
      data-midito-render=""
      style={{ display: "flex", flexDirection: "column" }}
    >
      <RenderNode node={data.root} isRoot />
    </div>
  );
}
