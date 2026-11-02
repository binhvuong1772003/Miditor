import { expect, test } from "@playwright/test";
import { openEditor, openTool } from "./helpers";

const editor = (page: import("@playwright/test").Page) => page.locator("[data-miditor-editor]");

test("the Blocks panel is open at the start and pressing its tool shuts it", async ({ page }) => {
  await openEditor(page);
  await expect(editor(page)).toHaveAttribute("data-panel", "open");
  await openTool(page, "Blocks");
  await expect(editor(page)).toHaveAttribute("data-panel", "closed");
  await openTool(page, "Blocks");
  await expect(editor(page)).toHaveAttribute("data-panel", "open");
});

test("pressing another tool shows it and opens the panel", async ({ page }) => {
  await openEditor(page);
  await openTool(page, "Blocks");
  await expect(editor(page)).toHaveAttribute("data-panel", "closed");
  await openTool(page, "Layers");
  await expect(editor(page)).toHaveAttribute("data-panel", "open");
  await expect(page.getByRole("complementary", { name: "Layers" })).toBeVisible();
  await openTool(page, "Themes");
  await expect(page.getByRole("complementary", { name: "Themes" })).toBeVisible();
});

test("a narrow screen starts without the panel", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await openEditor(page);
  await expect(editor(page)).toHaveAttribute("data-panel", "closed");
  await openTool(page, "Blocks");
  await expect(editor(page)).toHaveAttribute("data-panel", "open");
});
