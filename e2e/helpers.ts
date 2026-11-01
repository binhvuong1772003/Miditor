import { expect, type Page } from "@playwright/test";

/** A fresh playground: `?reset` drops the stored page so every test starts from the same one. */
export async function openEditor(page: Page, query = ""): Promise<void> {
  await page.goto(`/?reset${query}`);
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
}

/** The blocks drawn on the page, the page itself included. */
export const blocks = (page: Page) => page.locator("[data-midito-id]");

export const saveState = (page: Page) => page.locator("[data-state]").first();

/** What the editor says aloud after an action; a screen reader gets the same text. */
export const announcement = (page: Page) => page.locator('[role="status"][aria-live="polite"]');

export const properties = (page: Page) => page.locator('aside[aria-label="Properties"]');

export async function addFromBlocks(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name, exact: true }).first().click();
}

/** The tool rail on the left switches the panel beside the canvas. */
export async function openTool(page: Page, name: "Blocks" | "Layers" | "Images" | "Themes") {
  await page.getByRole("button", { name, exact: true }).click();
}
