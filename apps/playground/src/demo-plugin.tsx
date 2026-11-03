import { definePlugin } from "@miditor/editor";
import { shopTool } from "./ShopTool";

/** A plugin (`?plugin`): a button next to Save, the Themes tool hidden and a tool of its own on the rail. */
export const demoPlugin = definePlugin({
  name: "demo",
  apiVersion: 1,
  overrides: {
    headerActions: ({ children }) => (
      <>
        <button type="button" data-testid="plugin-button">
          Plugin
        </button>
        {children}
      </>
    ),
  },
  hide: ["tool.themes"],
  config: { tools: [shopTool] },
});
