import {
  type Device,
  isFontStack,
  isImageUrl,
  isLinkUrl,
  type JsonValue,
  PHONE_RATIO,
  resolveColor,
  type Theme,
} from "@midito-kitchen/core";
import type { CSSProperties } from "react";

type Props = Record<string, JsonValue>;

// The same values as the defaults of `Text` and `Shape` in the registry of `core`. Data comes from
// outside, so every prop is checked here and anything else is the default, never an error.
const DEFAULT_SIZE = 24;
const DEFAULT_COLOUR = "#111111";
const DEFAULT_FILL = "#cbd5e1";
const ALIGNS = ["left", "center", "right"] as const;
/** On a phone a text is not drawn smaller than this, unless it is smaller on the desktop already. */
const PHONE_MIN_SIZE = 12;
/** Where a text of each alignment sits across its box, which is a flex row. */
const JUSTIFY = { left: "flex-start", center: "center", right: "flex-end" } as const;

/** The font of the page when the theme gives none. */
export const DEFAULT_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** The font stack of the theme for `body` or `heading`, when it is a safe one. */
const themeFont = (theme: Theme | undefined, which: "body" | "heading") => {
  const stack = theme?.fonts?.[which];
  return isFontStack(stack) ? stack : undefined;
};

/** The font the whole page is set in: the theme's body font, or the default. */
export const pageFont = (theme?: Theme) => themeFont(theme, "body") ?? DEFAULT_FONT;

/** The text a `Text` block shows: its `text` prop, or nothing when that is not a string. */
export const textOf = (props: Props) => (typeof props.text === "string" ? props.text : "");

/** The size on this screen: on a phone it follows the page, but is not below 12 px nor above the desktop's. */
const sizeOnScreen = (desktop: number, device: Device) =>
  device === "phone"
    ? Math.round(Math.max(desktop * PHONE_RATIO, Math.min(desktop, PHONE_MIN_SIZE)) * 100) / 100
    : desktop;

/**
 * The typography of a `Text` block, also where it sits across its box. Every key is written, so an
 * edit changes a value and removes no key. On a phone the size follows the page, as the rest of the
 * block does, but stays readable: it is not made smaller than 12 px, nor larger than on the desktop.
 */
export function textStyle(props: Props, device: Device = "desktop", theme?: Theme): CSSProperties {
  const { size, color, bold, italic, underline, align } = props;
  const desktop =
    typeof size === "number" && Number.isFinite(size)
      ? Math.round(Math.min(400, Math.max(1, size)) * 100) / 100
      : DEFAULT_SIZE;
  const px = sizeOnScreen(desktop, device);
  const alignment = ALIGNS.find((a) => a === align) ?? "center";
  return {
    fontSize: `${px}px`,
    color: resolveColor(color, theme) ?? DEFAULT_COLOUR,
    fontFamily:
      (props.font === "heading" ? themeFont(theme, "heading") : undefined) ?? pageFont(theme),
    fontWeight: bold === true ? 700 : 400,
    fontStyle: italic === true ? "italic" : "normal",
    textDecoration: underline === true ? "underline" : "none",
    textAlign: alignment,
    justifyContent: JUSTIFY[alignment],
  };
}

/**
 * The layer a `Shape` block draws its shape on: it fills the block, sits under the blocks inside
 * it and lets the pointer through, so clipping a triangle never clips what is inside.
 */
export function shapeLayerStyle(props: Props, theme?: Theme): CSSProperties {
  const { shape, fill } = props;
  return {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    margin: 0,
    padding: 0,
    border: 0,
    boxSizing: "border-box",
    pointerEvents: "none",
    backgroundColor: resolveColor(fill, theme) ?? DEFAULT_FILL,
    borderRadius: shape === "ellipse" ? "50%" : "0",
    clipPath: shape === "triangle" ? "polygon(50% 0, 100% 100%, 0 100%)" : "none",
  };
}

const FITS = ["cover", "contain"] as const;
/** The grey of a picture that has no address yet, or one that is not safe to load. */
const PLACEHOLDER = "#e2e8f0";

/** What an `Image` block draws: the picture, or a plain grey box when `src` is not a safe address. */
export function imageOf(props: Props): { src: string; alt: string } | undefined {
  const { src, alt } = props;
  return isImageUrl(src) ? { src, alt: typeof alt === "string" ? alt : "" } : undefined;
}

/** The look of the picture itself, which fills its block. Every key is written. */
export function imageStyle(props: Props): CSSProperties {
  return {
    display: "block",
    width: "100%",
    height: "100%",
    margin: 0,
    padding: 0,
    border: 0,
    objectFit: FITS.find((fit) => fit === props.fit) ?? "cover",
  };
}

/** The grey box drawn in place of a picture that is not there. */
export const imagePlaceholderStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  backgroundColor: PLACEHOLDER,
};

const SHAPES = { rounded: "8px", pill: "9999px", square: "0" } as const;
const BUTTON_SIZE = 16;
const BUTTON_FILL = "#111111";
const BUTTON_TEXT = "#ffffff";

/** What a `Button` block shows: its label, and where it goes when that is a safe address. */
export function buttonOf(props: Props): { label: string; href: string | undefined } {
  const { label, href } = props;
  return {
    label: typeof label === "string" ? label : "",
    href: isLinkUrl(href) ? href : undefined,
  };
}

/**
 * The look of a `Button` block: its fill and text colours (a theme colour is resolved), its text
 * size (on a phone as a `Text` does), its font and the roundness of its `shape`. Every key is
 * written, so an edit changes a value and removes no key.
 */
export function buttonStyle(
  props: Props,
  device: Device = "desktop",
  theme?: Theme,
): CSSProperties {
  const { fill, textColor, shape, size } = props;
  const desktop =
    typeof size === "number" && Number.isFinite(size)
      ? Math.round(Math.min(72, Math.max(8, size)) * 100) / 100
      : BUTTON_SIZE;
  return {
    backgroundColor: resolveColor(fill, theme) ?? BUTTON_FILL,
    color: resolveColor(textColor, theme) ?? BUTTON_TEXT,
    fontSize: `${sizeOnScreen(desktop, device)}px`,
    fontFamily: pageFont(theme),
    fontWeight: 600,
    borderRadius: SHAPES[shape as keyof typeof SHAPES] ?? SHAPES.rounded,
  };
}

/** The label of a button, set on one line and cut with an ellipsis when it does not fit. */
export const buttonLabelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  inlineSize: "100%",
  blockSize: "100%",
  boxSizing: "border-box",
  paddingInline: "12px",
  color: "inherit",
  textDecoration: "none",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
