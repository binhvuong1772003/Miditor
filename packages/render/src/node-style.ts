import {
  boxFor,
  cssFor,
  type Device,
  type FlowItem,
  isBackgroundPosition,
  isBackgroundRepeat,
  isBackgroundSize,
  isFreeNode,
  isImageUrl,
  isOpacity,
  isPixelLength,
  isShadow,
  type NodeStyles,
  pageHeightOn,
  resolveColor,
  type Shadow,
  type Theme,
  type TreeNode,
} from "@miditor/core";
import type { CSSProperties } from "react";
import { pageFont } from "./kind-style";

/**
 * Explicit box values on every node, so rules of the host page (Tailwind's preflight, `* { margin }`
 * and the like) cannot change the box model. `transform` is an explicit `none` rather than the
 * `revert` that `all` leaves behind. Observed with react-moveable: with `transform: revert` inline no
 * preview transform was ever written during a drag; with `none` it ran on every move. Presumably the
 * library appends to the inline value and a CSS-wide keyword makes that string invalid.
 */
const BOX: CSSProperties = {
  margin: 0,
  padding: 0,
  border: 0,
  boxSizing: "border-box",
  transform: "none",
};

/** What each built-in type needs on top of the box values. `display` is always explicit. */
const BY_TYPE: Record<string, CSSProperties> = {
  Page: { display: "block" },
  Container: { display: "flex", flexDirection: "column" },
  // A text sits in the middle of its box, up and down. Across, `textStyle` places it by its `align`.
  // It keeps its line breaks and breaks a long word instead of running out of its box.
  Text: {
    display: "flex",
    alignItems: "center",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
  Shape: { display: "block" },
  // A picture never spills out of its box.
  Image: { display: "block", overflow: "hidden" },
  // A button centres its label and keeps it inside, whatever its colours.
  Button: { display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  // A group has no look of its own: it is only the box that holds its blocks.
  Group: { display: "block" },
};

/**
 * The height of the root on a screen (see `pageHeightOn`): as tall as it is set, and no taller, so it
 * stops filling the box the host gives it; or, with none, it fills it.
 */
function pageHeight(root: TreeNode, device: Device): CSSProperties {
  const height = pageHeightOn(root, device);
  return height === undefined ? {} : { minHeight: `${height}px`, flexGrow: 0 };
}

/** Typography the whole page inherits, written out so the host's inherited styles do not leak in. */
const pageText = (theme?: Theme): CSSProperties => ({
  fontFamily: pageFont(theme),
  fontSize: "16px",
  lineHeight: "1.5",
  color: "#1b2330",
});

/** A length as CSS, rounded to 0.01, or 0 when it is not a usable length. */
const drawn = (value: unknown) => (isPixelLength(value) ? Math.round(value * 100) / 100 : 0);

/** A length of a shadow as CSS, rounded to 0.01. */
const reach = (value: number) => `${Math.round(value * 100) / 100}px`;

/** One shadow as CSS: its colour, resolved against the theme, mixed to its own opacity. */
function shadowOf(shadow: Shadow, theme?: Theme): string {
  const color = resolveColor(shadow.color, theme) ?? "#000000";
  const mix = Math.round(shadow.opacity * 100) / 100;
  return `${reach(shadow.x)} ${reach(shadow.y)} ${reach(shadow.blur)} ${reach(shadow.spread)} color-mix(in srgb, ${color} ${mix}%, transparent)`;
}

/**
 * The look of a node, from its styles. Every key is written for every node, with an explicit default,
 * so that an edit changes a value and never removes a key: a removed inline key would be left to the
 * rules of the host page in some browsers, and `border` is one shorthand because mixing it with its
 * longhands makes React warn and leaves a width undeclared when one of them goes. Only values that
 * pass the strict checks reach CSS; anything else is the default.
 */
function lookOf(styles: NodeStyles | undefined, theme?: Theme): CSSProperties {
  // Data comes from outside, so `styles` may be missing and a value may be anything.
  const {
    background,
    borderWidth,
    borderColor,
    borderRadius,
    backgroundImage,
    backgroundSize,
    backgroundPosition,
    backgroundRepeat,
    opacity,
    shadow,
  } = styles ?? {};
  const width = drawn(borderWidth);
  const radius = drawn(borderRadius);
  const color = resolveColor(borderColor, theme) ?? "currentcolor";
  return {
    backgroundColor: resolveColor(background, theme) ?? "transparent",
    // The picture goes over the colour. The address is one `isImageUrl` accepts, which has no quote
    // or backslash in it, so it cannot end the string it is written in.
    backgroundImage: isImageUrl(backgroundImage) ? `url("${backgroundImage}")` : "none",
    backgroundSize: isBackgroundSize(backgroundSize) ? backgroundSize : "cover",
    backgroundPosition: isBackgroundPosition(backgroundPosition) ? backgroundPosition : "center",
    backgroundRepeat: isBackgroundRepeat(backgroundRepeat) ? backgroundRepeat : "no-repeat",
    border: width > 0 ? `${width}px solid ${color}` : "0",
    borderRadius: radius > 0 ? `${radius}px` : "0",
    opacity: isOpacity(opacity) ? Math.round(opacity) / 100 : 1,
    boxShadow: isShadow(shadow) ? shadowOf(shadow, theme) : "none",
  };
}

/** The types `<Render>` can draw. The registry will decide this later; until then it is this list. */
export const isBuiltIn = (type: string) => Object.hasOwn(BY_TYPE, type);

/**
 * The inline style of one node. The order is part of the contract: `all` comes first so it drops
 * every rule of the host page on this element, then the explicit values win over it, and the
 * position comes last. A rule written in a class could never beat an inline `all`, so the look of a
 * node must come from its data.
 *
 * The root says `all: initial` and every other node `all: revert`. `revert` on an inherited property
 * (letter-spacing, line-height, ...) means "inherit", and the root's parent is the wrapper, which
 * belongs to the host page: its rules would leak through. `initial` cuts that chain at the root; the
 * other nodes then inherit the page typography the root writes out.
 */
export function nodeStyle(
  node: TreeNode,
  isRoot: boolean,
  device: Device = "desktop",
  theme?: Theme,
  flow?: PhoneFlow,
): CSSProperties {
  const style: CSSProperties = {
    all: isRoot ? "initial" : "revert",
    ...BOX,
    ...(isBuiltIn(node.type) ? BY_TYPE[node.type] : { display: "block" }),
    ...(isRoot ? { ...pageText(theme), flexGrow: 1, minWidth: 0 } : {}),
    ...lookOf(node.styles, theme),
    // The height of the page, when it was set: only the root has one, and it is a whole px in range.
    // It then is that tall and no taller, so it stops filling the box the host gives it.
    ...(isRoot ? pageHeight(node, device) : {}),
  };
  // A flow node is `relative` so that every sibling is positioned and the order in the tree is the
  // order of painting. A free node sits where its anchors put it, on this screen.
  if (flow) {
    return {
      ...style,
      ...(flow.flowKids ? flowOfKids(isRoot) : {}),
      ...flowPlacement(node, flow.item),
    };
  }
  return isFreeNode(node)
    ? { ...style, ...cssFor(boxFor(node, device)) }
    : { ...style, position: "relative" };
}

/**
 * What a phone that draws the page as a flow needs from a node: its place among its siblings, when it
 * is a free block (`undefined` for the page and for a block of the flow), and whether its own free
 * blocks are laid out in a flow too.
 */
export interface PhoneFlow {
  item: FlowItem | undefined;
  flowKids: boolean;
}

/** The blocks inside a page or a box, in a wrapping row: a full width block takes a row, a small one shares it. */
const flowOfKids = (isRoot: boolean): CSSProperties => ({
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  alignContent: "flex-start",
  alignItems: "flex-start",
  gap: isRoot ? "16px" : "12px",
  padding: "16px",
});

const px2 = (n: number) => `${Math.round(n * 100) / 100}px`;

/** A free block in the flow of its parent: where it comes, how wide, and how tall. */
function flowPlacement(node: TreeNode, item: FlowItem | undefined): CSSProperties {
  if (!isFreeNode(node) || !item) return { position: "relative" };
  const style: CSSProperties = {
    position: "relative",
    order: item.order,
    flex: "0 0 auto",
    maxWidth: "100%",
    width: item.compact ? px2(item.width) : "100%",
  };
  if (item.compact) {
    // A small block sits on the side it was on, with the room of the row on the other side.
    if (item.side === "start") style.marginRight = "auto";
    else if (item.side === "end") style.marginLeft = "auto";
    else style.margin = "0 auto";
  }
  if (node.type === "Text" || node.children.length > 0) style.height = "auto";
  else if (!item.compact && (node.type === "Shape" || node.type === "Image")) {
    style.height = "auto";
    style.aspectRatio = String(item.ratio);
  } else style.height = px2(item.height);
  if (node.rotation !== 0) style.rotate = `${node.rotation}deg`;
  return style;
}
