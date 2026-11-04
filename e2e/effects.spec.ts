import { expect, test } from "@playwright/test";
import { addFromBlocks, openEditor, properties, surface } from "./helpers";

// Opacity and shadow: set in the Effects section, drawn on the page, undone with the toolbar.

const block = (page: import("@playwright/test").Page) =>
  surface(page).locator('[data-miditor-id="n1"]').first();
const css = (page: import("@playwright/test").Page, prop: string) =>
  block(page).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

test.describe("opacity and shadow", () => {
  test("opacity is typed in the panel, drawn, and undone", async ({ page }) => {
    await openEditor(page);
    await addFromBlocks(page, "Text");
    expect(await css(page, "opacity")).toBe("1");
    const field = properties(page).getByLabel("Opacity").last();
    await field.fill("35");
    await field.press("Enter");
    expect(await css(page, "opacity")).toBe("0.35");
    await page.getByRole("button", { name: "Undo" }).click();
    expect(await css(page, "opacity")).toBe("1");
  });

  test("a shadow preset is drawn, can be adjusted, and None removes it", async ({ page }) => {
    await openEditor(page);
    await addFromBlocks(page, "Text");
    expect(await css(page, "box-shadow")).toBe("none");
    await properties(page).getByRole("button", { name: "Medium" }).click();
    expect(await css(page, "box-shadow")).not.toBe("none");
    const blur = properties(page).getByLabel("Blur");
    await blur.fill("40");
    await blur.press("Enter");
    expect(await css(page, "box-shadow")).toContain("40px");
    await page.getByRole("button", { name: "Undo" }).click();
    expect(await css(page, "box-shadow")).toContain("16px");
    await properties(page).getByRole("button", { name: "None" }).click();
    expect(await css(page, "box-shadow")).toBe("none");
  });
});
