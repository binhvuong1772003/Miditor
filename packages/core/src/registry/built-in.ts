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
    category: "Basic",
    icon: "box",
    keywords: ["frame", "section", "group", "div"],
    label: "Box",
    canContain: true,
    defaultProps: {},
    fields: {},
  },
  Text: {
    category: "Basic",
    icon: "text",
    keywords: ["heading", "title", "paragraph", "words"],
    label: "Text",
    size: { w: 240, h: 60 },
    canContain: false,
    defaultProps: {
      text: "Your text",
      size: 24,
      color: "#111111",
      bold: false,
      align: "center",
      font: "body",
    },
    fields: {
      text: { type: "text", label: "Text", maxLength: 2000 },
      size: { type: "number", label: "Size", min: 1, max: 400, perDevice: true },
      color: { type: "color", label: "Colour" },
      bold: { type: "boolean", label: "Bold" },
      align: { type: "select", label: "Align", options: ["left", "center", "right"] },
      font: { type: "select", label: "Font", options: ["body", "heading"] },
    },
  },
  /** A basic shape. It can hold other blocks, for example a square with two texts in it. */
  Shape: {
    category: "Basic",
    icon: "shape",
    keywords: ["rectangle", "ellipse", "circle", "triangle"],
    label: "Shape",
    size: { w: 160, h: 160 },
    canContain: true,
    defaultProps: { shape: "rectangle", fill: "#cbd5e1" },
    fields: {
      shape: { type: "select", label: "Shape", options: ["rectangle", "ellipse", "triangle"] },
      fill: { type: "color", label: "Fill" },
    },
  },
  /** A picture from an address. It keeps its ratio when resized, so it is not squashed. */
  Image: {
    category: "Basic",
    icon: "img",
    keywords: ["picture", "photo", "upload"],
    label: "Image",
    size: { w: 240, h: 160 },
    lockRatio: true,
    canContain: false,
    defaultProps: { src: "", alt: "", fit: "cover" },
    fields: {
      src: { type: "image", label: "Picture address" },
      alt: { type: "text", label: "Description", maxLength: 500 },
      fit: { type: "select", label: "Fit", options: ["cover", "contain"] },
    },
  },
  /** A button that can lead somewhere: its label and where it goes are props, its looks are colours. */
  Button: {
    category: "Basic",
    icon: "button",
    keywords: ["link", "cta", "action"],
    label: "Button",
    size: { w: 160, h: 44 },
    canContain: false,
    defaultProps: {
      label: "Button",
      href: "",
      fill: "#111111",
      textColor: "#ffffff",
      shape: "rounded",
      size: 16,
    },
    fields: {
      label: { type: "text", label: "Label", maxLength: 100 },
      href: { type: "link", label: "Link" },
      fill: { type: "color", label: "Fill" },
      textColor: { type: "color", label: "Text colour" },
      shape: { type: "select", label: "Shape", options: ["rounded", "pill", "square"] },
      size: { type: "number", label: "Text size", min: 8, max: 72, perDevice: true },
    },
  },
  /**
   * Several blocks gathered, see `groupNodes`. It has no look of its own, so a group is only the
   * blocks in it, moved and resized together. Made by grouping, so it is not offered when adding.
   */
  Group: {
    label: "Group",
    hidden: true,
    canContain: true,
    defaultProps: {},
    fields: {},
  },
};
