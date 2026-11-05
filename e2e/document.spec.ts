import { expect, test } from "@playwright/test";
import {
  addFromBlocks,
  addTwoTexts,
  announcement,
  blocks,
  boxOf,
  nodeIn,
  openEditor,
  pressBlock,
  properties,
  storedPage,
  surface,
} from "./helpers";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test.beforeEach(async ({ page }) => {
  await openEditor(page);
});

test.describe("the clipboard", () => {
  test("Ctrl+C and Ctrl+V paste a copy of the selected block and select it", async ({ page }) => {
    await addFromBlocks(page, "Text");
    const before = await blocks(page).count();
    await page.keyboard.press("ControlOrMeta+c");
    await page.keyboard.press("ControlOrMeta+v");
    await expect(blocks(page)).toHaveCount(before + 1);
    await expect(announcement(page)).toContainText("selected");
  });

  test("Ctrl+X takes the block away and Undo brings it back", async ({ page }) => {
    await addFromBlocks(page, "Text");
    const before = await blocks(page).count();
    await page.keyboard.press("ControlOrMeta+x");
    await expect(blocks(page)).toHaveCount(before - 1);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(blocks(page)).toHaveCount(before);
  });
});

test.describe("the order of the layers", () => {
  const order = async (page: import("@playwright/test").Page) =>
    surface(page)
      .locator("[data-miditor-id]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-miditor-id")),
      );

  test("Move block down puts a block before its brother and Undo puts it back", async ({
    page,
  }) => {
    await addTwoTexts(page);
    await pressBlock(page, "n2");
    const before = await order(page);
    expect(before.indexOf("n2")).toBeGreaterThan(before.indexOf("n1"));

    await page.getByRole("button", { name: "Move block down" }).click();
    const down = await order(page);
    expect(down.indexOf("n2")).toBeLessThan(down.indexOf("n1"));

    await page.getByRole("button", { name: "Undo" }).click();
    expect(await order(page)).toEqual(before);
  });

  test("Move block up puts a block after its brother", async ({ page }) => {
    await addTwoTexts(page);
    await pressBlock(page, "n1");
    await page.getByRole("button", { name: "Move block up" }).click();
    const up = await order(page);
    expect(up.indexOf("n1")).toBeGreaterThan(up.indexOf("n2"));
  });
});

test.describe("lining blocks up", () => {
  test("Align left puts the selected blocks on the same left edge", async ({ page }) => {
    await addTwoTexts(page);
    await pressBlock(page, "n1");
    await pressBlock(page, "n2", true);
    await properties(page).getByRole("button", { name: "Align left" }).click();
    const one = await boxOf(page, "n1");
    const two = await boxOf(page, "n2");
    expect(one.x).toBeCloseTo(two.x, 0);
  });

  test("Align can be undone as one step", async ({ page }) => {
    await addTwoTexts(page);
    await pressBlock(page, "n1");
    await pressBlock(page, "n2", true);
    const before = [await boxOf(page, "n1"), await boxOf(page, "n2")];
    await properties(page).getByRole("button", { name: "Align top" }).click();
    await page.getByRole("button", { name: "Undo" }).click();
    expect([await boxOf(page, "n1"), await boxOf(page, "n2")]).toEqual(before);
  });
});

test.describe("what the page holds, as the host is given it", () => {
  test("an anchor chosen for a block is kept in the page", async ({ page }) => {
    await addFromBlocks(page, "Text");
    await properties(page).getByRole("tab", { name: "Advanced" }).click();
    await properties(page).getByLabel("Horizontal").selectOption("end");
    const saved = await storedPage(
      page,
      (stored) => nodeIn(stored.root, "n1")?.position.x?.anchor === "end",
    );
    expect(nodeIn(saved.root, "n1")?.position.x?.anchor).toBe("end");
  });

  test("the title of the page is kept in its info", async ({ page }) => {
    const title = properties(page).getByLabel("Title", { exact: true });
    await title.fill("Summer sale");
    await title.blur();
    const saved = await storedPage(page, (stored) => stored.meta?.title === "Summer sale");
    expect(saved.meta?.title).toBe("Summer sale");
  });

  test("a block placed by hand on the phone can be reset to the automatic layout", async ({
    page,
  }) => {
    await addFromBlocks(page, "Text");
    await page.getByRole("button", { name: "Phone" }).click();
    const box = await boxOf(page, "n1");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 20, { steps: 6 });
    await page.mouse.up();
    const placed = await storedPage(page, (stored) =>
      JSON.stringify(nodeIn(stored.root, "n1")).includes("phone"),
    );
    expect(JSON.stringify(nodeIn(placed.root, "n1"))).toContain("phone");

    await properties(page).getByRole("tab", { name: "Advanced" }).click();
    await properties(page).getByRole("button", { name: "Reset to automatic" }).click();
    const reset = await storedPage(
      page,
      (stored) => !JSON.stringify(nodeIn(stored.root, "n1")).includes('"phone"'),
    );
    expect(JSON.stringify(nodeIn(reset.root, "n1"))).not.toContain('"phone"');
  });
});

test.describe("onChange", () => {
  test("a run of changes reaches the host once, after the delay", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __stores: number };
      w.__stores = 0;
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === "miditor-playground-page") w.__stores += 1;
        return set.call(this, key, value);
      };
    });
    await openEditor(page);
    await addFromBlocks(page, "Text");
    await storedPage(page);
    await page.waitForTimeout(1200);
    const before = await page.evaluate(() => (window as unknown as { __stores: number }).__stores);

    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(100);
    }
    await expect(page.locator("[data-state]").first()).toHaveAttribute("data-state", "unsaved");
    await expect(page.locator("[data-state]").first()).toHaveAttribute("data-state", "saved", {
      timeout: 6000,
    });
    const after = await page.evaluate(() => (window as unknown as { __stores: number }).__stores);
    expect(after - before).toBe(1);
  });
});

test.describe("keys held down", () => {
  test("a run of arrow presses is one step to undo", async ({ page }) => {
    await addFromBlocks(page, "Text");
    const before = await boxOf(page, "n1");
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    expect((await boxOf(page, "n1")).x).toBeGreaterThan(before.x + 3);
    await page.getByRole("button", { name: "Undo" }).click();
    expect(await boxOf(page, "n1")).toEqual(before);
  });
});

test.describe("saving with a change that is still being typed", () => {
  test("Save hands over the value typed in a field, before it is committed", async ({ page }) => {
    await addFromBlocks(page, "Text");
    const size = properties(page).locator("input").first();
    await size.click();
    await size.fill("40");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog")).toContainText('"size": 40');
  });
});

test.describe("dragging a block out of the library onto the page", () => {
  test("drops a new block where the pointer is let go", async ({ page }) => {
    const before = await blocks(page).count();
    const tile = page.getByRole("button", { name: "Text", exact: true }).first();
    const from = await tile.boundingBox();
    const target = await boxOf(page, "root");
    if (!from) throw new Error("no tile");
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + 300, { steps: 12 });
    await page.mouse.up();
    await expect(blocks(page)).toHaveCount(before + 1);
  });

  // A card dragged onto a box goes into it once the pointer has rested there, and is lit; a pass over it is not.
  const dragTileOntoSample = async (
    page: import("@playwright/test").Page,
    rest: boolean,
  ): Promise<void> => {
    const tile = page.getByRole("button", { name: "Text", exact: true }).first();
    const from = await tile.boundingBox();
    const target = await boxOf(page, "sample");
    if (!from) throw new Error("no tile");
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
    if (rest) {
      await expect(page.getByText("Into Box")).toBeVisible();
    }
    await page.mouse.up();
  };

  test("a card rested over a box goes into the box", async ({ page }) => {
    await dragTileOntoSample(page, true);
    await expect(
      surface(page).locator('[data-miditor-id="sample"] [data-miditor-type="Text"]'),
    ).toHaveCount(1);
  });

  test("a card that only passes over a box goes on the page", async ({ page }) => {
    await dragTileOntoSample(page, false);
    await expect(blocks(page).locator("xpath=self::*[@data-miditor-type='Text']")).toHaveCount(1);
    await expect(
      surface(page).locator('[data-miditor-id="sample"] [data-miditor-type="Text"]'),
    ).toHaveCount(0);
  });
});

test.describe("the theme of the page", () => {
  test("a page font chosen in the settings is kept in the theme and can be undone", async ({
    page,
  }) => {
    await properties(page).locator("select").first().selectOption({ label: "Poppins" });
    const saved = await storedPage(page, (stored) =>
      JSON.stringify(stored.theme).includes("Poppins"),
    );
    expect(JSON.stringify(saved.theme)).toContain("Poppins");

    await page.getByRole("button", { name: "Undo" }).click();
    const undone = await storedPage(
      page,
      (stored) => !JSON.stringify(stored.theme).includes("Poppins"),
    );
    expect(JSON.stringify(undone.theme)).not.toContain("Poppins");
  });

  test("deleting a colour of the theme takes it out, and Undo puts it back", async ({ page }) => {
    await properties(page).getByRole("button", { name: "Delete accent" }).click();
    const gone = await storedPage(
      page,
      (stored) => !JSON.stringify(stored.theme).includes("accent"),
    );
    expect(JSON.stringify(gone.theme)).not.toContain("accent");

    await page.getByRole("button", { name: "Undo" }).click();
    const back = await storedPage(page, (stored) =>
      JSON.stringify(stored.theme).includes("accent"),
    );
    expect(JSON.stringify(back.theme)).toContain("accent");
  });

  test("putting a suggested theme on the page changes its colours", async ({ page }) => {
    const first = await storedPage(page, (stored) => stored.theme !== undefined).catch(() => null);
    await page.getByRole("button", { name: "Themes", exact: true }).click();
    await page.getByRole("button", { name: /Night/ }).click();
    const saved = await storedPage(
      page,
      (stored) => JSON.stringify(stored.theme) !== JSON.stringify(first?.theme),
    );
    expect(JSON.stringify(saved.theme)).not.toBe(JSON.stringify(first?.theme));
  });
});

test.describe("the position and size fields", () => {
  test("typing an X position moves the block there", async ({ page }) => {
    await addFromBlocks(page, "Text");
    await properties(page).getByRole("tab", { name: "Advanced" }).click();
    const before = await boxOf(page, "n1");
    const x = properties(page).getByLabel("X position");
    await x.fill("10");
    await x.press("Enter");
    const after = await boxOf(page, "n1");
    expect(after.x).not.toBeCloseTo(before.x, 0);
  });

  test("typing a width sets the width of the block", async ({ page }) => {
    await addFromBlocks(page, "Text");
    await properties(page).getByRole("tab", { name: "Advanced" }).click();
    const width = properties(page).getByLabel("Width", { exact: true });
    await width.fill("300");
    await width.press("Enter");
    expect((await boxOf(page, "n1")).width).toBeCloseTo(300, 0);
    await page.getByRole("button", { name: "Undo" }).click();
    expect((await boxOf(page, "n1")).width).toBeCloseTo(240, 0);
  });

  test("typing a rotation turns the block", async ({ page }) => {
    await addFromBlocks(page, "Text");
    await properties(page).getByRole("tab", { name: "Advanced" }).click();
    const rotation = properties(page).getByLabel("Rotation");
    await rotation.fill("30");
    await rotation.press("Enter");
    const saved = await storedPage(page, (stored) =>
      JSON.stringify(nodeIn(stored.root, "n1")).includes("30"),
    );
    expect(JSON.stringify(nodeIn(saved.root, "n1"))).toContain("30");
  });
});
