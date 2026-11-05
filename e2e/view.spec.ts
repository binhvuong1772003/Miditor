import { expect, test } from "@playwright/test";
import { addFromBlocks, openEditor, surface } from "./helpers";

const percent = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: /^\d+%$/ });
const pageWidth = async (page: import("@playwright/test").Page) =>
  (await surface(page).locator("[data-miditor-render]").first().boundingBox())?.width ?? 0;

test.describe("zoom", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
  });

  test("starts at 100% and Zoom in and Zoom out step it", async ({ page }) => {
    await expect(percent(page)).toHaveText("100%");
    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(percent(page)).toHaveText("125%");
    await page.getByRole("button", { name: "Zoom out" }).click();
    await page.getByRole("button", { name: "Zoom out" }).click();
    await expect(percent(page)).toHaveText("75%");
  });

  test("the percentage returns to 100% and the page scales with the zoom", async ({ page }) => {
    const full = await pageWidth(page);
    await page.getByRole("button", { name: "Zoom in" }).click();
    expect(await pageWidth(page)).toBeGreaterThan(full);

    await percent(page).click();
    await expect(percent(page)).toHaveText("100%");
    expect(await pageWidth(page)).toBeCloseTo(full, 0);
  });

  test("Ctrl with + - and 0 zooms the canvas, not the browser", async ({ page }) => {
    await page.locator("[data-miditor-editor]").focus();
    await page.keyboard.press("ControlOrMeta+=");
    await expect(percent(page)).toHaveText("125%");
    await page.keyboard.press("ControlOrMeta+-");
    await page.keyboard.press("ControlOrMeta+-");
    await expect(percent(page)).toHaveText("75%");
    await page.keyboard.press("ControlOrMeta+0");
    await expect(percent(page)).toHaveText("100%");
  });

  test("Ctrl with the wheel zooms the canvas, and several turns add up", async ({ page }) => {
    const canvas = page.locator("section[aria-label='Canvas']");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("no canvas");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -120);
    await expect(percent(page)).not.toHaveText("100%");
    const once = (await percent(page).textContent()) ?? "";
    await page.mouse.wheel(0, -120);
    await page.mouse.wheel(0, -120);
    await page.keyboard.up("Control");
    await expect
      .poll(async () => Number.parseInt((await percent(page).textContent()) ?? "", 10))
      .toBeGreaterThan(Number.parseInt(once, 10));
  });

  test("Fit sizes the page to the room", async ({ page }) => {
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.getByRole("button", { name: "Fit" }).click();
    // The whole page is inside the room the canvas has.
    const room = await page.locator("section[aria-label='Canvas']").boundingBox();
    const sheet = await page
      .locator('iframe[title="Page"], [data-miditor-render]')
      .first()
      .boundingBox();
    if (!room || !sheet) throw new Error("the canvas or the page is not drawn");
    expect(sheet.width).toBeLessThanOrEqual(room.width + 1);
    expect(sheet.height).toBeLessThanOrEqual(room.height + 1);
  });
});

test.describe("frame", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
  });

  test("Phone narrows the page to a phone and Desktop widens it again", async ({ page }) => {
    const desktop = await pageWidth(page);
    await page.getByRole("button", { name: "Phone" }).click();
    await expect(page.getByRole("button", { name: "Phone" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await pageWidth(page)).toBe(375);

    await page.getByRole("button", { name: "Desktop" }).click();
    expect(await pageWidth(page)).toBe(desktop);
  });

  test("on the phone the blocks cannot be added", async ({ page }) => {
    await page.getByRole("button", { name: "Phone" }).click();
    await expect(page.getByRole("button", { name: "Text", exact: true }).first()).toBeDisabled();
  });

  test("the frame does not change what the page holds", async ({ page }) => {
    await addFromBlocks(page, "Text");
    const count = await surface(page).locator("[data-miditor-id]").count();
    await page.getByRole("button", { name: "Phone" }).click();
    await page.getByRole("button", { name: "Desktop" }).click();
    await expect(surface(page).locator("[data-miditor-id]")).toHaveCount(count);
  });
});

test.describe("language", () => {
  test("the editor speaks English by default", async ({ page }) => {
    await openEditor(page);
    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Layers", exact: true })).toBeVisible();
  });

  test("?lang=vi puts the header, tools and blocks in Vietnamese", async ({ page }) => {
    await openEditor(page, "&lang=vi");
    for (const name of ["Hoàn tác", "Làm lại", "Lưu", "Khối", "Lớp", "Hình ảnh", "Chủ đề"]) {
      await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);
  });

  test("the announcements are Vietnamese too", async ({ page }) => {
    await openEditor(page, "&lang=vi");
    await page.getByRole("button", { name: "Văn bản", exact: true }).first().click();
    await expect(page.locator('[role="status"][aria-live="polite"]')).not.toContainText("selected");
  });
});
