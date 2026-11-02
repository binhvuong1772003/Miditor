import { expect, test } from "@playwright/test";
import { blocks, openEditor } from "./helpers";

// A host puts a tool of its own on the rail (`?tools`), with a panel it draws.

test.describe("a tool of the host on the rail", () => {
  test("is on the rail after the editor's, and its panel opens", async ({ page }) => {
    await openEditor(page, "&tools");
    const rail = page.getByRole("navigation", { name: "Tools" });
    const names = await rail.getByRole("button").allInnerTexts();
    expect(names.at(-1)).toContain("Shop");
    await rail.getByRole("button", { name: /Shop/ }).click();
    await expect(page.getByTestId("shop-panel")).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Shop" })).toBeVisible();
  });

  test("drives the editor through the control object it is given", async ({ page }) => {
    await openEditor(page, "&tools");
    await page.getByRole("button", { name: /Shop/ }).click();
    const before = await blocks(page).count();
    await page.getByRole("button", { name: "Add Blue mug" }).click();
    await expect(blocks(page)).toHaveCount(before + 1);
    await expect(page.getByTestId("shop-selection")).not.toHaveText("Selected: none");
    await page.getByRole("button", { name: /Blocks/ }).click();
    await expect(page.getByTestId("shop-panel")).toHaveCount(0);
  });

  test("is absent when the host gives none", async ({ page }) => {
    await openEditor(page);
    await expect(page.getByRole("button", { name: /Shop/ })).toHaveCount(0);
  });
});
