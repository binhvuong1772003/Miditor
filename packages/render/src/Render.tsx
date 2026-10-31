import {
  type Device,
  type JsonValue,
  type PageData,
  propsFor,
  type Theme,
  type TreeNode,
} from "@midito-kitchen/core";
import type { CSSProperties, ReactNode } from "react";
import {
  buttonLabelStyle,
  buttonOf,
  buttonStyle,
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
  /**
   * What a link does: `"live"` (the default) draws a button's link as a real one, `"inert"` draws the
   * same button with no address, so pressing it in an editor goes nowhere.
   */
  links?: "live" | "inert" | undefined;
}

interface NodeProps {
  node: TreeNode;
  isRoot: boolean;
  device: Device;
  renderers: Readonly<Record<string, Renderer>> | undefined;
  theme: Theme | undefined;
  inert: boolean;
}

function RenderNode({ node, isRoot, device, renderers, theme, inert }: NodeProps) {
  // What the node has on this screen: on a phone the values set by hand for it come over the others.
  const props = propsFor(node, device);
  // A text size that a person set for the phone is the size, with no shrinking by the page ratio.
  const sizeDevice =
    device === "phone" && node.phoneProps && Object.hasOwn(node.phoneProps, "size")
      ? "desktop"
      : device;
  const base = nodeStyle(node, isRoot, device, theme);
  const common = {
    "data-midito-id": node.id,
    "data-midito-type": node.type,
    style:
      node.type === "Text"
        ? { ...base, ...textStyle(props, sizeDevice, theme) }
        : node.type === "Button"
          ? buttonLabelLook(base, buttonStyle(props, sizeDevice, theme))
          : base,
  };
  // A type nobody registered stays an empty box in the same place, so the layout around it holds.
  if (!isBuiltIn(node.type)) {
    const draw =
      renderers && Object.hasOwn(renderers, node.type) ? renderers[node.type] : undefined;
    if (!draw) return <div {...common} data-midito-unknown="" />;
    return (
      <div {...common}>
        {draw({ props, device, theme, children: kids(node, device, renderers, theme, inert) })}
      </div>
    );
  }
  // A text is its words: it has no blocks inside, so any in the data are not drawn.
  if (node.type === "Text") return <div {...common}>{textOf(props)}</div>;
  // A button is its label, a link when it has a safe address and the screen is not an editor's.
  if (node.type === "Button") {
    const { label, href } = buttonOf(props);
    return (
      <div {...common}>
        {href && !inert ? (
          <a href={href} rel="noopener noreferrer" style={buttonLabelStyle}>
            {label}
          </a>
        ) : (
          <span style={buttonLabelStyle}>{label}</span>
        )}
      </div>
    );
  }
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
      {kids(node, device, renderers, theme, inert)}
    </div>
  );
}

const kids = (
  node: TreeNode,
  device: Device,
  renderers: NodeProps["renderers"],
  theme: Theme | undefined,
  inert: boolean,
) =>
  node.children.map((child) => (
    <RenderNode
      key={child.id}
      node={child}
      isRoot={false}
      device={device}
      renderers={renderers}
      theme={theme}
      inert={inert}
    />
  ));

/**
 * Draws a page from its data. Read-only and safe to render on the server: it touches neither
 * `window` nor `document`. The wrapper is a column so the page fills it.
 */
export function Render({ data, className, device, renderers, links }: RenderProps) {
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
        inert={links === "inert"}
      />
    </div>
  );
}

/**
 * The look of a button over the look of every block. The roundness of its shape is for a button with
 * no radius of its own: a radius set in the styles stays.
 */
function buttonLabelLook(base: CSSProperties, look: CSSProperties): CSSProperties {
  return base.borderRadius === "0"
    ? { ...base, ...look }
    : { ...base, ...look, borderRadius: base.borderRadius };
}
