import { expect, test } from "@playwright/test";
import { openEditor } from "./helpers";

// A plugin (`?plugin`) bundles a button next to Save, a hidden tool and a tool of its own.

test.describe("a plugin", () => {
  test("adds its button, hides a tool and puts its own tool on the rail", async ({ page }) => {
    await openEditor(page, "&plugin");
    await expect(page.getByTestId("plugin-button")).toBeVisible();
    // The editor's own Save is still there, after the plugin's button.
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Themes/ })).toHaveCount(0);
    await page.getByRole("button", { name: /Shop/ }).click();
    await expect(page.getByTestId("shop-panel")).toBeVisible();
  });

  test("changes nothing without it", async ({ page }) => {
    await openEditor(page);
    await expect(page.getByTestId("plugin-button")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Themes/ })).toBeVisible();
  });
});
