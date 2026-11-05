import { expect, test } from "@playwright/test";
import {
  addFromBlocks,
  addTwoTexts,
  boxOf,
  dragBy,
  openEditor,
  pressBlock,
  surface,
} from "./helpers";

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
  const turn = surface(page).locator(".moveable-rotation-control").first();
  const handle = await turn.boundingBox();
  const block = await boxOf(page, "n1");
  if (!handle) throw new Error("no turn handle");
  const centre = { x: block.x + block.width / 2, y: block.y + block.height / 2 };
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(centre.x + 150, centre.y, { steps: 10 });
  await page.mouse.up();
  const turn_ = () =>
    surface(page)
      .locator('[data-miditor-id="n1"]')
      .evaluate((e) => getComputedStyle(e).rotate);
  await expect.poll(turn_).not.toBe("none");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect.poll(turn_).toBe("none");
});

// A drag over a block only goes into it once the pointer has rested there; the block it would go into is lit.
const REST = 400;
const inSample = (page: import("@playwright/test").Page) =>
  surface(page).locator('[data-miditor-id="sample"] [data-miditor-id="n1"]');

async function dragOntoSample(
  page: import("@playwright/test").Page,
  how: { rest: boolean; alt?: boolean },
): Promise<void> {
  const target = await boxOf(page, "sample");
  const block = await boxOf(page, "n1");
  await page.mouse.move(block.x + block.width / 2, block.y + block.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 14 });
  if (how.rest) await page.waitForTimeout(REST);
  if (how.alt) await page.keyboard.down("Alt");
  await page.mouse.up();
  if (how.alt) await page.keyboard.up("Alt");
}

test("a block dragged onto another one that can hold it, and rested there, goes into it", async ({
  page,
}) => {
  await addFromBlocks(page, "Text");
  await dragOntoSample(page, { rest: true });
  await expect(inSample(page)).toHaveCount(1);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(inSample(page)).toHaveCount(0);
});

test("a block that only passes over another one does not go into it", async ({ page }) => {
  await addFromBlocks(page, "Text");
  await dragOntoSample(page, { rest: false });
  await expect(inSample(page)).toHaveCount(0);
});

test("the block a drag would go into is lit, and says so, only once the pointer has rested on it", async ({
  page,
}) => {
  await addFromBlocks(page, "Text");
  const target = await boxOf(page, "sample");
  const block = await boxOf(page, "n1");
  await page.mouse.move(block.x + block.width / 2, block.y + block.height / 2);
  await page.mouse.down();
  // Over bare page: nothing to light but the page, which says so.
  await page.mouse.move(block.x + block.width / 2 + 30, block.y + block.height / 2 + 30, {
    steps: 4,
  });
  await expect(page.getByText("Into Box")).toHaveCount(0);
  // Over the box and resting: it is lit.
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 14 });
  await expect(page.getByText("Into Box")).toBeVisible();
  // Off it again: the light goes out with the pointer.
  await page.mouse.move(block.x, block.y, { steps: 10 });
  await expect(page.getByText("Into Box")).toHaveCount(0);
  await page.mouse.up();
});

test("Alt at the drop keeps a block out of the box it rested on", async ({ page }) => {
  await addFromBlocks(page, "Text");
  await dragOntoSample(page, { rest: true, alt: true });
  await expect(inSample(page)).toHaveCount(0);
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
