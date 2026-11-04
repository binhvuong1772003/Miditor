import { expect, test } from "@playwright/test";
import { addFromBlocks, openEditor } from "./helpers";

// `onAction` is told of each change of the page that was kept: what was done, the blocks it was about, and
// how many blocks the page had after it and before it (the playground writes that to `window.__actions`).

type Told = { type: string; ids: string[]; blocks: number; before: number };
const told = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (window as unknown as { __actions?: Told[] }).__actions ?? []);

test.describe("onAction", () => {
  test("is told of an add and of an undo, with the pages before and after", async ({ page }) => {
    await openEditor(page);
    await addFromBlocks(page, "Text");
    await expect.poll(async () => (await told(page)).at(-1)?.type).toBe("block.add");
    const added = (await told(page)).at(-1) as Told;
    expect(added.ids).toHaveLength(1);
    expect(added.blocks).toBe(added.before + 1);

    await page.getByRole("button", { name: "Undo" }).click();
    await expect.poll(async () => (await told(page)).at(-1)?.type).toBe("history.undo");
    const undone = (await told(page)).at(-1) as Told;
    expect(undone.blocks).toBe(undone.before - 1);
  });

  test("is not told when only the view changes", async ({ page }) => {
    await openEditor(page);
    await addFromBlocks(page, "Text");
    await expect.poll(async () => (await told(page)).length).toBeGreaterThan(0);
    const count = (await told(page)).length;
    await page.getByRole("button", { name: "Phone", exact: true }).click();
    await page.getByRole("button", { name: "Desktop", exact: true }).click();
    await page.waitForTimeout(300);
    expect((await told(page)).length).toBe(count);
  });
});
