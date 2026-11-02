import { expect, type Page, test } from "@playwright/test";
import { addFromBlocks, openEditor, properties } from "./helpers";

// An array of objects (a menu of entries, each a label and a link) edited in the panel.

const entries = (page: Page) => page.getByTestId("menu-entries").locator("li");
const entry = (page: Page, n: number) =>
  properties(page).getByRole("group", { name: `Entry ${n}` });

test.describe("an array of objects", () => {
  test("adds, edits, moves and removes entries, and undo brings them back", async ({ page }) => {
    await openEditor(page);
    await addFromBlocks(page, "Menu");
    await expect(entries(page)).toHaveText(["Home"]);

    await properties(page).getByRole("button", { name: "Add Entry" }).click();
    await expect(entries(page)).toHaveText(["Home", ""]);

    const second = entry(page, 2).getByRole("textbox", { name: "Label" });
    await second.fill("About");
    await second.press("Enter");
    await expect(entries(page)).toHaveText(["Home", "About"]);

    await properties(page).getByRole("button", { name: "Move Entry 2 up" }).click();
    await expect(entries(page)).toHaveText(["About", "Home"]);

    await properties(page).getByRole("button", { name: "Remove Entry 1" }).click();
    await expect(entries(page)).toHaveText(["Home"]);

    // The removed row took the focus with it, so the toolbar button is what undoes.
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(entries(page)).toHaveText(["About", "Home"]);
  });

  test("keeps to minItems and maxItems", async ({ page }) => {
    await openEditor(page);
    await addFromBlocks(page, "Menu");
    // minItems is 1: the only entry cannot be removed.
    await expect(properties(page).getByRole("button", { name: "Remove Entry 1" })).toBeDisabled();
    const add = properties(page).getByRole("button", { name: "Add Entry" });
    for (let i = 0; i < 4; i++) await add.click();
    await expect(entries(page)).toHaveCount(5);
    await expect(add).toBeDisabled();
  });

  test("a value the field refuses is not stored", async ({ page }) => {
    await openEditor(page);
    await addFromBlocks(page, "Menu");
    const label = entry(page, 1).getByRole("textbox", { name: "Label" });
    await label.fill("x".repeat(40));
    await label.press("Enter");
    // maxLength is 20: the list on the page still says Home.
    await expect(entries(page)).toHaveText(["Home"]);
  });
});
