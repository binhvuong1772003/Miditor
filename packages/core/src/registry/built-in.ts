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
    inlineText: { prop: "text", multiline: true },
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
      italic: false,
      underline: false,
      align: "center",
      font: "body",
    },
    fields: {
      text: { type: "text", label: "Text", maxLength: 2000, multiline: true, group: "Text" },
      font: {
        type: "select",
        label: "Font",
        options: ["body", "heading"],
        group: "Typography",
      },
      size: {
        type: "number",
        label: "Size",
        min: 1,
        max: 400,
        unit: "px",
        perDevice: true,
        group: "Typography",
      },
      color: { type: "color", label: "Colour", group: "Typography" },
      bold: { type: "boolean", label: "Bold", group: "Typography" },
      italic: { type: "boolean", label: "Italic", group: "Typography" },
      underline: { type: "boolean", label: "Underline", group: "Typography" },
      align: {
        type: "select",
        label: "Align",
        options: ["left", "center", "right"],
        group: "Typography",
      },
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
  /**
   * A picture from an address. It keeps its ratio when resized, so it is not squashed. It is not
   * offered among the blocks: a picture comes in through the Upload image button of the Assets panel.
   */
  Image: {
    category: "Basic",
    hidden: true,
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
    inlineText: { prop: "label" },
    icon: "button",
    keywords: ["link", "cta", "action"],
    label: "Button",
    size: { w: 160, h: 44 },
    canContain: false,
    defaultProps: {
      label: "Button",
      href: "",
      action: "",
      payload: {},
      fill: "#111111",
      textColor: "#ffffff",
      shape: "rounded",
      size: 16,
    },
    fields: {
      label: { type: "text", label: "Label", maxLength: 100, group: "Content" },
      href: { type: "link", label: "Link", group: "Content" },
      action: {
        type: "action",
        label: "Action",
        group: "Content",
        help: "What the page does when the button is pressed. It wins over the link.",
      },
      payload: { type: "payload", label: "Details", group: "Content" },
      fill: { type: "color", label: "Fill", group: "Style" },
      textColor: { type: "color", label: "Text colour", group: "Style" },
      shape: {
        type: "select",
        label: "Shape",
        options: ["rounded", "pill", "square"],
        group: "Style",
      },
      size: {
        type: "number",
        label: "Text size",
        min: 8,
        max: 72,
        unit: "px",
        perDevice: true,
        group: "Style",
      },
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
