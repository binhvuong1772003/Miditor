import { expect, test } from "@playwright/test";
import { addFromBlocks, boxOf, openEditor, surface } from "./helpers";

// A block dropped into another block stays where it was let go: its middle ends where the middle of the hand was.
const REST = 400;

for (const zoomOuts of [0, 1, 2]) {
  test(`a block dropped into a box stays where it was let go, with the canvas zoomed out ${zoomOuts} times`, async ({
    page,
  }) => {
    // Known gap: with the page drawn in place (`canvas="inline"`), at 50% the middle is a few px off.
    test.fixme(
      Boolean(process.env.E2E_INLINE) && zoomOuts === 2,
      "a few px off at 50% when drawn in place",
    );
    await openEditor(page);
    for (let i = 0; i < zoomOuts; i++) await page.getByRole("button", { name: "Zoom out" }).click();
    await addFromBlocks(page, "Text");
    const target = await boxOf(page, "sample");
    const block = await boxOf(page, "n1");
    // Let go with the middle of the block over a point off the middle of the box.
    const goal = { x: target.x + target.width * 0.3, y: target.y + target.height * 0.4 };
    await page.mouse.move(block.x + block.width / 2, block.y + block.height / 2);
    await page.mouse.down();
    await page.mouse.move(goal.x, goal.y, { steps: 14 });
    await page.waitForTimeout(REST);
    await page.mouse.up();
    // It went in.
    await expect(
      surface(page).locator('[data-miditor-id="sample"] [data-miditor-id="n1"]'),
    ).toHaveCount(1);
    const after = await boxOf(page, "n1");
    // A width in percent of the parent is kept to a hundredth, so the middle can be off by a fraction of a px.
    expect(Math.abs(after.x + after.width / 2 - goal.x)).toBeLessThan(1.5);
    expect(Math.abs(after.y + after.height / 2 - goal.y)).toBeLessThan(1.5);
  });
}

for (const zoomOuts of [0, 2]) {
  test(`a block moved from one box into another stays where it was let go, with the canvas zoomed out ${zoomOuts} times`, async ({
    page,
  }) => {
    await openEditor(page);
    for (let i = 0; i < zoomOuts; i++) await page.getByRole("button", { name: "Zoom out" }).click();
    await addFromBlocks(page, "Text");
    const dragInto = async (
      id: string,
      goalOf: (box: Awaited<ReturnType<typeof boxOf>>) => { x: number; y: number },
      into: string,
    ) => {
      const target = await boxOf(page, into);
      const block = await boxOf(page, id);
      const goal = goalOf(target);
      await page.mouse.move(block.x + block.width / 2, block.y + block.height / 2);
      await page.mouse.down();
      await page.mouse.move(goal.x, goal.y, { steps: 14 });
      await page.waitForTimeout(REST);
      await page.mouse.up();
      return goal;
    };
    // First into the box `sample`, then from it into the box `sample-2`.
    await dragInto(
      "n1",
      (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 }),
      "sample",
    );
    const goal = await dragInto(
      "n1",
      (box) => ({ x: box.x + box.width * 0.5, y: box.y + box.height * 0.5 }),
      "sample-2",
    );
    await expect(
      surface(page).locator('[data-miditor-id="sample-2"] [data-miditor-id="n1"]'),
    ).toHaveCount(1);
    const after = await boxOf(page, "n1");
    // A width in percent of the parent is kept to a hundredth, so the middle can be off by a fraction of a px.
    expect(Math.abs(after.x + after.width / 2 - goal.x)).toBeLessThan(1.5);
    expect(Math.abs(after.y + after.height / 2 - goal.y)).toBeLessThan(1.5);
  });
}
