import { expect, test } from "@playwright/test";
import { addFromBlocks, announcement, boxOf, openEditor, openTool, surface } from "./helpers";

// The rows of the Layers tool can be dragged, by their grip, to change the order of blocks and to put a block into another.

const rows = (page: import("@playwright/test").Page) => page.locator("[data-layer]");
const grip = (page: import("@playwright/test").Page, id: string) =>
  page.locator(`[data-layer="${id}"]`).locator("xpath=..").locator("[data-layer-grip]");

test.beforeEach(async ({ page }) => {
  await openEditor(page);
  await openTool(page, "Layers");
});

test("dragging the grip of a row over the lower half of another puts the block under it in the list", async ({
  page,
}) => {
  // The fresh page holds `sample` and `sample-2`; the list shows the topmost, `sample-2`, first.
  await expect(rows(page)).toHaveCount(2);
  const first = await rows(page).first().getAttribute("data-layer");
  expect(first).toBe("sample-2");
  const from = await grip(page, "sample-2").boundingBox();
  const over = await page.locator('[data-layer="sample"]').boundingBox();
  if (!from || !over) throw new Error("the rows are not drawn");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(over.x + over.width / 2, over.y + over.height * 0.9, { steps: 12 });
  await page.mouse.up();
  await expect(rows(page).first()).toHaveAttribute("data-layer", "sample");
});

for (const zoomOuts of [0, 2]) {
  test(`dragging a row onto the middle of a box row puts the block in the box and keeps it where it is on the page, with the canvas zoomed out ${zoomOuts} times`, async ({
    page,
  }) => {
    for (let i = 0; i < zoomOuts; i++) await page.getByRole("button", { name: "Zoom out" }).click();
    await openTool(page, "Blocks");
    await addFromBlocks(page, "Text");
    await openTool(page, "Layers");
    const before = await boxOf(page, "n1");
    const from = await grip(page, "n1").boundingBox();
    const over = await page.locator('[data-layer="sample"]').boundingBox();
    if (!from || !over) throw new Error("the rows are not drawn");
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(over.x + over.width / 2, over.y + over.height / 2, { steps: 12 });
    await page.mouse.up();
    await expect(
      surface(page).locator('[data-miditor-id="sample"] [data-miditor-id="n1"]'),
    ).toHaveCount(1);
    const after = await boxOf(page, "n1");
    expect(Math.abs(after.x + after.width / 2 - (before.x + before.width / 2))).toBeLessThan(1.5);
    expect(Math.abs(after.y + after.height / 2 - (before.y + before.height / 2))).toBeLessThan(1.5);
    await expect(announcement(page)).toContainText("moved into");
  });
}
