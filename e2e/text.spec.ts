import { expect, test } from "@playwright/test";
import { addFromBlocks, boxOf, openEditor, openWords, wordsOf } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openEditor(page);
  await addFromBlocks(page, "Text");
});

const field = (page: import("@playwright/test").Page) =>
  page.getByRole("textbox", { name: "Edit the text of the block" });

test("double-clicking a text block opens its words with all of them selected", async ({ page }) => {
  await openWords(page, "n1");
  await page.keyboard.type("Hello there");
  await expect(field(page)).toHaveText("Hello there");
});

test("Ctrl+Enter ends the typing of a text, which has lines, and the block keeps the words", async ({
  page,
}) => {
  await openWords(page, "n1");
  await page.keyboard.type("Hello there");
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(field(page)).toHaveCount(0);
  await expect(wordsOf(page, "n1")).toHaveText("Hello there");
});

test("pressing somewhere else ends the typing too", async ({ page }) => {
  await openWords(page, "n1");
  await page.keyboard.type("Elsewhere");
  await page.locator("section[aria-label='Canvas']").click({ position: { x: 4, y: 4 } });
  await expect(field(page)).toHaveCount(0);
  await expect(wordsOf(page, "n1")).toHaveText("Elsewhere");
});

test("Esc drops what was typed", async ({ page }) => {
  await openWords(page, "n1");
  await page.keyboard.type("Never kept");
  await page.keyboard.press("Escape");
  await expect(field(page)).toHaveCount(0);
  await expect(wordsOf(page, "n1")).toHaveText("Your text");
});

test("typing a text is one step of history", async ({ page }) => {
  await openWords(page, "n1");
  await page.keyboard.type("Hello there");
  await page.keyboard.press("ControlOrMeta+Enter");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(wordsOf(page, "n1")).toHaveText("Your text");
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(wordsOf(page, "n1")).toHaveText("Hello there");
});

test("the typing box sits over the block without moving it", async ({ page }) => {
  const before = await boxOf(page, "n1");
  await openWords(page, "n1");
  const typing = await field(page).boundingBox();
  expect(typing?.x).toBeCloseTo(before.x, -1);
  expect(typing?.y).toBeCloseTo(before.y, -1);
});

test("Undo of the block being typed on ends the typing and leaves no box behind", async ({
  page,
}) => {
  await openWords(page, "n1");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(field(page)).toHaveCount(0);
  await expect(page.locator('[data-miditor-id="n1"]')).toHaveCount(0);
});
