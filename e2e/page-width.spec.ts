import { expect, test } from "@playwright/test";
import { openEditor } from "./helpers";

// A page keeps the width of its screen (960 px on the desktop) whatever room the editor has: a narrow room
// zooms the canvas out to fit it, and the blocks are not cut.

const zoomValue = (page: import("@playwright/test").Page) =>
  page.getByRole("group", { name: "Zoom" }).getByRole("button").nth(1);
test.skip(Boolean(process.env.E2E_INLINE), "the page is drawn in place, with no frame");

test.describe("a narrow room", () => {
  test.use({ viewport: { width: 1000, height: 800 } });
  test("zooms the canvas out by itself and keeps the page 960 px wide", async ({ page }) => {
    await openEditor(page);
    await expect(zoomValue(page)).not.toHaveText("100%");
    const width = await page.evaluate(() => {
      const frame = document.querySelector<HTMLIFrameElement>('iframe[title="Page"]');
      return frame?.contentDocument?.querySelector<HTMLElement>("[data-miditor-render]")
        ?.offsetWidth;
    });
    expect(width).toBe(960);
  });

  test("lets the person's own zoom stand when the room changes", async ({ page }) => {
    await openEditor(page);
    await page.getByRole("button", { name: "Zoom in" }).click();
    const chosen = (await zoomValue(page).textContent()) ?? "";
    await page.setViewportSize({ width: 900, height: 800 });
    await expect(zoomValue(page)).toHaveText(chosen);
  });
});

test.describe("a wide room", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });
  test("shows the page at 100%, 960 px wide", async ({ page }) => {
    await openEditor(page);
    await expect(zoomValue(page)).toHaveText("100%");
    const width = await page.evaluate(() => {
      const frame = document.querySelector<HTMLIFrameElement>('iframe[title="Page"]');
      return frame?.contentDocument?.querySelector<HTMLElement>("[data-miditor-render]")
        ?.offsetWidth;
    });
    expect(width).toBe(960);
  });
});
