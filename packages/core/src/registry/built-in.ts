import type { Registry } from "./types";

/**
 * The kinds every editor starts with. A host adds its own by spreading this and putting more under
 * it: `{ ...builtInRegistry, Heart: {...} }`. This is data only; drawing each kind is the job of
 * `render`. Colours that belong to one kind are props here (the fill of a shape, the colour of a
 * text); the look every box shares (background, border, radius) stays in `styles`.
 */
export const builtInRegistry: Registry = {
  /** The empty box the editor has always added. It can hold other blocks. */
  Container: {
    label: "Box",
    canContain: true,
    defaultProps: {},
    fields: {},
  },
  Text: {
    label: "Text",
    canContain: false,
    defaultProps: { text: "Your text", size: 24, color: "#111111", bold: false, align: "left" },
    fields: {
      text: { type: "text", label: "Text", maxLength: 2000 },
      size: { type: "number", label: "Size", min: 1, max: 400 },
      color: { type: "color", label: "Colour" },
      bold: { type: "boolean", label: "Bold" },
      align: { type: "select", label: "Align", options: ["left", "center", "right"] },
    },
  },
  /** A basic shape. It can hold other blocks, for example a square with two texts in it. */
  Shape: {
    label: "Shape",
    canContain: true,
    defaultProps: { shape: "rectangle", fill: "#cbd5e1" },
    fields: {
      shape: { type: "select", label: "Shape", options: ["rectangle", "ellipse", "triangle"] },
      fill: { type: "color", label: "Fill" },
    },
  },
};
