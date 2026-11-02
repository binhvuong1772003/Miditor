import {
  type Device,
  type JsonValue,
  type PageData,
  type Payload,
  propsFor,
  type Theme,
  type TreeNode,
} from "@miditor/core";
import type { CSSProperties, ReactNode } from "react";
import {
  buttonActionStyle,
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
import { PHONE_VAR, type ResponsiveOptions, responsiveCss, splitStyles } from "./responsive";

/** What a host's drawing function is given for one block of its own kind. */
export interface RendererContext {
  /** The props stored on the node, as they are: nothing fills in defaults. */
  props: Record<string, JsonValue>;
  /** The screen the block is drawn for. In a responsive page it is `"desktop"`, and `responsive` is true. */
  device: Device;
  /** Whether the page is drawn for every screen at once (see `RenderProps.responsive`). */
  responsive: boolean;
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
  /**
   * Draw the page for every screen at once, for publishing: the desktop layout, and the phone one
   * (each block where a person put it for the phone, or the desktop placement made smaller) where
   * the page is narrow, which the browser decides by CSS with no script. Without it the page is
   * drawn for one `device`. A style sheet comes with the page; see `responsiveCss` for what it holds.
   * `{}` is the defaults: the box that holds the page, switching at 640 px.
   */
  responsive?: ResponsiveOptions | undefined;
  /**
   * What a button with an action does when it is pressed: it is given the name of the action, its
   * details and the id of the block. The data holds no code, so the host decides what each name
   * means. Without it a button with an action falls back to its link, and in an editor
   * (`links="inert"`) a button does nothing.
   */
  onAction?: ((action: string, payload: Payload, nodeId: string) => void) | undefined;
  /** A nonce for the style sheet of a responsive page, for a host whose content security policy asks for one. */
  styleNonce?: string | undefined;
}

/** The screen a node is drawn for: one device, or both of them at once. */
type Screen = Device | "responsive";

interface NodeProps {
  node: TreeNode;
  isRoot: boolean;
  screen: Screen;
  /** Set when a block that looks different on the two screens is drawn once for each: which one this is. */
  only?: Device;
  renderers: Readonly<Record<string, Renderer>> | undefined;
  theme: Theme | undefined;
  inert: boolean;
  onAction: RenderProps["onAction"];
}

/** The inline style of a node on one screen. */
function styleOn(node: TreeNode, isRoot: boolean, device: Device, theme: Theme | undefined) {
  const props = propsFor(node, device);
  // A text size that a person set for the phone is the size, with no shrinking by the page ratio.
  const sizeDevice =
    device === "phone" && node.phoneProps && Object.hasOwn(node.phoneProps, "size")
      ? "desktop"
      : device;
  const base = nodeStyle(node, isRoot, device, theme);
  return node.type === "Text"
    ? { ...base, ...textStyle(props, sizeDevice, theme) }
    : node.type === "Button"
      ? buttonLabelLook(base, buttonStyle(props, sizeDevice, theme))
      : base;
}

/**
 * The props that are drawn inside a block, not on its box, by built-in type: what has to be drawn
 * twice when it differs between the screens, since a style cannot change it. The box (position,
 * colours, text size) is switched with variables, so it is not here. A kind of the host has no list:
 * any prop that differs counts.
 */
const INSIDE: Record<string, readonly string[]> = {
  Text: ["text"],
  Button: ["label", "href"],
  Image: ["src", "alt", "fit"],
  Shape: ["shape", "fill"],
};

/** Whether a block has something inside that is not the same on a phone and on a desktop. */
function differsInside(node: TreeNode): boolean {
  if (!node.phoneProps) return false;
  const desktop = propsFor(node, "desktop");
  const phone = propsFor(node, "phone");
  const keys = isBuiltIn(node.type)
    ? (INSIDE[node.type] ?? [])
    : Object.keys({ ...desktop, ...phone });
  return keys.some((key) => JSON.stringify(desktop[key]) !== JSON.stringify(phone[key]));
}

/**
 * The style of one of the two drawings of a block, which is hidden on the other screen: its display
 * is its own on its screen and `none` on the other, switched by a variable like the rest.
 */
function onlyOn(style: CSSProperties, screen: Device): CSSProperties {
  const shown = String(style.display ?? "block");
  return screen === "desktop"
    ? {
        ...style,
        display: `var(--m-hide-d, ${shown})`,
        ["--m-hide-d" as string]: `var(${PHONE_VAR}) none`,
      }
    : {
        ...style,
        display: `var(--m-show-p, none)`,
        ["--m-show-p" as string]: `var(${PHONE_VAR}) ${shown}`,
      };
}

function RenderNode(all: NodeProps) {
  const { node, isRoot, screen, only, renderers, theme, inert, onAction } = all;
  const responsive = screen === "responsive";
  if (responsive && !only && differsInside(node)) {
    return (
      <>
        {(["desktop", "phone"] as const).map((side) => (
          <RenderNode key={side} {...all} only={side} />
        ))}
      </>
    );
  }
  const device: Device = only ?? (screen === "phone" ? "phone" : "desktop");
  // What the node has on this screen: on a phone the values set by hand for it come over the others.
  const props = propsFor(node, device);
  const common = {
    "data-miditor-id": node.id,
    "data-miditor-type": node.type,
    ...(only ? { "data-miditor-screen": only } : {}),
    style: {
      ...(only
        ? onlyOn(styleOn(node, isRoot, only, theme), only)
        : responsive
          ? splitStyles(
              styleOn(node, isRoot, "desktop", theme),
              styleOn(node, isRoot, "phone", theme),
            )
          : styleOn(node, isRoot, device, theme)),
    },
  };
  // A type nobody registered stays an empty box in the same place, so the layout around it holds.
  if (!isBuiltIn(node.type)) {
    const draw =
      renderers && Object.hasOwn(renderers, node.type) ? renderers[node.type] : undefined;
    if (!draw) return <div {...common} data-miditor-unknown="" />;
    return (
      <div {...common}>
        {draw({
          props,
          device,
          responsive,
          theme,
          children: kids(node, screen, renderers, theme, inert, onAction),
        })}
      </div>
    );
  }
  // A text is its words: it has no blocks inside, so any in the data are not drawn.
  if (node.type === "Text") return <div {...common}>{textOf(props)}</div>;
  // A button is its label, a link when it has a safe address and the screen is not an editor's.
  if (node.type === "Button") {
    const { label, href, action, payload } = buttonOf(props);
    if (action && onAction && !inert) {
      return (
        <div {...common}>
          <button
            type="button"
            style={buttonActionStyle}
            onClick={() => onAction(action, payload, node.id)}
          >
            {label}
          </button>
        </div>
      );
    }
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
      {kids(node, screen, renderers, theme, inert, onAction)}
    </div>
  );
}

const kids = (
  node: TreeNode,
  screen: Screen,
  renderers: NodeProps["renderers"],
  theme: Theme | undefined,
  inert: boolean,
  onAction: RenderProps["onAction"],
) =>
  node.children.map((child) => (
    <RenderNode
      key={child.id}
      onAction={onAction}
      node={child}
      isRoot={false}
      screen={screen}
      renderers={renderers}
      theme={theme}
      inert={inert}
    />
  ));

/**
 * Draws a page from its data. Read-only and safe to render on the server: it touches neither
 * `window` nor `document`. The wrapper is a column so the page fills it.
 */
export function Render({
  data,
  className,
  device,
  renderers,
  links,
  responsive,
  onAction,
  styleNonce,
}: RenderProps) {
  const screen: Screen = responsive ? "responsive" : device === "phone" ? "phone" : "desktop";
  return (
    <div
      className={className}
      data-miditor-render=""
      style={{
        display: "flex",
        flexDirection: "column",
        // A query on the container looks at this box, which therefore has to be one.
        ...(responsive && responsive.query !== "viewport" ? { containerType: "inline-size" } : {}),
      }}
    >
      {responsive && <style nonce={styleNonce}>{responsiveCss(responsive)}</style>}
      <RenderNode
        node={data.root}
        isRoot
        screen={screen}
        renderers={renderers}
        theme={data.theme}
        inert={links === "inert"}
        onAction={onAction}
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
