import { expect, test } from "@playwright/test";
import { addFromBlocks, openEditor, storedPage } from "./helpers";

type Counter = { __stores: number };
const stores = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (window as unknown as Counter).__stores);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as Counter;
    w.__stores = 0;
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === "miditor-playground-page") w.__stores += 1;
      return set.call(this, key, value);
    };
  });
});

test.describe("a host without a delay (?plain)", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page, "&plain");
  });

  test("a change reaches the host once, at once", async ({ page }) => {
    await addFromBlocks(page, "Text");
    await expect.poll(() => stores(page)).toBe(1);
    await page.waitForTimeout(400);
    expect(await stores(page)).toBe(1);
  });

  test("each step of Undo and Redo reaches the host once", async ({ page }) => {
    await addFromBlocks(page, "Text");
    await expect.poll(() => stores(page)).toBe(1);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect.poll(() => stores(page)).toBe(2);
    await page.getByRole("button", { name: "Redo" }).click();
    await expect.poll(() => stores(page)).toBe(3);
    await page.waitForTimeout(400);
    expect(await stores(page)).toBe(3);
  });

  test("a run of arrow presses, one step of history, reaches the host for each press", async ({
    page,
  }) => {
    await addFromBlocks(page, "Text");
    await expect.poll(() => stores(page)).toBe(1);
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
    await expect.poll(() => stores(page)).toBe(4);
  });

  test("the host is given the page as it is, not an earlier one", async ({ page }) => {
    await addFromBlocks(page, "Text");
    await page.keyboard.press("ArrowRight");
    const saved = await storedPage(page, (stored) => stored.root.children.length === 3);
    expect(saved.root.children).toHaveLength(3);
  });
});

test.describe("a host with a delay and a longest wait", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
  });

  test("the longest wait gives the host a page in the middle of a long run of changes", async ({
    page,
  }) => {
    await addFromBlocks(page, "Text");
    await storedPage(page);
    await page.waitForTimeout(1200);
    const before = await stores(page);
    // A change every 300 ms never lets the 800 ms delay run out; the 4 s longest wait does.
    for (let i = 0; i < 18; i++) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(300);
    }
    const during = await stores(page);
    expect(during - before).toBeGreaterThanOrEqual(1);
    await expect.poll(() => stores(page), { timeout: 4000 }).toBeGreaterThan(during - 1);
  });
});
