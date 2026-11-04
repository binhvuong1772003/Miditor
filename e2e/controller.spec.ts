import { expect, type Page, test } from "@playwright/test";
import { blocks, surface } from "./helpers";

// A bar drawn outside `<Editor>` drives it through a controller from `useCreateEditor()`
// (`?control&outside`). `&closed` starts with the editor closed; `&two` gives the controller to two editors.

const bar = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const selection = (page: Page) => page.getByTestId("outside-selection");

/** Collects what the page logs at a level, from now on. */
function logged(page: Page, type: "error" | "warning") {
  const lines: string[] = [];
  page.on("console", (message) => {
    if (message.type() === type) lines.push(message.text());
  });
  return lines;
}

async function open(page: Page, query = "") {
  await page.goto(`/?reset&control&outside${query}`);
  await expect(bar(page, "Outside add Text")).toBeVisible();
}

test("the bar before the editor mounts is idle, then follows the editor", async ({ page }) => {
  await open(page, "&closed");
  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  await expect(selection(page)).toHaveText("none");
  await expect(bar(page, "Outside undo")).toBeDisabled();
  await expect(page.getByTestId("outside-status")).toHaveText("none");
  await bar(page, "Open editor").click();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeVisible();
  await expect(page.getByTestId("outside-status")).toHaveText("saved");
  await bar(page, "Outside add Text").click();
  await expect(selection(page)).toHaveText("n1");
  await expect(bar(page, "Outside undo")).toBeEnabled();
});

test("Outside add Text adds a block and the readout shows its id", async ({ page }) => {
  await open(page);
  await expect(selection(page)).toHaveText("none");
  const before = await blocks(page).count();
  await bar(page, "Outside add Text").click();
  await expect(blocks(page)).toHaveCount(before + 1);
  await expect(selection(page)).toHaveText("n1");
  await expect(surface(page).locator('[data-miditor-id="n1"]').first()).toBeVisible();
});

test("Outside undo is off until there is a change, then undoes", async ({ page }) => {
  await open(page);
  await expect(bar(page, "Outside undo")).toBeDisabled();
  const before = await blocks(page).count();
  await bar(page, "Outside add Text").click();
  await expect(blocks(page)).toHaveCount(before + 1);
  await expect(bar(page, "Outside undo")).toBeEnabled();
  await bar(page, "Outside undo").click();
  await expect(blocks(page)).toHaveCount(before);
  await expect(bar(page, "Outside undo")).toBeDisabled();
});

test("Outside save reaches onSave with the page", async ({ page }) => {
  await open(page);
  await bar(page, "Outside add Text").click();
  await bar(page, "Outside save").click();
  await expect(page.getByRole("dialog")).toContainText("Data to send");
  await expect(page.getByRole("dialog")).toContainText('"id": "n1"');
});

test("a second editor given the same controller is ignored and the first keeps working", async ({
  page,
}) => {
  const errors = logged(page, "error");
  await page.goto("/?reset&control&outside&two");
  const a = page.getByTestId("editor-a");
  const b = page.getByTestId("editor-b");
  // The second still draws.
  await expect(b.getByRole("button", { name: "Save", exact: true })).toBeVisible();
  await expect(a.getByRole("button", { name: "Save", exact: true })).toBeVisible();
  await expect
    .poll(() => errors.some((text) => text.includes("already belongs to another editor")))
    .toBe(true);
  const before = await a.locator("[data-miditor-id]").count();
  expect(await b.locator("[data-miditor-id]").count()).toBe(before);
  await bar(page, "Outside add Text").click();
  await expect(a.locator("[data-miditor-id]")).toHaveCount(before + 1);
  await expect(b.locator("[data-miditor-id]")).toHaveCount(before);
  await expect(selection(page)).toHaveText("n1");
  await bar(page, "Outside undo").click();
  await expect(a.locator("[data-miditor-id]")).toHaveCount(before);
});

test("the readout goes idle when the editor is closed", async ({ page }) => {
  const warnings = logged(page, "warning");
  await open(page);
  await bar(page, "Outside add Text").click();
  await expect(selection(page)).toHaveText("n1");
  await expect(bar(page, "Outside undo")).toBeEnabled();
  await bar(page, "Close editor").click();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  await expect(selection(page)).toHaveText("none");
  await expect(bar(page, "Outside undo")).toBeDisabled();
  await expect(page.getByTestId("outside-status")).toHaveText("none");
  // Commands now do nothing and warn, once.
  await bar(page, "Outside add Text").click();
  await bar(page, "Outside add Text").click();
  await expect(selection(page)).toHaveText("none");
  await expect(blocks(page)).toHaveCount(0);
  await expect
    .poll(() => warnings.filter((text) => text.includes("no editor attached")).length)
    .toBe(1);
  // Opening again starts a new page with a new history.
  await bar(page, "Open editor").click();
  await expect(bar(page, "Outside undo")).toBeDisabled();
  await expect(selection(page)).toHaveText("none");
});
