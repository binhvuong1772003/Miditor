import type { CustomFieldProps } from "@miditor/editor";

/** The products of the host's shop, which the picker chooses from. */
export const PRODUCTS = [
  { id: "p1", name: "Blue mug" },
  { id: "p2", name: "Red hat" },
  { id: "p3", name: "Green bag" },
];

/**
 * The host's own input for a `custom` field (`config.customFields["product-picker"]`): a list of its
 * shop's products. What it stores is its own shape, `{ id, name }`.
 */
export function ProductPicker({ label, value, onChange, readOnly }: CustomFieldProps) {
  const id = typeof value === "object" && value !== null && !Array.isArray(value) ? value.id : "";
  return (
    <label>
      <span>{label}</span>
      <select
        data-testid="product-picker"
        value={typeof id === "string" ? id : ""}
        disabled={readOnly}
        onChange={(event) => {
          const product = PRODUCTS.find((item) => item.id === event.target.value);
          if (product) onChange(product);
        }}
      >
        {PRODUCTS.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>
    </label>
  );
}
