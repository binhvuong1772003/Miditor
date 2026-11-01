import { expect, test } from "@playwright/test";
import { addFromBlocks, openEditor, properties, saveState } from "./helpers";

// A host that tells the editor nothing about its storage (`?plain`): the header follows the Save
// button, so "saved" means the page is the one that was last saved.
test.beforeEach(async ({ page }) => {
  await openEditor(page, "&plain");
});

const close = async (page: import("@playwright/test").Page) => {
  await page.getByRole("button", { name: "Close" }).click();
};

test("a page that was opened counts as saved", async ({ page }) => {
  await expect(saveState(page)).toHaveAttribute("data-state", "saved");
});

test("a change makes it unsaved and Save makes it saved", async ({ page }) => {
  await addFromBlocks(page, "Text");
  await expect(saveState(page)).toHaveAttribute("data-state", "unsaved");
  await page.getByRole("button", { name: "Save" }).click();
  await close(page);
  await expect(saveState(page)).toHaveAttribute("data-state", "saved");
});

test("Undo past the saved page is unsaved and Redo back to it is saved", async ({ page }) => {
  await addFromBlocks(page, "Text");
  await page.getByRole("button", { name: "Save" }).click();
  await close(page);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(saveState(page)).toHaveAttribute("data-state", "unsaved");
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(saveState(page)).toHaveAttribute("data-state", "saved");
});

test("Save with a value still being typed saves it, and the page stays saved", async ({ page }) => {
  await addFromBlocks(page, "Text");
  const size = properties(page).locator("input").first();
  await size.click();
  await size.fill("40");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog")).toContainText('"size": 40');
  await close(page);
  await expect(saveState(page)).toHaveAttribute("data-state", "saved");
  await page.waitForTimeout(500);
  await expect(saveState(page)).toHaveAttribute("data-state", "saved");
});

test("Save after the same value was typed again still saves the page", async ({ page }) => {
  await addFromBlocks(page, "Text");
  await expect(saveState(page)).toHaveAttribute("data-state", "unsaved");
  const size = properties(page).locator("input").first();
  await size.click();
  await size.fill("24");
  await page.getByRole("button", { name: "Save" }).click();
  await close(page);
  await expect(saveState(page)).toHaveAttribute("data-state", "saved");
});
