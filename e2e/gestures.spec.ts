import { expect, test } from "@playwright/test";
import { addFromBlocks, addTwoTexts, boxOf, dragBy, openEditor, pressBlock } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

test("several selected blocks move together by the same distance", async ({ page }) => {
  await addTwoTexts(page);
  await pressBlock(page, "n1");
  await pressBlock(page, "n2", true);
  const [one, two] = [await boxOf(page, "n1"), await boxOf(page, "n2")];
  await dragBy(page, "n2", 40, 30);
  const [one2, two2] = [await boxOf(page, "n1"), await boxOf(page, "n2")];
  expect(one2.x - one.x).toBeCloseTo(40, -1);
  expect(one2.y - one.y).toBeCloseTo(30, -1);
  expect(two2.x - two.x).toBeCloseTo(40, -1);
  expect(two2.y - two.y).toBeCloseTo(30, -1);
});

test("moving several blocks is one step to undo", async ({ page }) => {
  await addTwoTexts(page);
  await pressBlock(page, "n1");
  await pressBlock(page, "n2", true);
  const before = [await boxOf(page, "n1"), await boxOf(page, "n2")];
  await dragBy(page, "n2", 40, 30);
  await page.getByRole("button", { name: "Undo" }).click();
  expect([await boxOf(page, "n1"), await boxOf(page, "n2")]).toEqual(before);
});

test("the turn handle turns a block, and Undo turns it back", async ({ page }) => {
  await addFromBlocks(page, "Text");
  const turn = page.locator(".moveable-rotation-control").first();
  const handle = await turn.boundingBox();
  const block = await boxOf(page, "n1");
  if (!handle) throw new Error("no turn handle");
  const centre = { x: block.x + block.width / 2, y: block.y + block.height / 2 };
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(centre.x + 150, centre.y, { steps: 10 });
  await page.mouse.up();
  const turn_ = () =>
    page.locator('[data-midito-id="n1"]').evaluate((e) => getComputedStyle(e).rotate);
  await expect.poll(turn_).not.toBe("none");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect.poll(turn_).toBe("none");
});

test("a block dragged onto another one that can hold it goes into it", async ({ page }) => {
  await addFromBlocks(page, "Text");
  const target = await boxOf(page, "sample");
  const block = await boxOf(page, "n1");
  await page.mouse.move(block.x + block.width / 2, block.y + block.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 14 });
  await page.mouse.up();
  await expect(page.locator('[data-midito-id="sample"] [data-midito-id="n1"]')).toHaveCount(1);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator('[data-midito-id="sample"] [data-midito-id="n1"]')).toHaveCount(0);
});

test("the frame around several blocks moves them all", async ({ page }) => {
  await addTwoTexts(page);
  await pressBlock(page, "n1");
  await pressBlock(page, "n2", true);
  const before = await boxOf(page, "n1");
  await dragBy(page, "n1", -30, -20);
  const after = await boxOf(page, "n1");
  expect(after.x - before.x).toBeCloseTo(-30, -1);
});
