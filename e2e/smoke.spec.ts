import { expect, test } from "@playwright/test";

test("the editor opens on a fresh page", async ({ page }) => {
  await page.goto("/?reset");
  await expect(page.getByRole("button", { name: /undo/i })).toBeVisible();
});
