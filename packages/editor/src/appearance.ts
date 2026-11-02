import type { CSSProperties } from "react";

/** The colours of the editor a host can set, by the name used in `appearance.colors`. */
export const APPEARANCE_COLORS = {
  chrome: "--miditor-chrome",
  workspace: "--miditor-workspace",
  canvas: "--miditor-canvas",
  soft: "--miditor-soft",
  border: "--miditor-border",
  borderInput: "--miditor-border-input",
  text: "--miditor-text",
  muted: "--miditor-muted",
  focus: "--miditor-focus",
  danger: "--miditor-danger",
  scrollbar: "--miditor-scrollbar",
  paper: "--miditor-paper",
  accent: "--miditor-accent",
  onAccent: "--miditor-on-accent",
} as const;

export type AppearanceColor = keyof typeof APPEARANCE_COLORS;

/** How the editor looks, set by the host. Anything left out keeps the default of the scheme. */
export interface Appearance {
  /** The set of colours to start from: `light` (the default) or `dark`. */
  scheme?: "light" | "dark";
  /**
   * Colours, by name: `chrome` (header, rail, side panels), `workspace` (the ground around the page),
   * `canvas` (fields and cards), `soft` (hover fills), `border`, `borderInput`, `text`, `muted`,
   * `focus`, `danger`, `scrollbar`, `paper` (the page itself, so a dark editor can keep a white
   * page), `accent` (the main button, Save) and `onAccent` (the text on it). Any CSS colour.
   */
  colors?: Partial<Record<AppearanceColor, string>>;
  /** Corner radius of fields and buttons, and of cards, as CSS lengths (`6px`, `0.5rem`). */
  radius?: string;
  radiusCard?: string;
  /** The height of a field or button, as a CSS length. */
  control?: string;
  /** The font of the editor, as a CSS font stack. */
  font?: string;
}

const MAX_VALUE = 200;

/** A value that can sit in a CSS variable as one value: not empty, not long, nothing that ends or opens a rule. */
const isValue = (value: unknown): value is string =>
  typeof value === "string" &&
  value.trim() !== "" &&
  value.length <= MAX_VALUE &&
  !/[;{}]/.test(value);

/**
 * The CSS variables that `appearance` stands for, to put on the root of the editor. A value that is
 * not usable is left out, so a mistake of the host cannot break the rest of the look.
 */
export function appearanceVariables(appearance: Appearance | undefined): CSSProperties {
  const out: Record<string, string> = {};
  if (!appearance) return out;
  for (const [name, variable] of Object.entries(APPEARANCE_COLORS)) {
    const value = appearance.colors?.[name as AppearanceColor];
    if (isValue(value)) out[variable] = value.trim();
  }
  const others: [string, unknown][] = [
    ["--miditor-radius", appearance.radius],
    ["--miditor-radius-card", appearance.radiusCard],
    ["--miditor-control", appearance.control],
    ["--miditor-font", appearance.font],
  ];
  for (const [variable, value] of others) if (isValue(value)) out[variable] = value.trim();
  return out;
}

/** The scheme to draw: `dark` only when asked for, whatever else is given. */
export const schemeOf = (appearance: Appearance | undefined): "light" | "dark" =>
  appearance?.scheme === "dark" ? "dark" : "light";
