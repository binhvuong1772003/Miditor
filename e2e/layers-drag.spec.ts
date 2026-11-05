import { expect, test } from "@playwright/test";
import {
  addFromBlocks,
  announcement,
  boxOf,
  openEditor,
  openTool,
  properties,
  surface,
} from "./helpers";

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

const order = async (page: import("@playwright/test").Page) =>
  rows(page).evaluateAll((lines) => lines.map((line) => line.getAttribute("data-layer")));

async function liftAndMove(
  page: import("@playwright/test").Page,
  id: string,
  presses: number,
  how: "drop" | "cancel",
): Promise<void> {
  await page.locator(`[data-layer="${id}"]`).click();
  await grip(page, id).focus();
  await page.keyboard.press("Space");
  for (let i = 0; i < presses; i++) await page.keyboard.press("ArrowDown");
  await page.keyboard.press(how === "drop" ? "Space" : "Escape");
}

test("the keyboard lifts a row with Space, moves it with the arrows and drops it with Space", async ({
  page,
}) => {
  expect(await order(page)).toEqual(["sample-2", "sample"]);
  const placed = await boxOf(page, "sample-2");
  await liftAndMove(page, "sample-2", 4, "drop");
  await expect.poll(() => order(page)).toEqual(["sample", "sample-2"]);
  // The focus is not lost: it is in the row that moved.
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.activeElement
          ?.closest("li")
          ?.querySelector("[data-layer]")
          ?.getAttribute("data-layer"),
      ),
    )
    .toBe("sample-2");
  // The keys were the lift's, not the page's: the selected block did not move by a nudge on the way.
  const after = await boxOf(page, "sample-2");
  // The arrows nudge down, by a px each: four of them would put it 4 px lower. (The page can shift a little across
  // when drawn in place, so only down is looked at.)
  expect(Math.abs(after.y - placed.y)).toBeLessThan(1.5);
});

test("the arrows that move through the list do not nudge the selected block", async ({ page }) => {
  const placed = await boxOf(page, "sample-2");
  await page.locator('[data-layer="sample-2"]').click();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  const after = await boxOf(page, "sample-2");
  expect([after.x, after.y]).toEqual([placed.x, placed.y]);
});

test("Escape cancels a lift and leaves the order and the selection as they were", async ({
  page,
}) => {
  await liftAndMove(page, "sample-2", 4, "cancel");
  // The lifted row goes back with a short animation, during which a copy of it is still in the list.
  await expect.poll(() => order(page)).toEqual(["sample-2", "sample"]);
  await expect(page.locator('[data-layer="sample-2"]')).toHaveAttribute("aria-pressed", "true");
  await expect(properties(page)).toContainText("Box");
});

test("one Undo takes back a drop", async ({ page }) => {
  await liftAndMove(page, "sample-2", 4, "drop");
  await expect.poll(() => order(page)).toEqual(["sample", "sample-2"]);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect.poll(() => order(page)).toEqual(["sample-2", "sample"]);
});

test("the grips are not there on the phone screen", async ({ page }) => {
  await expect(page.locator("[data-layer-grip]").first()).toBeAttached();
  await page.getByRole("button", { name: "Phone", exact: true }).click();
  await expect(page.locator("[data-layer-grip]")).toHaveCount(0);
  // Nor does a line of the list pose as a draggable button, for a screen reader or for the Tab key.
  await expect(page.locator("li[aria-roledescription]")).toHaveCount(0);
  await page.getByRole("button", { name: "Desktop", exact: true }).click();
  await expect(page.locator("[data-layer-grip]").first()).toBeAttached();
});

test("a block added while the list is open is named when it is lifted", async ({ page }) => {
  await page.locator('[data-layer="sample-2"]').click();
  await page.keyboard.press("ControlOrMeta+d");
  await expect(rows(page)).toHaveCount(3);
  const copy = await page.locator('[data-layer][aria-pressed="true"]').getAttribute("data-layer");
  if (!copy) throw new Error("the copy is not selected");
  await grip(page, copy).focus();
  await page.keyboard.press("Space");
  await expect(page.locator('[id^="dnd-kit-announcement"]')).toContainText("Picked up Box");
  await page.keyboard.press("Escape");
});

test("a block the host has locked is not moved, and the host is told", async ({ page }) => {
  await openEditor(page, "&permissions");
  await openTool(page, "Layers");
  const before = await order(page);
  expect(before).toContain("footer");
  const other = before.find((id) => id !== "footer") as string;
  const from = await grip(page, "footer").boundingBox();
  const over = await page.locator(`[data-layer="${other}"]`).boundingBox();
  if (!from || !over) throw new Error("the rows are not drawn");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    over.x + over.width / 2,
    over.y + (before[0] === "footer" ? over.height * 0.9 : 2),
    {
      steps: 12,
    },
  );
  await page.mouse.up();
  await expect(page.getByTestId("denied")).not.toHaveText("");
  await expect(announcement(page)).not.toContainText("moved");
  await expect.poll(() => order(page)).toEqual(before);
});
