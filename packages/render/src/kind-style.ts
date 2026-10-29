import { isHexColor, type JsonValue } from "@midito-kitchen/core";
import type { CSSProperties } from "react";

type Props = Record<string, JsonValue>;

// The same values as the defaults of `Text` and `Shape` in the registry of `core`. Data comes from
// outside, so every prop is checked here and anything else is the default, never an error.
const DEFAULT_SIZE = 24;
const DEFAULT_COLOUR = "#111111";
const DEFAULT_FILL = "#cbd5e1";
const ALIGNS = ["left", "center", "right"] as const;

/** The text a `Text` block shows: its `text` prop, or nothing when that is not a string. */
export const textOf = (props: Props) => (typeof props.text === "string" ? props.text : "");

/** The typography of a `Text` block. Every key is written, so an edit changes a value and removes no key. */
export function textStyle(props: Props): CSSProperties {
  const { size, color, bold, align } = props;
  const px =
    typeof size === "number" && Number.isFinite(size)
      ? Math.round(Math.min(400, Math.max(1, size)) * 100) / 100
      : DEFAULT_SIZE;
  return {
    fontSize: `${px}px`,
    color: isHexColor(color) ? color : DEFAULT_COLOUR,
    fontWeight: bold === true ? 700 : 400,
    textAlign: ALIGNS.find((a) => a === align) ?? "left",
  };
}

/**
 * The layer a `Shape` block draws its shape on: it fills the block, sits under the blocks inside
 * it and lets the pointer through, so clipping a triangle never clips what is inside.
 */
export function shapeLayerStyle(props: Props): CSSProperties {
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
    backgroundColor: isHexColor(fill) ? fill : DEFAULT_FILL,
    borderRadius: shape === "ellipse" ? "50%" : "0",
    clipPath: shape === "triangle" ? "polygon(50% 0, 100% 100%, 0 100%)" : "none",
  };
}
