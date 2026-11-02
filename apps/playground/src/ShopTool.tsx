import { type HostTool, type HostToolPanelProps, useEditor } from "@miditor/editor";
import { PRODUCTS } from "./ProductPicker";

/** The panel of the host's own tool (`?tools`): its shop's products, to add to the page. */
function ShopPanel({ editor, label }: HostToolPanelProps) {
  const selected = useEditor((view) => view.selection.id);
  return (
    <div data-testid="shop-panel" style={{ padding: 12 }}>
      <h3>{label}</h3>
      <p data-testid="shop-selection">Selected: {selected ?? "none"}</p>
      <ul>
        {PRODUCTS.map((product) => (
          <li key={product.id}>
            <button type="button" onClick={() => editor.addBlock("Product")}>
              Add {product.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The tool `?tools` puts on the rail. */
export const shopTool: HostTool = { id: "shop", label: "Shop", panel: ShopPanel };
