import { expect, type Page } from "@playwright/test";

/** A fresh playground: `?reset` drops the stored page so every test starts from the same one. */
export async function openEditor(page: Page, query = ""): Promise<void> {
  // `E2E_IFRAME=1` runs the whole suite with the page drawn in a frame of its own.
  await page.goto(`/?reset${process.env.E2E_IFRAME ? "&iframe" : ""}${query}`);
  await expect(page.getByRole("button", { name: /^(Save|Lưu)$/ })).toBeVisible();
}

/** `page.goto`, with `&iframe` added when `E2E_IFRAME=1` so the page is drawn in a frame of its own. */
export async function gotoFrame(page: Page, path: string): Promise<void> {
  await page.goto(process.env.E2E_IFRAME ? `${path}${path.includes("?") ? "&" : "?"}iframe` : path);
}

/** Where the blocks are: the page, or the frame the page is drawn in when `E2E_IFRAME=1`. */
export const surface = (page: Page) =>
  process.env.E2E_IFRAME ? page.frameLocator('iframe[title="Page"]') : page;

/** The blocks drawn on the page, the page itself included. */
export const blocks = (page: Page) => surface(page).locator("[data-miditor-id]");

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
  const box = await surface(page).locator(`[data-miditor-id="${id}"]`).boundingBox();
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
  const box = await surface(page).locator(`.moveable-${handle}`).first().boundingBox();
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
  await dragBy(page, "n1", -200, -150);
  await addFromBlocks(page, "Text");
}

/** The words of a block, as the page draws them (not the box being typed in). */
export const wordsOf = (page: Page, id: string) =>
  surface(page).locator(`[data-miditor-id="${id}"]`).first();

/** Double-clicks in the middle of a block, which opens its words for typing. */
export async function openWords(page: Page, id: string): Promise<void> {
  const box = await boxOf(page, id);
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByRole("textbox", { name: "Edit the text of the block" })).toBeFocused();
}

type Json = { [key: string]: unknown };
export type StoredNode = {
  id: string;
  props: Json;
  position: Json & {
    x?: { anchor: string; offset: number };
    y?: { anchor: string; offset: number };
  };
  children: StoredNode[];
  [key: string]: unknown;
};
export type StoredPage = { root: StoredNode; meta?: Json; theme?: Json };

/** The page the playground keeps in the browser after every `onChange`, read once the delay has passed. */
export async function storedPage(
  page: Page,
  until?: (stored: StoredPage) => boolean,
): Promise<StoredPage> {
  let found: StoredPage | undefined;
  await expect
    .poll(
      async () => {
        const text = await page.evaluate(() => localStorage.getItem("miditor-playground-page"));
        found = text ? (JSON.parse(text) as StoredPage) : undefined;
        return found !== undefined && (until ? until(found) : true);
      },
      { timeout: 6000 },
    )
    .toBe(true);
  return found as StoredPage;
}

export function nodeIn(node: StoredNode, id: string): StoredNode | undefined {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = nodeIn(child, id);
    if (found) return found;
  }
  return undefined;
}
