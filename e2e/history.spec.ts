import { expect, test } from "@playwright/test";
import { addFromBlocks, blocks, openEditor, saveState } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

test("Undo takes a block away and Redo brings it back", async ({ page }) => {
  const before = await blocks(page).count();
  await addFromBlocks(page, "Box");
  const added = await blocks(page).count();
  expect(added).toBeGreaterThan(before);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(blocks(page)).toHaveCount(before);
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(blocks(page)).toHaveCount(added);
});

test("Ctrl+Z and Shift+Ctrl+Z do the same from the keyboard", async ({ page }) => {
  const before = await blocks(page).count();
  await addFromBlocks(page, "Box");
  const added = await blocks(page).count();

  await page.keyboard.press("ControlOrMeta+z");
  await expect(blocks(page)).toHaveCount(before);
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(blocks(page)).toHaveCount(added);
});

test("Undo and Redo are off when there is nothing to undo or redo", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  await addFromBlocks(page, "Box");
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Redo" })).toBeDisabled();
});

test("a change is unsaved until the host's autosave has stored it", async ({ page }) => {
  await expect(saveState(page)).toHaveAttribute("data-state", "saved");
  await addFromBlocks(page, "Box");
  await expect(saveState(page)).toHaveAttribute("data-state", "unsaved");
  // The playground stores 800 ms after the last change and answers 300 ms later.
  await expect(saveState(page)).toHaveAttribute("data-state", "saved", { timeout: 5000 });

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(saveState(page)).toHaveAttribute("data-state", "unsaved");
  await expect(saveState(page)).toHaveAttribute("data-state", "saved", { timeout: 5000 });
});

test("Save hands the page to the host's onSave", async ({ page }) => {
  await addFromBlocks(page, "Box");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog")).toContainText("Data to send");
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
