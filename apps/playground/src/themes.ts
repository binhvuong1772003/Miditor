import type { SavedTheme } from "@midito-kitchen/editor";

/**
 * The themes the demo suggests. They all use the same colour names as the demo's own page
 * (`primary`, `accent`, `paper`), so the blocks that use a colour by name change with the theme.
 */
export const themes: readonly Omit<SavedTheme, "id">[] = [
  {
    name: "Sea",
    colors: { primary: "#0e7490", accent: "#f97316", paper: "#ecfeff" },
    font: "Lora, Georgia, serif",
  },
  {
    name: "Night",
    colors: { primary: "#38bdf8", accent: "#f472b6", paper: "#0f172a" },
    font: "Inter, system-ui, sans-serif",
  },
  {
    name: "Warm",
    colors: { primary: "#c2410c", accent: "#15803d", paper: "#fff7ed" },
    font: "Poppins, system-ui, sans-serif",
  },
];
