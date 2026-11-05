import { expect, test } from "@playwright/test";
import { gotoFrame } from "./helpers";

// A page whose blocks are wider than the room is cut at its edge, as it is when published in a box that narrow:
// the frame it is drawn in shows no scroll bars of its own (the workspace scrolls).
test.skip(Boolean(process.env.E2E_INLINE), "the page is drawn in place, with no frame");
test.use({ viewport: { width: 1000, height: 700 } });

test("a frame whose page is wider than it has no scroll bars of its own", async ({ page }) => {
  await gotoFrame(page, "/?landing=coffee");
  const frame = page.locator('iframe[title="Page"]');
  await expect(frame).toBeVisible();
  // The test browser hides scroll bars, so the rule that would show them is what is checked.
  await expect
    .poll(() =>
      frame.evaluate((element) => {
        const doc = (element as HTMLIFrameElement).contentDocument;
        if (!doc?.querySelector("[data-miditor-id]")) return null;
        const style = getComputedStyle(doc.documentElement);
        return [style.overflowX, style.overflowY];
      }),
    )
    .toEqual(["hidden", "hidden"]);
});
