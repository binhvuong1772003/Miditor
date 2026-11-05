import { expect, type Page, test } from "@playwright/test";
import {
  addFromBlocks,
  blocks,
  boxOf,
  gotoFrame,
  openEditor,
  properties,
  surface,
} from "./helpers";

// A host reshapes the editor through `overrides` (`?overrides`): it wraps the bar and the panels,
// replaces the rail and one input, and adds a line to the right-click menu.

const errorsOf = (page: Page): string[] => {
  const seen: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("the override of")) {
      seen.push(message.text());
    }
  });
  return seen;
};

test.describe("a host reshapes the editor through overrides", () => {
  test("the header is wrapped and Undo of the editor still works", async ({ page }) => {
    await openEditor(page, "&overrides");
    const bar = page.getByTestId("host-bar");
    await expect(bar).toBeVisible();
    await expect(bar).toContainText("Host title");
    // The editor's own bar is inside the host's.
    await expect(bar.getByRole("button", { name: "Save", exact: true })).toBeVisible();
    const before = await blocks(page).count();
    await addFromBlocks(page, "Text");
    await expect(blocks(page)).toHaveCount(before + 1);
    await bar.getByRole("button", { name: "Undo" }).click();
    await expect(blocks(page)).toHaveCount(before);
  });

  test("a replaced rail changes the panel through pick", async ({ page }) => {
    await openEditor(page, "&overrides");
    // The editor's own rail is gone: the host's buttons are all there is.
    await expect(page.getByRole("navigation", { name: "Tools" })).toHaveCount(0);
    const layers = page.getByTestId("host-tool-layers");
    const frame = page.getByTestId("host-panel-frame");
    await expect(frame).toContainText("blocks");
    await expect(page.getByTestId("host-tool-blocks")).toHaveAttribute("aria-pressed", "true");
    await layers.click();
    await expect(frame).toContainText("layers");
    await expect(layers).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("host-tool-blocks")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("complementary", { name: "Layers" })).toBeVisible();
    // Pressing the open tool shuts the panel.
    await layers.click();
    await expect(layers).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("complementary", { name: "Layers" })).toHaveCount(0);
  });

  test("a wrapped panel shows the host's frame around it", async ({ page }) => {
    await openEditor(page, "&overrides");
    const start = page.getByTestId("host-panel-frame");
    await expect(start.getByRole("complementary", { name: "Blocks" })).toBeVisible();
    const end = page.getByTestId("host-panel-end");
    await expect(end).toContainText("mode: page");
    await expect(end.getByRole("complementary", { name: "Properties" })).toBeVisible();
    await addFromBlocks(page, "Text");
    await expect(end).toContainText("mode: block");
    await expect(end.getByRole("complementary", { name: "Properties" })).toBeVisible();
    // The quick actions float over the page, so their frame has no box of its own.
    await expect(page.getByTestId("host-quick")).toBeAttached();
    await expect(page.getByTestId("host-quick").getByRole("button").first()).toBeVisible();
  });

  test("a line the host adds to the menu is there and runs", async ({ page }) => {
    await openEditor(page, "&overrides");
    await addFromBlocks(page, "Text");
    const count = page.getByTestId("host-log-count");
    await expect(count).toHaveText("0");
    const box = await boxOf(page, "n1");
    await page.mouse.click(box.x + 20, box.y + 20, { button: "right" });
    await expect(page.getByRole("menu")).toBeVisible();
    // The host dropped nothing.
    await expect(page.getByRole("menuitem", { name: /Duplicate/ })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Delete/ })).toBeVisible();
    await page.getByRole("menuitem", { name: "Host: log" }).press("Space");
    await expect(count).toHaveText("1");
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("the host's input replaces the link field and the other fields stay", async ({ page }) => {
    await openEditor(page, "&overrides");
    await addFromBlocks(page, "Button");
    const panel = properties(page);
    await expect(panel.getByTestId("host-href")).toHaveCount(1);
    // The editor's own link input is gone; the label input is the editor's own.
    await expect(panel.getByLabel("Link", { exact: true })).toHaveCount(0);
    const label = panel.getByLabel("Label", { exact: true });
    await expect(label).toBeVisible();
    await expect(panel.getByTestId("host-field-label")).toHaveCount(0);
    await panel.getByTestId("host-href").fill("https://example.com/");
    await expect(panel.getByTestId("host-href")).toHaveValue("https://example.com/");
    await label.fill("Go");
    await label.blur();
    await expect(surface(page).locator('[data-miditor-id="n1"]').first()).toContainText("Go");
    // The link survived the other change, and Undo of the label leaves it.
    await expect(panel.getByTestId("host-href")).toHaveValue("https://example.com/");
    await page.getByTestId("host-bar").getByRole("button", { name: "Undo" }).click();
    await expect(surface(page).locator('[data-miditor-id="n1"]').first()).toContainText("Button");
    await expect(panel.getByTestId("host-href")).toHaveValue("https://example.com/");
  });

  test("an override that throws shows the default and logs one error", async ({ page }) => {
    const errors = errorsOf(page);
    await openEditor(page, "&overrides&throw");
    await expect(page.getByTestId("host-bar")).toHaveCount(0);
    // The default bar is there, and the part that is fine keeps its frame.
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeVisible();
    await expect(page.getByTestId("host-panel-frame")).toBeVisible();
    // The rest of the editor works.
    const before = await blocks(page).count();
    await addFromBlocks(page, "Text");
    await expect(blocks(page)).toHaveCount(before + 1);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(blocks(page)).toHaveCount(before);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"header"');
  });

  test("two editors keep their own overrides", async ({ page }) => {
    await gotoFrame(page, "/?reset&overrides&two");
    const a = page.getByTestId("editor-a");
    const b = page.getByTestId("editor-b");
    await expect(b.getByRole("button", { name: "Save", exact: true })).toBeVisible();
    await expect(a.getByTestId("bar-a")).toBeVisible();
    await expect(a.getByTestId("bar-b")).toHaveCount(0);
    await expect(b.getByTestId("bar-b")).toBeVisible();
    await expect(b.getByTestId("bar-a")).toHaveCount(0);
    await expect(page.getByTestId("bar-a")).toHaveCount(1);
    await expect(page.getByTestId("bar-b")).toHaveCount(1);
  });
});
