import { expect, test } from "@playwright/test";
import { gotoFrame } from "./helpers";

test("the editor opens on a fresh page", async ({ page }) => {
  await gotoFrame(page, "/?reset");
  await expect(page.getByRole("button", { name: /undo/i })).toBeVisible();
});
