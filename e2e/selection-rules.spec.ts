import { expect, test } from "@playwright/test";
import {
  announcement,
  blocks,
  boxOf,
  openEditor,
  pressBlock,
  properties,
  surface,
} from "./helpers";

// The fresh page holds two blocks, `sample` and `sample-2`, both children of the page.
const picked = (page: import("@playwright/test").Page) =>
  surface(page).locator("[data-miditor-picked]");

async function marqueeAll(page: import("@playwright/test").Page): Promise<void> {
  await page.mouse.move(430, 90);
  await page.mouse.down();
  await page.mouse.move(1100, 880, { steps: 12 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

test("a box dragged over the empty page selects the blocks it touches", async ({ page }) => {
  await marqueeAll(page);
  await expect(announcement(page)).toHaveText("2 blocks selected");
  await expect(picked(page)).toHaveCount(1);
});

test("Shift adds a block of the same level to the selection and Shift again takes it out", async ({
  page,
}) => {
  await pressBlock(page, "sample");
  await pressBlock(page, "sample-2", true);
  await expect(announcement(page)).toHaveText("2 blocks selected");
  await pressBlock(page, "sample-2", true);
  await expect(picked(page)).toHaveCount(0);
});

test("Delete takes away the selected block and the picked ones, and Undo brings them back", async ({
  page,
}) => {
  const before = await blocks(page).count();
  await marqueeAll(page);
  await page.keyboard.press("Delete");
  await expect(blocks(page)).toHaveCount(1);
  await expect(properties(page)).toContainText("Page info");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(blocks(page)).toHaveCount(before);
  // The selection does not come back with the blocks.
  await expect(properties(page)).toContainText("Page info");
});

test("Undo keeps the selection while its block is still there", async ({ page }) => {
  await pressBlock(page, "sample");
  const box = await boxOf(page, "sample");
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 60, { steps: 6 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(properties(page)).not.toContainText("Page info");
});

test("Undo lets go of a block that is no longer there", async ({ page }) => {
  await page.getByRole("button", { name: "Text", exact: true }).first().click();
  await expect(properties(page)).not.toContainText("Page info");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(properties(page)).toContainText("Page info");
});

test("Undo clears the blocks picked besides the selected one", async ({ page }) => {
  // Something to undo first: a new block.
  await page.getByRole("button", { name: "Text", exact: true }).first().click();
  await marqueeAll(page);
  await expect(picked(page)).not.toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(picked(page)).toHaveCount(0);
});

test("a group is entered with a double click and left with Esc, one level at a time", async ({
  page,
}) => {
  await marqueeAll(page);
  await page.keyboard.press("ControlOrMeta+g");
  await expect(announcement(page)).toContainText("Group selected");

  const box = await boxOf(page, "sample");
  await page.mouse.dblclick(box.x + 10, box.y + 10);
  await expect(properties(page)).not.toContainText("Group");
  await expect(properties(page)).not.toContainText("Page info");

  await page.keyboard.press("Escape");
  await expect(properties(page)).toContainText("Group");
  await page.keyboard.press("Escape");
  await expect(properties(page)).toContainText("Page info");
});

test("a right click on a block that is not selected selects it", async ({ page }) => {
  await pressBlock(page, "sample");
  const other = await boxOf(page, "sample-2");
  await page.mouse.click(other.x + 10, other.y + 10, { button: "right" });
  await expect(announcement(page)).toContainText("selected");
  await expect(properties(page)).not.toContainText("Page info");
  await page.keyboard.press("Escape");
});

test("Ctrl+D copies the selected block and selects the copy", async ({ page }) => {
  await page.getByRole("button", { name: "Text", exact: true }).first().click();
  const before = await blocks(page).count();
  await page.keyboard.press("ControlOrMeta+d");
  await expect(blocks(page)).toHaveCount(before + 1);
  await expect(announcement(page)).toContainText("duplicated");
});

test("pressing a block of a group and then the empty page selects nothing", async ({ page }) => {
  await pressBlock(page, "sample");
  await page.locator("section[aria-label='Canvas']").click({ position: { x: 4, y: 4 } });
  await expect(properties(page)).toContainText("Page info");
});

const outlined = (page: import("@playwright/test").Page, id: string) =>
  surface(page)
    .locator(`[data-miditor-id="${id}"]`)
    .evaluate((element) => element.style.outline.includes("solid"));

test("a block under the pointer is outlined, and the outline goes when the pointer leaves", async ({
  page,
}) => {
  const box = await boxOf(page, "sample");
  await page.mouse.move(box.x + 5, box.y + 5);
  await page.mouse.move(box.x + 20, box.y + 20, { steps: 5 });
  await expect.poll(() => outlined(page, "sample")).toBe(true);
  await page.mouse.move(5, 400, { steps: 5 });
  await expect.poll(() => outlined(page, "sample")).toBe(false);
});

test("a row of the Layers tool outlines its block while the pointer is over it", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.locator('[data-layer="sample-2"]').hover();
  await expect.poll(() => outlined(page, "sample-2")).toBe(true);
  await page.mouse.move(5, 400, { steps: 5 });
  await expect.poll(() => outlined(page, "sample-2")).toBe(false);
});
