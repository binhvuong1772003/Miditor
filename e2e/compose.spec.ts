import { expect, type Page, test } from "@playwright/test";
import { addFromBlocks, blocks, boxOf, dragBy, gotoFrame, pressBlock, surface } from "./helpers";

// A host lays the editor out itself (`?compose`): inside `<EditorProvider>` it places the parts where it
// wants them. Layers are on the right, Properties are in a dialog, the canvas fills the middle.
// `&bare` is a canvas alone, `&nocanvas` has no canvas, `&two` draws two providers on one page.

// The custom layouts have no Save button, so the page is ready when a block is drawn.
async function open(page: Page, query = ""): Promise<void> {
  await gotoFrame(page, `/?reset&compose${query}`);
  await expect(surface(page).locator('[data-miditor-id="sample"]')).toBeVisible();
}
const layer = (page: Page, id: string) => page.locator(`[data-layer="${id}"]`);
const layerRows = (page: Page) => page.locator("[data-layer]");
const selectionHandles = (page: Page) => surface(page).locator(".moveable-se");

async function openMenu(page: Page, id: string): Promise<void> {
  const box = await boxOf(page, id);
  await page.mouse.click(box.x + 20, box.y + 20, { button: "right" });
  await expect(page.getByRole("menu")).toBeVisible();
}

test.describe("a host lays the editor out itself", () => {
  test("selecting, adding, dragging, undo and the keys work in a custom layout", async ({
    page,
  }) => {
    await open(page);
    const before = await blocks(page).count();
    await addFromBlocks(page, "Text");
    await expect(blocks(page)).toHaveCount(before + 1);
    const start = await boxOf(page, "n1");

    await dragBy(page, "n1", 120, 90);
    const moved = await boxOf(page, "n1");
    expect(Math.round(moved.x - start.x)).toBeGreaterThan(60);
    expect(Math.round(moved.y - start.y)).toBeGreaterThan(40);

    await page.keyboard.press("Control+z");
    const back = await boxOf(page, "n1");
    expect(Math.abs(back.x - start.x)).toBeLessThan(2);
    expect(Math.abs(back.y - start.y)).toBeLessThan(2);

    // Select another block by pressing it, then the new one again, and take the new one away.
    await pressBlock(page, "sample");
    await expect(layer(page, "sample")).toHaveAttribute("aria-pressed", "true");
    await pressBlock(page, "n1");
    await expect(layer(page, "n1")).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Delete");
    await expect(blocks(page)).toHaveCount(before);
  });

  test("the context menu works in the custom layout", async ({ page }) => {
    await open(page);
    await addFromBlocks(page, "Text");
    const before = await blocks(page).count();
    await openMenu(page, "n1");
    await expect(page.getByRole("menuitem", { name: /Duplicate/ })).toContainText("Ctrl+D");
    await page.getByRole("menuitem", { name: /Duplicate/ }).press("Space");
    await expect(blocks(page)).toHaveCount(before + 1);
  });

  test("Properties in a dialog keeps the appearance and closing it loses nothing", async ({
    page,
  }) => {
    await open(page, "&dark");
    await addFromBlocks(page, "Text");
    const dialog = page.getByTestId("compose-dialog");
    await expect(dialog).toHaveCount(0);

    await page.getByRole("button", { name: "Properties", exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("role", "dialog");
    // The dialog is inside the editor's root, so the look and the language reach it.
    await expect(page.locator("[data-miditor-editor]").getByTestId("compose-dialog")).toHaveCount(
      1,
    );
    const chrome = await dialog.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--_chrome").trim(),
    );
    expect(chrome).not.toBe("");
    await expect(
      dialog.evaluate((el) => el.closest("[data-miditor-editor]")?.getAttribute("data-scheme")),
    ).resolves.toBe("dark");

    const size = dialog.locator("input").first();
    await size.click();
    await size.fill("41");
    await size.blur();
    await expect(size).toHaveValue("41");

    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(layer(page, "n1")).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Properties", exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("input").first()).toHaveValue("41");
  });

  test("Layers placed on the right follows the selection", async ({ page }) => {
    await open(page);
    const canvas = await boxOf(page, "sample");
    const row = await layer(page, "sample").boundingBox();
    if (!row) throw new Error("the Layers panel is not on the page");
    expect(row.x).toBeGreaterThan(canvas.x + canvas.width / 2);

    await pressBlock(page, "sample");
    await expect(layer(page, "sample")).toHaveAttribute("aria-pressed", "true");
    await addFromBlocks(page, "Text");
    await expect(layer(page, "n1")).toHaveAttribute("aria-pressed", "true");
    await expect(layer(page, "sample")).toHaveAttribute("aria-pressed", "false");
    // And the other way: a row selects its block on the canvas.
    await layer(page, "sample").click();
    await expect(layer(page, "sample")).toHaveAttribute("aria-pressed", "true");
    await expect(selectionHandles(page).first()).toBeVisible();
  });

  test("a layout with no header and no rail still works", async ({ page }) => {
    await open(page, "&bare");
    await expect(page.locator("header")).toHaveCount(0);
    await expect(page.locator("nav")).toHaveCount(0);
    await pressBlock(page, "sample");
    await expect(selectionHandles(page).first()).toBeVisible();
    // The keys work with a canvas alone.
    const before = await blocks(page).count();
    await page.keyboard.press("Control+d");
    await expect(blocks(page)).toHaveCount(before + 1);
  });

  test("without a canvas the keys that need a container do nothing and nothing throws", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await gotoFrame(page, "/?reset&compose&nocanvas");
    await expect(page.getByRole("button", { name: "Fit" })).toBeVisible();
    await expect(surface(page).locator("[data-miditor-id]")).toHaveCount(0);

    const before = await layerRows(page).count();
    expect(before).toBeGreaterThan(1);
    await layer(page, "sample").click();
    await expect(layer(page, "sample")).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Control+d");
    await page.keyboard.press("Control+g");
    await page.keyboard.press("Control+Shift+g");
    await page.getByRole("button", { name: "Fit" }).click();
    await expect(layerRows(page)).toHaveCount(before);
    await expect(layer(page, "sample")).toHaveAttribute("aria-pressed", "true");
    expect(errors).toEqual([]);
  });

  test("two providers keep their own state", async ({ page }) => {
    await gotoFrame(page, "/?reset&compose&two");
    const a = page.getByTestId("editor-a");
    const b = page.getByTestId("editor-b");
    await expect(a.locator("[data-miditor-id]").first()).toBeVisible();
    await expect(b.locator("[data-miditor-id]").first()).toBeVisible();
    const rowsA = await a.locator("[data-layer]").count();
    const rowsB = await b.locator("[data-layer]").count();

    // Select a block in A and duplicate it with the keys: only A has one more.
    const box = await a.locator('[data-miditor-id="sample"]').boundingBox();
    if (!box) throw new Error("no sample block in editor A");
    await page.mouse.click(box.x + 20, box.y + 20);
    await expect(a.locator('[data-layer="sample"]')).toHaveAttribute("aria-pressed", "true");
    await expect(b.locator('[data-layer="sample"]')).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Control+d");
    await expect(a.locator("[data-layer]")).toHaveCount(rowsA + 1);
    await expect(b.locator("[data-layer]")).toHaveCount(rowsB);
  });
});
