import { expect, type Page, test } from "@playwright/test";
import { openEditor, properties } from "./helpers";

// The page has a height for the phone of its own: as tall as its blocks need until one is set.

const root = (page: Page) => page.locator('[data-miditor-id="root"]').first();
const height = async (page: Page) => Math.round((await root(page).boundingBox())?.height ?? 0);
const field = (page: Page) => properties(page).locator('input[type="number"][min="200"]');

test.describe("the height of the page on a phone", () => {
  test("fits the blocks, is set by hand, and goes back to fitting with Auto", async ({ page }) => {
    await openEditor(page);
    const desktop = await height(page);
    await page.getByRole("button", { name: "Phone", exact: true }).click();

    // Two small blocks: the page is as tall as they need, not as the desktop page.
    const fitted = await height(page);
    expect(fitted).toBeLessThan(desktop);
    await expect(field(page)).toHaveValue(String(fitted));

    await field(page).fill("812");
    await field(page).press("Enter");
    await expect.poll(() => height(page)).toBe(812);

    await page.getByRole("button", { name: "Auto", exact: true }).click();
    await expect.poll(() => height(page)).toBe(fitted);

    // The desktop page was never touched.
    await page.getByRole("button", { name: "Desktop", exact: true }).click();
    expect(await height(page)).toBe(desktop);
  });

  test("a height set for the phone is undone", async ({ page }) => {
    await openEditor(page);
    await page.getByRole("button", { name: "Phone", exact: true }).click();
    const fitted = await height(page);
    await field(page).fill("700");
    await field(page).press("Enter");
    await expect.poll(() => height(page)).toBe(700);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect.poll(() => height(page)).toBe(fitted);
  });
});
