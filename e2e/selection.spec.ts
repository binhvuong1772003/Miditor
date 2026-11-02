import { expect, test } from "@playwright/test";
import { addFromBlocks, announcement, blocks, openEditor, openTool, properties } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openEditor(page);
  await addFromBlocks(page, "Box");
  await addFromBlocks(page, "Text");
});

test("a block added to the page is the one selected", async ({ page }) => {
  await expect(announcement(page)).toContainText("Text selected");
  await expect(properties(page)).toContainText("Text");
});

test("pressing a block selects it and pressing the empty page selects nothing", async ({
  page,
}) => {
  const box = page.locator('[data-miditor-type="Container"]').last();
  await box.click({ position: { x: 4, y: 4 } });
  await expect(properties(page)).toContainText("Box");

  // Outside every block, on the grey of the workspace, nothing stays selected.
  await page.locator("section[aria-label='Canvas']").click({ position: { x: 4, y: 4 } });
  await expect(properties(page)).toContainText("Page info");
});

test("Tab goes from block to block on the level and Shift+Tab goes back", async ({ page }) => {
  await openTool(page, "Layers");
  const pressed = page.locator('[data-layer][aria-pressed="true"]');
  const rows = page.locator("[data-layer]");
  const indexOfSelected = async () => {
    const id = await pressed.getAttribute("data-layer");
    return (await rows.evaluateAll((l) => l.map((e) => e.getAttribute("data-layer")))).indexOf(id);
  };

  await page
    .locator('[data-miditor-type="Container"]')
    .last()
    .click({ position: { x: 4, y: 4 } });
  const last = await indexOfSelected();
  await page.keyboard.press("Shift+Tab");
  const before = await indexOfSelected();
  expect(before).not.toBe(last);
  await page.keyboard.press("Tab");
  expect(await indexOfSelected()).toBe(last);
});

test("Escape lets go of the selection", async ({ page }) => {
  await page
    .locator('[data-miditor-type="Container"]')
    .last()
    .click({ position: { x: 4, y: 4 } });
  await page.keyboard.press("Escape");
  await expect(properties(page)).toContainText("Page info");
});

test("the Layers tool lists the blocks and selecting a row selects the block", async ({ page }) => {
  await openTool(page, "Layers");
  const rows = page.locator("[data-layer]");
  await expect(rows).toHaveCount((await blocks(page).count()) - 1);
  await rows.first().click();
  await expect(rows.first()).toHaveAttribute("aria-pressed", "true");
  await expect(properties(page)).not.toContainText("Page info");
});

test("selecting on the canvas shows in the Layers tool", async ({ page }) => {
  await openTool(page, "Layers");
  await page
    .locator('[data-miditor-type="Container"]')
    .last()
    .click({ position: { x: 4, y: 4 } });
  await expect(page.locator('[data-layer][aria-pressed="true"]')).toHaveCount(1);
});
