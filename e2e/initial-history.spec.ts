import { expect, type Page, test } from "@playwright/test";
import {
  addFromBlocks,
  blocks,
  gotoFrame,
  openEditor,
  type StoredNode,
  storedPage,
} from "./helpers";

// The playground keeps the page and, with `?history`, the last steps of the history next to it, and opens
// them again as `initialHistory`: Undo still works after the page is opened again.

const KEY = "miditor-playground-history";
const stored = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), KEY);
const nodes = (node: StoredNode): number => 1 + node.children.reduce((n, c) => n + nodes(c), 0);
const undo = (page: Page) => page.getByRole("button", { name: /^Undo/ });

test.describe("initialHistory", () => {
  test("keeps Undo working after the page is opened again", async ({ page }) => {
    await openEditor(page, "&history");
    const start = await blocks(page).count();
    await addFromBlocks(page, "Text");
    await addFromBlocks(page, "Text");
    await storedPage(page, (s) => nodes(s.root) === start + 2);
    await expect.poll(async () => (await stored(page))?.past?.length).toBe(2);

    await gotoFrame(page, "/?history");
    await expect(page.getByRole("button", { name: /^(Save|Lưu)$/ })).toBeVisible();
    await expect(blocks(page)).toHaveCount(start + 2);
    await expect(undo(page)).toBeEnabled();
    await undo(page).click();
    await expect(blocks(page)).toHaveCount(start + 1);
    await undo(page).click();
    await expect(blocks(page)).toHaveCount(start);
    await expect(undo(page)).toBeDisabled();
  });

  test("opens without the steps, and says so once, when what was kept is not a history", async ({
    page,
  }) => {
    const warnings: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "warning" && message.text().includes("initialHistory")) {
        warnings.push(message.text());
      }
    });
    await openEditor(page, "&history");
    const start = await blocks(page).count();
    await addFromBlocks(page, "Text");
    await storedPage(page, (s) => nodes(s.root) === start + 1);
    await page.evaluate((key) => localStorage.setItem(key, '{"past":[{"not":"a page"}]}'), KEY);

    await gotoFrame(page, "/?history");
    await expect(page.getByRole("button", { name: /^(Save|Lưu)$/ })).toBeVisible();
    await expect(undo(page)).toBeDisabled();
    expect(warnings).toHaveLength(1);
  });

  test("is not used without ?history", async ({ page }) => {
    await openEditor(page, "&history");
    const start = await blocks(page).count();
    await addFromBlocks(page, "Text");
    await storedPage(page, (s) => nodes(s.root) === start + 1);
    await gotoFrame(page, "/");
    await expect(page.getByRole("button", { name: /^(Save|Lưu)$/ })).toBeVisible();
    await expect(undo(page)).toBeDisabled();
  });
});
