import type { ActionDef } from "@midito-kitchen/editor";

/** What the demo's buttons can do. A real host would add to a cart, open a dialog, call its API. */
export const actions: readonly ActionDef[] = [
  { name: "show-message", label: "Show a message", params: [{ name: "text", label: "Message" }] },
  {
    name: "add-to-cart",
    label: "Add to cart",
    params: [
      { name: "sku", label: "Product code" },
      { name: "qty", label: "How many", type: "number" },
    ],
  },
];
