import { expect, type Page } from "@playwright/test";

/** A fresh playground: `?reset` drops the stored page so every test starts from the same one. */
export async function openEditor(page: Page, query = ""): Promise<void> {
  await page.goto(`/?reset${query}`);
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
}

/** The blocks drawn on the page, the page itself included. */
export const blocks = (page: Page) => page.locator("[data-midito-id]");

export const saveState = (page: Page) => page.locator("[data-state]").first();

/** What the editor says aloud after an action; a screen reader gets the same text. */
export const announcement = (page: Page) => page.locator('[role="status"][aria-live="polite"]');

export const properties = (page: Page) => page.locator('aside[aria-label="Properties"]');

export async function addFromBlocks(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name, exact: true }).first().click();
}

/** The tool rail on the left switches the panel beside the canvas. */
export async function openTool(page: Page, name: "Blocks" | "Layers" | "Images" | "Themes") {
  await page.getByRole("button", { name, exact: true }).click();
}

type Where = { x: number; y: number; width: number; height: number };

export async function boxOf(page: Page, id: string): Promise<Where> {
  const box = await page.locator(`[data-midito-id="${id}"]`).boundingBox();
  if (!box) throw new Error(`block ${id} is not on the page`);
  return box;
}

/** Presses in the middle of a block and drags it by a distance, the way a hand does. */
export async function dragBy(page: Page, id: string, dx: number, dy: number): Promise<void> {
  const box = await boxOf(page, id);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
}

/** Drags a resize handle of the selected block (`se`, `n`, `w`...) by a distance. */
export async function resizeBy(page: Page, handle: string, dx: number, dy: number): Promise<void> {
  const box = await page.locator(`.moveable-${handle}`).first().boundingBox();
  if (!box) throw new Error(`no ${handle} handle: is a block selected?`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
}

/** Selects a block by pressing near its top left corner, with Shift to add it to the selection. */
export async function pressBlock(page: Page, id: string, shift = false): Promise<void> {
  const box = await boxOf(page, id);
  if (shift) await page.keyboard.down("Shift");
  await page.mouse.click(box.x + 20, box.y + 20);
  if (shift) await page.keyboard.up("Shift");
}

/** Two Text blocks side by side on the page, `n1` and `n2`: a new block lands on the one before it. */
export async function addTwoTexts(page: Page): Promise<void> {
  await addFromBlocks(page, "Text");
  await dragBy(page, "n1", -250, -150);
  await addFromBlocks(page, "Text");
}
