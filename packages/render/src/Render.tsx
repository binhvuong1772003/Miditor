import {
  type Device,
  type JsonValue,
  type PageData,
  propsFor,
  type Theme,
  type TreeNode,
} from "@midito-kitchen/core";
import type { ReactNode } from "react";
import {
  imageOf,
  imagePlaceholderStyle,
  imageStyle,
  shapeLayerStyle,
  textOf,
  textStyle,
} from "./kind-style";
import { isBuiltIn, nodeStyle } from "./node-style";

/** What a host's drawing function is given for one block of its own kind. */
export interface RendererContext {
  /** The props stored on the node, as they are: nothing fills in defaults. */
  props: Record<string, JsonValue>;
  device: Device;
  /** The theme of the page, for a function that draws a colour or a font of its own (see `resolveColor`). */
  theme: Theme | undefined;
  /** The blocks inside this one, already drawn. A function that leaves them out hides them. */
  children: ReactNode;
}

/** A host's drawing of one kind of block, by `type`. It draws the inside; the box is `<Render>`'s. */
export type Renderer = (context: RendererContext) => ReactNode;

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
  /**
   * How to draw the kinds the host added, by `type`. A built-in type is never drawn by this, and a
   * type with no entry here stays an empty box.
   */
  renderers?: Readonly<Record<string, Renderer>> | undefined;
}

interface NodeProps {
  node: TreeNode;
  isRoot: boolean;
  device: Device;
  renderers: Readonly<Record<string, Renderer>> | undefined;
  theme: Theme | undefined;
}

function RenderNode({ node, isRoot, device, renderers, theme }: NodeProps) {
  // What the node has on this screen: on a phone the values set by hand for it come over the others.
  const props = propsFor(node, device);
  // A text size that a person set for the phone is the size, with no shrinking by the page ratio.
  const sizeDevice =
    device === "phone" && node.phoneProps && Object.hasOwn(node.phoneProps, "size")
      ? "desktop"
      : device;
  const common = {
    "data-midito-id": node.id,
    "data-midito-type": node.type,
    style:
      node.type === "Text"
        ? { ...nodeStyle(node, isRoot, device, theme), ...textStyle(props, sizeDevice, theme) }
        : nodeStyle(node, isRoot, device, theme),
  };
  // A type nobody registered stays an empty box in the same place, so the layout around it holds.
  if (!isBuiltIn(node.type)) {
    const draw =
      renderers && Object.hasOwn(renderers, node.type) ? renderers[node.type] : undefined;
    if (!draw) return <div {...common} data-midito-unknown="" />;
    return (
      <div {...common}>
        {draw({ props, device, theme, children: kids(node, device, renderers, theme) })}
      </div>
    );
  }
  // A text is its words: it has no blocks inside, so any in the data are not drawn.
  if (node.type === "Text") return <div {...common}>{textOf(props)}</div>;
  // A picture is its picture: like a text it has no blocks inside. A missing or unsafe address is a grey box.
  if (node.type === "Image") {
    const picture = imageOf(props);
    return (
      <div {...common}>
        {picture ? (
          <img src={picture.src} alt={picture.alt} draggable={false} style={imageStyle(props)} />
        ) : (
          <div aria-hidden="true" style={imagePlaceholderStyle} />
        )}
      </div>
    );
  }
  return (
    <div {...common}>
      {node.type === "Shape" && <div aria-hidden="true" style={shapeLayerStyle(props, theme)} />}
      {kids(node, device, renderers, theme)}
    </div>
  );
}

const kids = (
  node: TreeNode,
  device: Device,
  renderers: NodeProps["renderers"],
  theme: Theme | undefined,
) =>
  node.children.map((child) => (
    <RenderNode
      key={child.id}
      node={child}
      isRoot={false}
      device={device}
      renderers={renderers}
      theme={theme}
    />
  ));

/**
 * Draws a page from its data. Read-only and safe to render on the server: it touches neither
 * `window` nor `document`. The wrapper is a column so the page fills it.
 */
export function Render({ data, className, device, renderers }: RenderProps) {
  const screen = device === "phone" ? "phone" : "desktop";
  return (
    <div
      className={className}
      data-midito-render=""
      style={{ display: "flex", flexDirection: "column" }}
    >
      <RenderNode
        node={data.root}
        isRoot
        device={screen}
        renderers={renderers}
        theme={data.theme}
      />
    </div>
  );
}
