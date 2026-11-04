import { expect, type Page, test } from "@playwright/test";
import { blocks, openEditor, properties, surface } from "./helpers";

// A host part drawn in `headerActions` drives the editor through `useEditor` (`?control`). `?control&two`
// draws two editors on one page, each with its own part.

const host = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const selection = (page: Page) => page.getByTestId("host-selection");

/** How many times the Undo button of the host part has been drawn, counted by the part itself. */
const undoRenders = (page: Page) =>
  page.evaluate(() => (window as unknown as { __hostUndoRenders: number }).__hostUndoRenders);

test.describe("a host part inside the editor", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page, "&control");
  });

  test("Host undo is off until there is something to undo, then undoes", async ({ page }) => {
    await expect(host(page, "Host undo")).toBeDisabled();
    const before = await blocks(page).count();
    await host(page, "Host add Text").click();
    await expect(blocks(page)).toHaveCount(before + 1);
    await expect(host(page, "Host undo")).toBeEnabled();
    await host(page, "Host undo").click();
    await expect(blocks(page)).toHaveCount(before);
    await expect(host(page, "Host undo")).toBeDisabled();
  });

  test("Host add Text adds a block and selects it", async ({ page }) => {
    await expect(selection(page)).toHaveText("none");
    const before = await blocks(page).count();
    await host(page, "Host add Text").click();
    await expect(blocks(page)).toHaveCount(before + 1);
    await expect(selection(page)).toHaveText("n1");
    await expect(surface(page).locator('[data-miditor-id="n1"]').first()).toBeVisible();
  });

  test("Host select first selects the first block", async ({ page }) => {
    // The first block of the starting page is "sample"; a new block is added after it.
    await host(page, "Host add Text").click();
    await expect(selection(page)).toHaveText("n1");
    await host(page, "Host select first").click();
    await expect(selection(page)).toHaveText("sample");
  });

  test("Host save reaches onSave once with the page", async ({ page }) => {
    await host(page, "Host add Text").click();
    await host(page, "Host save").click();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(page.getByRole("dialog")).toContainText("Data to send");
    await expect(page.getByRole("dialog")).toContainText('"id": "n1"');
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("the status readout follows the editor", async ({ page }) => {
    await expect(page.getByTestId("host-status")).toHaveText("saved");
    await host(page, "Host add Text").click();
    await expect(page.getByTestId("host-status")).toHaveText("saved", { timeout: 5000 });
  });

  test("a part reading canUndo is drawn again only when it changes", async ({ page }) => {
    await host(page, "Host add Text").click();
    await expect(host(page, "Host undo")).toBeEnabled();
    const afterAdd = await undoRenders(page);
    // A change that leaves canUndo as it was: the size of the block, typed and committed.
    const size = properties(page).locator("input").first();
    await size.click();
    await size.fill("40");
    await size.blur();
    await expect(surface(page).locator('[data-miditor-id="n1"]').first()).toBeVisible();
    await host(page, "Host select first").click();
    expect(await undoRenders(page)).toBe(afterAdd);
    // A change that flips it is drawn.
    await host(page, "Host undo").click();
    await host(page, "Host undo").click();
    await expect(host(page, "Host undo")).toBeDisabled();
    expect(await undoRenders(page)).toBeGreaterThan(afterAdd);
  });
});

test.describe("two editors on one page", () => {
  test("a button in one acts only on its own editor", async ({ page }) => {
    await page.goto("/?reset&control&two");
    await expect(
      page.getByTestId("editor-b").getByRole("button", { name: "Save", exact: true }),
    ).toBeVisible();
    const a = page.getByTestId("editor-a");
    const b = page.getByTestId("editor-b");
    const inA = (name: string) => a.getByRole("button", { name, exact: true });
    const inB = (name: string) => b.getByRole("button", { name, exact: true });
    const blocksB = await b.locator("[data-miditor-id]").count();
    await inA("Host add Text").click();
    await expect(a.getByTestId("host-selection")).toHaveText("n1");
    await expect(b.getByTestId("host-selection")).toHaveText("none");
    await expect(a.locator("[data-miditor-id]")).toHaveCount(blocksB + 1);
    await expect(b.locator("[data-miditor-id]")).toHaveCount(blocksB);
    await expect(inA("Host undo")).toBeEnabled();
    await expect(inB("Host undo")).toBeDisabled();
    await inB("Host add Text").click();
    await inB("Host add Text").click();
    await expect(b.getByTestId("host-selection")).toHaveText("n2");
    await expect(a.getByTestId("host-selection")).toHaveText("n1");
    await inA("Host undo").click();
    await expect(a.locator("[data-miditor-id]")).toHaveCount(blocksB);
    await expect(b.locator("[data-miditor-id]")).toHaveCount(blocksB + 2);
  });
});
