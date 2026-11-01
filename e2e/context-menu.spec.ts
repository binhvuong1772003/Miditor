import { expect, test } from "@playwright/test";
import { announcement, blocks, boxOf, openEditor, pressBlock } from "./helpers";

// The fresh page holds two blocks, `sample` and `sample-2`, both children of the page.
const idsInOrder = (page: import("@playwright/test").Page) =>
  blocks(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-midito-id")));

/** Selects a block, opens the menu on it with a right press and clicks one of its lines. */
async function choose(page: import("@playwright/test").Page, id: string, name: string) {
  await pressBlock(page, id);
  const box = await boxOf(page, id);
  await page.mouse.click(box.x + 20, box.y + 20, { button: "right" });
  await page.getByRole("menuitem", { name: new RegExp(`^${name}`) }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

test("Duplicate in the menu, chosen with the mouse, copies the selected block", async ({
  page,
}) => {
  const before = await blocks(page).count();
  await choose(page, "sample", "Duplicate");
  await expect(blocks(page)).toHaveCount(before + 1);
  await expect(announcement(page)).not.toHaveText("Nothing selected");
});

test("Delete in the menu, chosen with the mouse, takes away the selected block", async ({
  page,
}) => {
  const before = await blocks(page).count();
  await choose(page, "sample", "Delete");
  await expect(blocks(page)).toHaveCount(before - 1);
});

test("Send to back in the menu, chosen with the mouse, moves the block under the others", async ({
  page,
}) => {
  const before = await idsInOrder(page);
  const top = before.filter((id) => id !== "root").at(-1) as string;
  await choose(page, top, "Send to back");
  const after = await idsInOrder(page);
  expect(after).not.toEqual(before);
  expect(after.filter((id) => id !== "root")[0]).toBe(top);
});
