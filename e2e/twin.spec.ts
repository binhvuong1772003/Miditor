import { expect, test } from "@playwright/test";
import { gotoFrame } from "./helpers";

const side = (page: import("@playwright/test").Page, name: "left" | "right") =>
  page.locator(`[data-twin="${name}"]`);
const percent = (where: import("@playwright/test").Locator) =>
  where.getByRole("button", { name: /^\d+%$/ });

test.beforeEach(async ({ page }) => {
  await gotoFrame(page, "/?twin");
  await expect(percent(side(page, "left"))).toBeVisible();
  await expect(percent(side(page, "right"))).toBeVisible();
});

test("zooming one editor leaves the other at its own zoom", async ({ page }) => {
  // Each editor starts at the zoom that fits its own room, which a narrow room makes under 100%.
  const left = (await percent(side(page, "left")).textContent()) ?? "";
  const right = (await percent(side(page, "right")).textContent()) ?? "";
  await side(page, "left").getByRole("button", { name: "Zoom in" }).click();
  await expect(percent(side(page, "left"))).not.toHaveText(left);
  await expect(percent(side(page, "right"))).toHaveText(right);
});

test("the frame of one editor is not the frame of the other", async ({ page }) => {
  await side(page, "right").getByRole("button", { name: "Phone", exact: true }).click();
  await expect(
    side(page, "right").getByRole("button", { name: "Phone", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(side(page, "left").getByRole("button", { name: "Desktop" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("the tool of one editor is not the tool of the other", async ({ page }) => {
  await side(page, "left").getByRole("button", { name: "Layers", exact: true }).click();
  await expect(side(page, "left").getByRole("complementary", { name: "Layers" })).toBeVisible();
  await expect(side(page, "right").getByRole("complementary", { name: "Blocks" })).toBeVisible();
});

test("what is announced in one editor is not announced in the other", async ({ page }) => {
  await side(page, "left").getByRole("button", { name: "Text", exact: true }).first().click();
  const said = (name: "left" | "right") =>
    side(page, name).locator('[role="status"][aria-live="polite"]');
  await expect(said("left")).toContainText("Text");
  await expect(said("right")).not.toContainText("Text");
});
