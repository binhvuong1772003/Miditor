import { expect, test } from "@playwright/test";
import { blocks, nodeIn, openEditor, openTool, storedPage } from "./helpers";

// A 1 x 1 picture, so the upload has something real to read.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.beforeEach(async ({ page }) => {
  await openEditor(page);
  await openTool(page, "Images");
});

test("a picture of the library is added as an Image block that shows it, and Undo takes it away", async ({
  page,
}) => {
  const before = await blocks(page).count();
  await page.getByRole("button", { name: /Add River valley/ }).click();
  await expect(page.locator('[data-midito-type="Image"]')).toHaveCount(1);
  await expect(blocks(page)).toHaveCount(before + 1);

  const saved = await storedPage(page, (stored) => nodeIn(stored.root, "n1") !== undefined);
  const image = nodeIn(saved.root, "n1");
  expect(String(image?.props.src)).toContain("/id/1015/");
  expect(image?.props.alt).toBe("River valley");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator('[data-midito-type="Image"]')).toHaveCount(0);
});

test("a second picture goes on the page when the selected block does not take blocks", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Add River valley/ }).click();
  await expect(page.locator('[data-midito-type="Image"]')).toHaveCount(1);
  await page.getByRole("button", { name: /Add Pug/ }).click();
  await expect(page.locator('[data-midito-type="Image"]')).toHaveCount(2);
  await expect(page.locator('[data-midito-type="Image"] [data-midito-type="Image"]')).toHaveCount(
    0,
  );
});

test("a picture uploaded from a file is added as an Image block", async ({ page }) => {
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Upload image" }).click(),
  ]);
  await chooser.setFiles({ name: "dot.png", mimeType: "image/png", buffer: PNG });
  await expect(page.locator('[data-midito-type="Image"]')).toHaveCount(1);
  const saved = await storedPage(page, (stored) => nodeIn(stored.root, "n1") !== undefined);
  expect(String(nodeIn(saved.root, "n1")?.props.src)).toMatch(/^data:image\//);
});
