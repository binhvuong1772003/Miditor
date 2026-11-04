import { expect, test } from "@playwright/test";
import {
  addFromBlocks,
  addTwoTexts,
  announcement,
  blocks,
  boxOf,
  dragBy,
  openEditor,
  pressBlock,
  resizeBy,
  surface,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

test("dragging a block moves it by the distance of the hand", async ({ page }) => {
  await addFromBlocks(page, "Text");
  const before = await boxOf(page, "n1");
  await dragBy(page, "n1", 80, 50);
  const after = await boxOf(page, "n1");
  expect(after.x - before.x).toBeCloseTo(80, -1);
  expect(after.y - before.y).toBeCloseTo(50, -1);
  expect([after.width, after.height]).toEqual([before.width, before.height]);
});

test("a drag is one step: Undo puts the block back and Redo moves it again", async ({ page }) => {
  await addFromBlocks(page, "Text");
  const before = await boxOf(page, "n1");
  await dragBy(page, "n1", 80, 50);
  const moved = await boxOf(page, "n1");

  await page.keyboard.press("ControlOrMeta+z");
  expect(await boxOf(page, "n1")).toEqual(before);
  await page.keyboard.press("ControlOrMeta+Shift+z");
  expect(await boxOf(page, "n1")).toEqual(moved);
});

test("the arrow keys nudge the selected block", async ({ page }) => {
  await addFromBlocks(page, "Text");
  const before = await boxOf(page, "n1");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  const after = await boxOf(page, "n1");
  expect(after.x).toBeGreaterThan(before.x);
  expect(after.y).toBeGreaterThan(before.y);
});

test("dragging a corner handle changes the size and keeps the opposite corner", async ({
  page,
}) => {
  await addFromBlocks(page, "Text");
  const before = await boxOf(page, "n1");
  await resizeBy(page, "se", 40, 30);
  const after = await boxOf(page, "n1");
  expect(after.width).toBeGreaterThan(before.width + 30);
  expect(after.height).toBeGreaterThan(before.height + 20);
  expect([after.x, after.y]).toEqual([before.x, before.y]);
});

test("a resize is one step too", async ({ page }) => {
  await addFromBlocks(page, "Text");
  const before = await boxOf(page, "n1");
  await resizeBy(page, "se", 40, 30);
  await page.keyboard.press("ControlOrMeta+z");
  expect(await boxOf(page, "n1")).toEqual(before);
});

test("Shift adds a block of the same level, and Ctrl+G groups them", async ({ page }) => {
  await addTwoTexts(page);
  await pressBlock(page, "n1");
  await pressBlock(page, "n2", true);
  await expect(announcement(page)).toHaveText("2 blocks selected");

  await page.keyboard.press("ControlOrMeta+g");
  await expect(surface(page).locator('[data-miditor-type="Group"]')).toHaveCount(1);
  await expect(
    surface(page).locator('[data-miditor-type="Group"] [data-miditor-type="Text"]'),
  ).toHaveCount(2);
});

test("Shift+Ctrl+G takes the blocks out of their group", async ({ page }) => {
  await addTwoTexts(page);
  await pressBlock(page, "n1");
  await pressBlock(page, "n2", true);
  await page.keyboard.press("ControlOrMeta+g");
  await expect(surface(page).locator('[data-miditor-type="Group"]')).toHaveCount(1);

  await page.keyboard.press("ControlOrMeta+Shift+g");
  await expect(surface(page).locator('[data-miditor-type="Group"]')).toHaveCount(0);
  await expect(surface(page).locator('[data-miditor-type="Text"]')).toHaveCount(2);
});

test("grouping can be undone", async ({ page }) => {
  await addTwoTexts(page);
  const count = await blocks(page).count();
  await pressBlock(page, "n1");
  await pressBlock(page, "n2", true);
  await page.keyboard.press("ControlOrMeta+g");
  await expect(blocks(page)).toHaveCount(count + 1);

  await page.keyboard.press("ControlOrMeta+z");
  await expect(blocks(page)).toHaveCount(count);
});
