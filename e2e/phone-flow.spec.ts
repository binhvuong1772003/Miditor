import { expect, type Page, test } from "@playwright/test";
import { gotoFrame } from "./helpers";

// A page with nothing placed by hand for the phone is drawn there as a flow, and the first change of the
// phone layout places every block where it is drawn. The coffee page of the playground has no phone data.

const open = async (page: Page) => {
  await gotoFrame(page, "/?landing=coffee");
  await expect(page.getByRole("button", { name: /^(Save|Lưu)$/ })).toBeVisible();
};
const phone = (page: Page) => page.getByRole("button", { name: "Phone", exact: true }).click();
const desktop = (page: Page) => page.getByRole("button", { name: "Desktop", exact: true }).click();

const box = async (page: Page, text: string) => {
  const found = await page.getByText(text, { exact: true }).first().boundingBox();
  if (!found) throw new Error(`${text} is not drawn`);
  return found;
};

const storedPhoneBoxes = (page: Page) =>
  page.evaluate(() => {
    const text = localStorage.getItem("miditor-playground-page") ?? "{}";
    return (text.match(/"phone":\s*\{/g) ?? []).length;
  });

test.describe("a phone page with nothing placed for it", () => {
  test("stacks the three cards on the phone and keeps them in a row on the desktop", async ({
    page,
  }) => {
    await open(page);
    const row = [
      await box(page, "Roasted to order"),
      await box(page, "Sourced with care"),
      await box(page, "Fresh in 48 hours"),
    ];
    expect(row[0]?.y).toBeCloseTo(row[1]?.y ?? 0, 0);
    expect(row[1]?.y).toBeCloseTo(row[2]?.y ?? 0, 0);

    await phone(page);
    const column = [
      await box(page, "Roasted to order"),
      await box(page, "Sourced with care"),
      await box(page, "Fresh in 48 hours"),
    ];
    expect(column[0]?.x).toBeCloseTo(column[1]?.x ?? 0, 0);
    expect(column[1]?.y).toBeGreaterThan((column[0]?.y ?? 0) + 40);
    expect(column[2]?.y).toBeGreaterThan((column[1]?.y ?? 0) + 40);

    await desktop(page);
    const again = await box(page, "Sourced with care");
    expect(again.y).toBeCloseTo(row[1]?.y ?? 0, 0);
  });

  test("lets no text out of its card, since the text grows with what it says", async ({ page }) => {
    await open(page);
    await phone(page);
    const overflowing = await page.evaluate(
      () =>
        [...document.querySelectorAll<HTMLElement>('[data-miditor-type="Text"]')].filter(
          (el) => el.scrollHeight > el.clientHeight + 1,
        ).length,
    );
    expect(overflowing).toBe(0);
  });

  test("the first change on the phone places every block where it is drawn, in one step", async ({
    page,
  }) => {
    await open(page);
    await phone(page);
    const before = await box(page, "Fresh in 48 hours");
    expect(await storedPhoneBoxes(page)).toBe(0);

    await page.getByText("Why it tastes different", { exact: true }).click();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => storedPhoneBoxes(page)).toBeGreaterThan(5);

    // Nothing else moved: the page is the same as it was drawn, now placed by hand.
    const after = await box(page, "Fresh in 48 hours");
    expect(after.x).toBeCloseTo(before.x, 0);
    expect(after.y).toBeCloseTo(before.y, 0);

    // One undo goes back to the flow.
    await page.getByRole("button", { name: "Undo" }).click();
    await expect.poll(() => storedPhoneBoxes(page)).toBe(0);
  });

  test("Arrange for phone takes the places back, after a question", async ({ page }) => {
    await open(page);
    await phone(page);
    await expect(page.getByRole("button", { name: "Arrange for phone" })).toHaveCount(0);
    await page.getByText("Why it tastes different", { exact: true }).click();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => storedPhoneBoxes(page)).toBeGreaterThan(5);

    // Nothing selected: the panel is the page's again.
    await page.mouse.click(5, 5);
    await page.keyboard.press("Escape");
    const arrange = page.getByRole("button", { name: "Arrange for phone" });
    await expect(arrange).toBeVisible();

    page.once("dialog", (dialog) => dialog.dismiss());
    await arrange.click();
    expect(await storedPhoneBoxes(page)).toBeGreaterThan(5);

    page.once("dialog", (dialog) => dialog.accept());
    await arrange.click();
    await expect.poll(() => storedPhoneBoxes(page)).toBe(0);
    await expect(arrange).toHaveCount(0);
  });
});
