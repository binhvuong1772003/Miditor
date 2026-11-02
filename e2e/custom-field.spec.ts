import { expect, type Page, test } from "@playwright/test";
import { addFromBlocks, blocks, openEditor, properties } from "./helpers";

// A host draws the input of a `custom` field (`config.customFields`): a product picker for a Product block.

const product = (page: Page) => page.locator('[data-miditor-type="Product"]');

test.describe("a field the host draws the input of", () => {
  test("the host's input edits the block and undo brings the value back", async ({ page }) => {
    await openEditor(page);
    await addFromBlocks(page, "Product");
    await expect(product(page)).toContainText("Blue mug");
    const picker = properties(page).getByTestId("product-picker");
    await expect(picker).toBeVisible();
    await picker.selectOption("p2");
    await expect(product(page)).toContainText("Red hat");
    await page.keyboard.press("Control+z");
    await expect(product(page)).toContainText("Blue mug");
  });

  test("the input keeps its state while the value changes, in StrictMode too", async ({ page }) => {
    await openEditor(page);
    await addFromBlocks(page, "Product");
    const picker = properties(page).getByTestId("product-picker");
    await picker.selectOption("p3");
    await picker.focus();
    await expect(picker).toBeFocused();
    await expect(product(page)).toContainText("Green bag");
  });

  test("a kind with no input gets a note, and the rest of the panel works", async ({ page }) => {
    const warnings: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "warning" &&
        message.text().includes("no input for the custom field")
      ) {
        warnings.push(message.text());
      }
    });
    await openEditor(page, "&nopicker");
    await addFromBlocks(page, "Product");
    await expect(properties(page).getByRole("note")).toContainText("product-picker");
    await expect(properties(page).getByTestId("product-picker")).toHaveCount(0);
    expect(warnings).toHaveLength(1);
    const count = await blocks(page).count();
    await addFromBlocks(page, "Text");
    await expect(blocks(page)).toHaveCount(count + 1);
  });
});
