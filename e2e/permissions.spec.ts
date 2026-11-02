import { expect, type Page, test } from "@playwright/test";
import { announcement, blocks, boxOf, dragBy, openEditor, pressBlock, properties } from "./helpers";

// A host locks blocks and hides parts through `permissions` and `hide` (`?permissions`): the block
// `footer` cannot be deleted, dragged, edited or duplicated, every other block is free. With `&viewer`
// nothing can be changed. The host's notice of the last refusal is `denied`, drawn outside the editor.

const FOOTER = "footer";
const open = (page: Page, query = "") => openEditor(page, `&permissions${query}`);
const denied = (page: Page) => page.getByTestId("denied");
const count = (page: Page) => page.getByTestId("denied-count");
// A repeat of the same refusal within a second is told once; waiting past it tells each one.
const pastTheSecond = (page: Page) => page.waitForTimeout(1100);

async function openMenu(page: Page, id: string): Promise<void> {
  const box = await boxOf(page, id);
  await page.mouse.click(box.x + 20, box.y + 20, { button: "right" });
  await expect(page.getByRole("menu")).toBeVisible();
}

const menuLine = (page: Page, name: RegExp) => page.getByRole("menuitem", { name });

test.describe("a host locks blocks through permissions", () => {
  test("the Delete key, the menu line and editor.remove() all refuse the locked block", async ({
    page,
  }) => {
    await open(page);
    const before = await blocks(page).count();
    await pressBlock(page, FOOTER);

    await page.keyboard.press("Delete");
    await expect(count(page)).toHaveText("1");
    await expect(denied(page)).toHaveText("delete footer");
    await expect(blocks(page)).toHaveCount(before);

    await pastTheSecond(page);
    await openMenu(page, FOOTER);
    await expect(menuLine(page, /Delete/)).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(blocks(page)).toHaveCount(before);

    await pastTheSecond(page);
    await pressBlock(page, FOOTER);
    await page.getByRole("button", { name: "Host remove" }).click();
    await expect(page.getByTestId("host-remove-result")).toHaveText("false");
    await expect(count(page)).toHaveText("2");
    await expect(blocks(page)).toHaveCount(before);
    await expect(page.locator(`[data-midito-id="${FOOTER}"]`)).toBeVisible();
  });

  test("editor.remove() takes a free block away", async ({ page }) => {
    await open(page);
    const before = await blocks(page).count();
    await pressBlock(page, "sample");
    await page.getByRole("button", { name: "Host remove" }).click();
    await expect(page.getByTestId("host-remove-result")).toHaveText("true");
    await expect(blocks(page)).toHaveCount(before - 1);
    await expect(count(page)).toHaveText("0");
  });

  test("dragging the locked block changes nothing", async ({ page }) => {
    await open(page);
    const was = await boxOf(page, FOOTER);
    await dragBy(page, FOOTER, 120, 80);
    const now = await boxOf(page, FOOTER);
    expect(now).toEqual(was);
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  test("nudging the locked block with a held arrow key tells the host once", async ({ page }) => {
    await open(page);
    await pressBlock(page, FOOTER);
    const was = await boxOf(page, FOOTER);
    for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowRight");
    await expect(denied(page)).toHaveText("drag footer");
    await expect(count(page)).toHaveText("1");
    expect(await boxOf(page, FOOTER)).toEqual(was);
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  test("the locked block shows no resize handles and its fields are read-only", async ({
    page,
  }) => {
    await open(page);
    await pressBlock(page, "sample");
    await expect(page.locator(".moveable-se")).toHaveCount(1);
    await pressBlock(page, FOOTER);
    await expect(page.locator(".moveable-se")).toHaveCount(0);
    await expect(page.locator(".moveable-rotation")).toHaveCount(0);
    const fields = properties(page).locator("input, textarea, select");
    expect(await fields.count()).toBeGreaterThan(0);
    await expect(properties(page).locator("input:enabled, textarea:enabled")).toHaveCount(0);
    await expect(properties(page).locator("select:enabled")).toHaveCount(0);
    // A free block next to it can still be edited.
    await pressBlock(page, "sample");
    await expect(properties(page).locator("input:enabled").first()).toBeVisible();
  });

  test("a refused action shows the host's notice", async ({ page }) => {
    await open(page);
    await expect(denied(page)).toHaveText("");
    await pressBlock(page, FOOTER);
    await page.keyboard.press("Delete");
    await expect(denied(page)).toHaveText("delete footer");
    // The editor says it aloud too, for people who do not see the notice.
    await expect(announcement(page)).toContainText("Not allowed");
  });

  test("undo still works after other changes with the locked block present", async ({ page }) => {
    await open(page);
    const first = await boxOf(page, "sample");
    await dragBy(page, "sample", -100, 60);
    const moved = await boxOf(page, "sample");
    expect(moved.x).not.toBe(first.x);
    await pressBlock(page, FOOTER);
    await page.keyboard.press("Delete");
    await expect(denied(page)).toHaveText("delete footer");
    await page.getByRole("button", { name: "Undo" }).click();
    const back = await boxOf(page, "sample");
    expect(Math.round(back.x)).toBe(Math.round(first.x));
    expect(Math.round(back.y)).toBe(Math.round(first.y));
    await expect(page.locator(`[data-midito-id="${FOOTER}"]`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
    // Redo brings the free block back to where it was put, and still the footer is there.
    await page.getByRole("button", { name: "Redo" }).click();
    expect(Math.round((await boxOf(page, "sample")).x)).toBe(Math.round(moved.x));
  });

  test("the store-level paths refuse too: duplicate, group, cut", async ({ page }) => {
    await open(page);
    const before = await blocks(page).count();

    await pressBlock(page, FOOTER);
    await page.keyboard.press("Control+d");
    await expect(denied(page)).toHaveText("duplicate footer");
    await expect(blocks(page)).toHaveCount(before);

    await pastTheSecond(page);
    await page.keyboard.press("Control+x");
    await expect(blocks(page)).toHaveCount(before);
    await expect(page.locator(`[data-midito-id="${FOOTER}"]`)).toBeVisible();

    // Grouping a locked block with a free one is refused whole: no group, nothing moved.
    await pastTheSecond(page);
    const free = await boxOf(page, "sample");
    await pressBlock(page, "sample");
    await pressBlock(page, FOOTER, true);
    await page.keyboard.press("Control+g");
    await expect(denied(page)).toHaveText("drag footer");
    await expect(blocks(page)).toHaveCount(before);
    expect(await boxOf(page, "sample")).toEqual(free);
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  });
});

test.describe("a host hides parts of the editor", () => {
  test("hidden parts are absent", async ({ page }) => {
    // Without `hide`, the playground shows the Themes tool and the anchors of a free block.
    await openEditor(page);
    await expect(page.getByRole("button", { name: "Themes", exact: true })).toBeVisible();
    await pressBlock(page, "sample");
    await properties(page).getByRole("tab", { name: "Advanced" }).click();
    await expect(properties(page).getByText("Anchors", { exact: true })).toBeVisible();

    await open(page);
    await expect(page.getByRole("button", { name: "Blocks", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Layers", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Themes", exact: true })).toHaveCount(0);
    await pressBlock(page, "sample");
    await properties(page).getByRole("tab", { name: "Advanced" }).click();
    await expect(properties(page).getByText("Anchors", { exact: true })).toHaveCount(0);
  });
});

test.describe("a viewer can look but not change", () => {
  test("a viewer can select and look but nothing changes", async ({ page }) => {
    await open(page, "&viewer");
    const before = await blocks(page).count();
    await pressBlock(page, "sample");
    await expect(page.locator('aside[aria-label="Properties"]')).toBeVisible();
    await expect(page.locator(".moveable-se")).toHaveCount(0);

    // Typing into the words of a Text block does not open them.
    await boxOf(page, FOOTER);
    const box = await boxOf(page, FOOTER);
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByRole("textbox", { name: "Edit the text of the block" })).toHaveCount(0);
    await page.keyboard.type("abc");
    await expect(page.locator(`[data-midito-id="${FOOTER}"]`)).toContainText("Footer, kept");

    // Delete, a nudge and a drag of a free block change nothing.
    await pressBlock(page, "sample");
    const was = await boxOf(page, "sample");
    await page.keyboard.press("Delete");
    await page.keyboard.press("ArrowRight");
    await dragBy(page, "sample", 90, 50);
    expect(await boxOf(page, "sample")).toEqual(was);
    await expect(blocks(page)).toHaveCount(before);
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();

    // The fields can be read but not changed.
    await expect(properties(page).locator("input:enabled, textarea:enabled")).toHaveCount(0);

    // The cards are off, so adding by a click does nothing.
    const card = page.getByRole("button", { name: "Text", exact: true }).first();
    await expect(card).toBeDisabled();
    await card.click({ force: true });
    await expect(blocks(page)).toHaveCount(before);
  });

  test("a drop of a library card into the page is refused for the viewer", async ({ page }) => {
    await open(page, "&viewer");
    const before = await blocks(page).count();
    const tile = page.getByRole("button", { name: "Text", exact: true }).first();
    const from = await tile.boundingBox();
    const target = await boxOf(page, "root");
    if (!from) throw new Error("no tile");
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + 300, { steps: 12 });
    await page.mouse.up();
    await expect(blocks(page)).toHaveCount(before);
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  test("the viewer cannot duplicate, cut or group either, and the page is as it was", async ({
    page,
  }) => {
    await open(page, "&viewer");
    const before = await blocks(page).count();
    await pressBlock(page, "sample");
    await page.keyboard.press("Control+d");
    await page.keyboard.press("Control+x");
    await pressBlock(page, FOOTER, true);
    await page.keyboard.press("Control+g");
    await expect(blocks(page)).toHaveCount(before);
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
    // Nothing was written for the host to keep.
    const stored = await page.evaluate(() => localStorage.getItem("midito-playground-page"));
    expect(stored === null || JSON.parse(stored).root.children.length === 3).toBe(true);
  });
});
