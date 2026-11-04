import { expect, type Page, test } from "@playwright/test";
import { addFromBlocks, openEditor, properties, storedPage, surface } from "./helpers";

// A field that chooses from a list the host keeps (`config.sources`), searched as the person types.

const related = (page: Page) => surface(page).getByTestId("related-page");

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
    await addFromBlocks(page, "Item card");
    const card = surface(page).getByTestId("item-card");
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

  // The source of the playground answers `getMany`; `?items-changed` makes beans cost more and
  // `?items-lost` takes the kettle off the list, so a page stored before can be checked against it.
  async function pickItem(page: Page, name: string) {
    const panel = properties(page);
    await panel.getByRole("button", { name: /Item: (Choose|.*)/ }).click();
    await panel.getByRole("button", { name: new RegExp(name) }).click();
  }
  const newer = (page: Page) => page.getByText(/blocks? (has|have) newer data/);

  test("tells which stored items have newer data, and changes nothing until Update", async ({
    page,
  }) => {
    await openEditor(page);
    await addFromBlocks(page, "Item card");
    await pickItem(page, "Coffee beans");
    const before = await storedPage(page, (stored) => JSON.stringify(stored).includes("199"));
    const oldAt = JSON.stringify(before).match(/"at":"([^"]+)"/)?.[1];

    await page.goto("/?items-changed");
    await expect(newer(page)).toContainText("1 block has newer data");
    await expect(surface(page).getByTestId("item-card")).toContainText("199");
    // Nothing was written by the check.
    expect(JSON.stringify(await storedPage(page))).toContain("199");

    await page.getByRole("button", { name: "Update" }).click();
    await expect(surface(page).getByTestId("item-card")).toContainText("249");
    await expect(newer(page)).toHaveCount(0);
    const after = await storedPage(page, (stored) => JSON.stringify(stored).includes("249"));
    expect(JSON.stringify(after)).not.toContain(`"at":"${oldAt}"`);

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(surface(page).getByTestId("item-card")).toContainText("199");
    await expect(newer(page)).toContainText("1 block has newer data");
  });

  test("says an item is no longer in the source, and offers no update for it", async ({ page }) => {
    await openEditor(page);
    await addFromBlocks(page, "Item card");
    await pickItem(page, "Steel kettle");
    await storedPage(page, (stored) => JSON.stringify(stored).includes("459"));

    await page.goto("/?items-lost");
    await expect(newer(page)).toHaveCount(0);
    await surface(page).getByTestId("item-card").click();
    await expect(properties(page).getByRole("note")).toContainText("No longer in the source");
    await expect(surface(page).getByTestId("item-card")).toContainText("459");
  });

  test("asks the source once for all the ids of the page", async ({ page }) => {
    await openEditor(page);
    await addFromBlocks(page, "Item card");
    await pickItem(page, "Coffee beans");
    await addFromBlocks(page, "Item card");
    await pickItem(page, "Blue mug");
    await storedPage(page, (stored) => JSON.stringify(stored).includes("89"));

    await page.goto("/?items-changed");
    await expect(newer(page)).toContainText("1 block has newer data");
    const calls = await page.evaluate(
      () =>
        (window as unknown as { __itemsCalls: { answered: number; ids: string[][] } }).__itemsCalls,
    );
    // StrictMode starts the check twice and stops the first: one call is answered, with every id.
    expect(calls.answered).toBe(1);
    expect(calls.ids.at(-1)?.sort()).toEqual(["beans", "mug"]);
  });

  test("a reference keeps only the id in the page, and the canvas and the preview show the live data", async ({
    page,
  }) => {
    await openEditor(page);
    await addFromBlocks(page, "Live item");
    await pickItem(page, "Coffee beans");
    const card = surface(page).getByTestId("live-item");
    await expect(card).toContainText("199");
    // The renderer of the kind is given the metadata of the host.
    await expect(card).toHaveAttribute("data-lang", "en");
    const saved = await storedPage(page, (stored) =>
      JSON.stringify(stored).includes('"item":{"id":"beans"'),
    );
    const text = JSON.stringify(saved);
    expect(text).toContain('"item":{"id":"beans","label":"Coffee beans"}');
    expect(text).not.toContain('"data"');

    // The source has moved on: the canvas shows it with no banner, and nothing is written.
    await page.goto("/?items-changed");
    await expect(surface(page).getByTestId("live-item")).toContainText("249");
    await expect(newer(page)).toHaveCount(0);
    expect(JSON.stringify(await storedPage(page))).not.toContain('"data"');

    // A visitor's page: the host fills the data in with `resolveSources` before it draws.
    await page.goto("/?preview&items-changed");
    await expect(surface(page).getByTestId("live-item")).toContainText("249");
    await expect(surface(page).getByTestId("live-item")).toHaveAttribute("data-lang", "en");
  });
});
