// Prints how many times each part of the editor commits for a few actions. Start the playground
// on port 5199 first (`pnpm --filter playground exec vite --port 5199`), then `pnpm perf`.
import { chromium } from "@playwright/test";

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:5199/?reset&perf");
const read = () => p.evaluate(() => ({ ...window.__midito_perf }));
const reset = () =>
  p.evaluate(() => {
    window.__midito_perf = {};
  });
const step = async (label, fn) => {
  await reset();
  await fn();
  await p.waitForTimeout(600);
  console.log(label.padEnd(14), JSON.stringify(await read()));
};

await p.getByRole("button", { name: "Text", exact: true }).first().click();
await p.waitForTimeout(300);
const props = p.locator('aside[aria-label="Properties"]');
const field = props.locator("textarea, input[type=text]").first();
await step("type 5 chars", async () => {
  await field.click();
  await field.pressSequentially("hello", { delay: 40 });
});
const box = await p.locator('[data-midito-type="Text"]').first().boundingBox();
await step("drag 100px", async () => {
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  await p.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 60, { steps: 10 });
  await p.mouse.up();
});
await b.close();
