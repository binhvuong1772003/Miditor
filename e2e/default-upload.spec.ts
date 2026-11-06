import { expect, test } from "@playwright/test";
import { openEditor, properties } from "./helpers";

// A 1x1 png: the smallest file `image/*` accepts.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
);

test("a host with no upload still gets Upload buttons, and the picture is kept in the page", async ({
  page,
}) => {
  await openEditor(page, "&noupload");
  const info = properties(page);
  await expect(info.getByRole("button", { name: /Upload picture|Tải ảnh lên/ })).toBeVisible();
  await expect(
    info.getByRole("button", { name: /Upload background|Tải ảnh nền lên/ }),
  ).toBeVisible();
  await expect(info.getByPlaceholder("https://…")).toHaveCount(0);

  await info.locator('input[type="file"]').first().setInputFiles({
    name: "share.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(info.getByRole("button", { name: /Change image|Đổi ảnh/ }).first()).toBeVisible();
  await expect(info.getByRole("alert")).toHaveCount(0);
});
