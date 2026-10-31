import { type Registry, type Renderer, resolveColor } from "@midito-kitchen/editor";

/** A kind of the host's own, to try `config`: it keeps its ratio when resized. */
export const components: Registry = {
  Heart: {
    label: "Heart",
    category: "From your website",
    icon: "heart",
    keywords: ["love", "like", "demo"],
    size: { w: 120, h: 100 },
    lockRatio: true,
    canContain: false,
    defaultProps: { color: "#e11d48" },
    fields: { color: { type: "color", label: "Colour" } },
  },
};

/** How the host draws its own kind: a heart that fills its box, in the colour stored on the block. */
export const renderers: Record<string, Renderer> = {
  Heart: ({ props, theme }) => (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z"
        fill={resolveColor(props.color, theme) ?? "#e11d48"}
      />
    </svg>
  ),
};
