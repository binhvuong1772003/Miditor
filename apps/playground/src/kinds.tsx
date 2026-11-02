import { type Registry, type Renderer, resolveColor } from "@miditor/editor";

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
  // A kind with a list of objects: the entries of a menu, each a label and a link.
  Menu: {
    label: "Menu",
    category: "From your website",
    icon: "box",
    keywords: ["navigation", "demo"],
    size: { w: 320, h: 48 },
    canContain: false,
    defaultProps: { items: [{ label: "Home", link: "" }] },
    fields: {
      items: {
        type: "array",
        label: "Entries",
        minItems: 1,
        maxItems: 5,
        item: {
          type: "object",
          label: "Entry",
          fields: {
            label: { type: "text", label: "Label", maxLength: 20 },
            link: { type: "link", label: "Link" },
          },
        },
      },
    },
  },
  // A kind with a field the host draws the input of (`config.customFields`): a product picker.
  Product: {
    label: "Product",
    category: "From your website",
    icon: "shape",
    keywords: ["shop", "demo"],
    size: { w: 200, h: 60 },
    canContain: false,
    defaultProps: { product: { id: "p1", name: "Blue mug" } },
    fields: { product: { type: "custom", label: "Product", kind: "product-picker" } },
  },
};

/** How the host draws its own kind: a heart that fills its box, in the colour stored on the block. */
export const renderers: Record<string, Renderer> = {
  Menu: ({ props }) => {
    const items = Array.isArray(props.items) ? props.items : [];
    return (
      <ul
        data-testid="menu-entries"
        style={{ display: "flex", gap: 16, listStyle: "none", margin: 0, padding: 8 }}
      >
        {items.map((item, at) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the entries have no ids
          <li key={at}>
            {typeof item === "object" && item !== null && !Array.isArray(item)
              ? String(item.label ?? "")
              : ""}
          </li>
        ))}
      </ul>
    );
  },
  Product: ({ props }) => {
    const product = props.product;
    const name =
      typeof product === "object" && product !== null && !Array.isArray(product)
        ? String(product.name ?? "")
        : "";
    return <div style={{ padding: 8, font: "600 16px system-ui" }}>{name}</div>;
  },
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
