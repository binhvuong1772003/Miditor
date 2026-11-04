import { expect, type Page, test } from "@playwright/test";
import { addFromBlocks, openEditor, properties, storedPage } from "./helpers";

// A field that chooses from a list the host keeps (`config.sources`), searched as the person types.

const related = (page: Page) => page.getByTestId("related-page");

test.describe("an external field", () => {
  test("searches the host's list, stores the pick and undo brings the old one back", async ({
    page,
  }) => {
    await openEditor(page);
    await addFromBlocks(page, "Related page");
    await expect(related(page)).toContainText("none");

    const panel = properties(page);
    await panel.getByRole("button", { name: /Page: Choose/ }).click();
    await expect(panel.getByRole("status")).toBeVisible();
    await panel.getByRole("searchbox", { name: "Search Page" }).fill("ab");
    // Both "About us" and "Abacus" match; "Home" does not.
    await expect(panel.getByRole("button", { name: "About us" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Abacus" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Home" })).toHaveCount(0);
    await panel.getByRole("button", { name: "About us" }).click();
    await expect(related(page)).toContainText("About us");
    await expect(panel.getByRole("searchbox")).toHaveCount(0);

    await panel.getByRole("button", { name: "Clear Page" }).click();
    await expect(related(page)).toContainText("none");
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(related(page)).toContainText("About us");
  });

  test("says when nothing is found and shuts on Escape", async ({ page }) => {
    await openEditor(page);
    await addFromBlocks(page, "Related page");
    const panel = properties(page);
    await panel.getByRole("button", { name: /Page: Choose/ }).click();
    await panel.getByRole("searchbox", { name: "Search Page" }).fill("zzz");
    await expect(panel.getByText("Nothing found.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel.getByRole("searchbox")).toHaveCount(0);
  });

  test("a field with no list gets a note and one warning", async ({ page }) => {
    const warnings: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "warning" && message.text().includes("no source")) {
        warnings.push(message.text());
      }
    });
    await openEditor(page, "&nosource");
    await addFromBlocks(page, "Related page");
    await expect(properties(page).getByRole("note")).toContainText("pages");
    expect(warnings).toHaveLength(1);
  });

  test("stores the data of the picked item, shows it, and refuses an item with too much", async ({
    page,
  }) => {
    await openEditor(page);
    await addFromBlocks(page, "Shop item");
    const card = page.getByTestId("shop-item");
    await expect(card).toContainText("none");

    const panel = properties(page);
    await panel.getByRole("button", { name: /Item: Choose/ }).click();
    // The list shows the hint of each item.
    await expect(panel.getByRole("button", { name: /Coffee beans.*199/ })).toBeVisible();
    await panel.getByRole("button", { name: /Coffee beans/ }).click();
    await expect(card).toContainText("Coffee beans");
    await expect(card).toContainText("199");

    const saved = await storedPage(page, (stored) =>
      JSON.stringify(stored).includes('"data":{"title":"Coffee beans"'),
    );
    const value = JSON.stringify(saved);
    expect(value).toMatch(
      /"item":\{"id":"beans","label":"Coffee beans","data":\{[^}]*\},"at":"\d{4}-/,
    );

    // An item whose data is over the limit is refused: the earlier pick stays, and a message says why.
    await panel.getByRole("button", { name: /Item: Coffee beans/ }).click();
    await panel.getByRole("button", { name: /Heavy catalogue/ }).click();
    await expect(panel.getByRole("alert")).toContainText("too much data");
    await expect(card).toContainText("Coffee beans");

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(card).toContainText("none");
  });
});
