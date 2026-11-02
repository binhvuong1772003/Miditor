import { expect, test } from "@playwright/test";
import {
  addFromBlocks,
  addTwoTexts,
  announcement,
  blocks,
  boxOf,
  openEditor,
  pressBlock,
} from "./helpers";

// The commands by name: the right-click menu is read with the keyboard, because a mouse press on one
// of its lines is a separate thing (the canvas takes it). Space, not Enter: Enter on a line bubbles to the
// editor, which takes it to go into the words of a Text block (found with these specs, not changed).

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

const menuLine = (page: import("@playwright/test").Page, name: RegExp) =>
  page.getByRole("menuitem", { name });

async function openMenu(page: import("@playwright/test").Page, id: string): Promise<void> {
  const box = await boxOf(page, id);
  await page.mouse.click(box.x + 20, box.y + 20, { button: "right" });
  await expect(page.getByRole("menu")).toBeVisible();
}

test.describe("the right-click menu", () => {
  test("shows the keys next to the lines that have them", async ({ page }) => {
    await addFromBlocks(page, "Text");
    await openMenu(page, "n1");
    await expect(menuLine(page, /Duplicate/)).toContainText("Ctrl+D");
    await expect(menuLine(page, /Delete/)).toContainText("Del");
    await expect(menuLine(page, /^Group/)).toContainText("Ctrl+G");
    await expect(menuLine(page, /Ungroup/)).toContainText("Ctrl+Shift+G");
  });

  test("Duplicate copies the block and says so", async ({ page }) => {
    await addFromBlocks(page, "Text");
    const before = await blocks(page).count();
    await openMenu(page, "n1");
    await menuLine(page, /Duplicate/).press("Space");
    await expect(blocks(page)).toHaveCount(before + 1);
    await expect(announcement(page)).toContainText("duplicated");
  });

  test("Delete takes the block away and says so", async ({ page }) => {
    await addFromBlocks(page, "Text");
    const before = await blocks(page).count();
    await openMenu(page, "n1");
    await menuLine(page, /Delete/).press("Space");
    await expect(blocks(page)).toHaveCount(before - 1);
    await expect(announcement(page)).toContainText("deleted");
  });

  test("Group needs more than one block, makes a group, and Ungroup takes it apart", async ({
    page,
  }) => {
    await addTwoTexts(page);
    await openMenu(page, "n2");
    await expect(menuLine(page, /^Group/)).toBeDisabled();
    await page.keyboard.press("Escape");
    const idsOf = () =>
      blocks(page).evaluateAll((els) => els.map((el) => el.getAttribute("data-miditor-id") ?? ""));
    const before = await idsOf();
    await pressBlock(page, "n1", true);
    await openMenu(page, "n2");
    await menuLine(page, /^Group/).press("Space");
    await expect(blocks(page)).toHaveCount(before.length + 1);
    // The group is selected, so it can be taken apart.
    const group = (await idsOf()).find((id) => !before.includes(id)) as string;
    await openMenu(page, group);
    await expect(menuLine(page, /Ungroup/)).toBeEnabled();
    await menuLine(page, /Ungroup/).press("Space");
    await expect(blocks(page)).toHaveCount(before.length);
  });

  test("Bring forward and Send backward reorder the blocks", async ({ page }) => {
    await addTwoTexts(page);
    await openMenu(page, "n2");
    await expect(menuLine(page, /Bring forward/)).toBeEnabled();
    await menuLine(page, /Send to back/).press("Space");
    const ids = await blocks(page).evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-miditor-id")),
    );
    expect(ids.indexOf("n2")).toBeLessThan(ids.indexOf("n1"));
  });

  test("every line that changes blocks is off on the phone", async ({ page }) => {
    await addFromBlocks(page, "Text");
    await page.getByRole("button", { name: "Phone", exact: true }).click();
    await openMenu(page, "n1");
    for (const name of [/Duplicate/, /Delete/, /Bring forward/, /Send to back/, /^Group/]) {
      await expect(menuLine(page, name)).toBeDisabled();
    }
  });
});

test.describe("the toolbar", () => {
  test("Undo and Redo are off with nothing to step to and on after a change", async ({ page }) => {
    const undo = page.getByRole("button", { name: "Undo", exact: true });
    const redo = page.getByRole("button", { name: "Redo", exact: true });
    await expect(undo).toBeDisabled();
    await addFromBlocks(page, "Text");
    await expect(undo).toBeEnabled();
    await undo.click();
    await expect(redo).toBeEnabled();
    await expect(undo).toBeDisabled();
  });

  test("the rail tool that is shown shuts its panel when pressed again", async ({ page }) => {
    const layers = page.getByRole("button", { name: "Layers", exact: true });
    await layers.click();
    await expect(layers).toHaveAttribute("aria-current", "true");
    await layers.click();
    await expect(layers).not.toHaveAttribute("aria-current", "true");
  });
});
