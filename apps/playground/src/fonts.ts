import type { FontDef } from "@miditor/editor";

/** The fonts people can choose in the demo. A real host lists the fonts its own site loads. */
export const fonts: readonly FontDef[] = [
  { name: "Inter", stack: "Inter, system-ui, sans-serif", group: "Sans serif" },
  { name: "Poppins", stack: "Poppins, system-ui, sans-serif", group: "Sans serif" },
  { name: "Lora", stack: "Lora, Georgia, serif", group: "Serif" },
  { name: "Playfair Display", stack: "'Playfair Display', Georgia, serif", group: "Serif" },
  { name: "Roboto Mono", stack: "'Roboto Mono', ui-monospace, monospace", group: "Monospace" },
];
