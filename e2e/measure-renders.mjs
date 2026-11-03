// Prints how many times each part of the editor commits for a few actions. Start the playground
// on port 5199 first (`pnpm --filter playground exec vite --port 5199`), then `pnpm perf`.
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const { moments } = JSON.parse(
  readFileSync(new URL("./render-budget.json", import.meta.url), "utf8"),
);
let failed = false;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:5199/?reset&perf");
const read = () => p.evaluate(() => ({ ...window.__miditor_perf }));
const reset = () =>
  p.evaluate(() => {
    window.__miditor_perf = {};
  });
const step = async (label, fn) => {
  await reset();
  await fn();
  await p.waitForTimeout(600);
  const counts = await read();
  const allowed = moments[label] ?? {};
  const over = Object.entries(counts).filter(([part, n]) => n > (allowed[part] ?? 0));
  if (over.length > 0) failed = true;
  console.log(
    label.padEnd(14),
    JSON.stringify(counts),
    over.length > 0
      ? `OVER BUDGET: ${over.map(([part, n]) => `${part} ${n}>${allowed[part] ?? 0}`).join(", ")}`
      : "",
  );
};

await step("add Text", () => p.getByRole("button", { name: "Text", exact: true }).first().click());
const props = p.locator('aside[aria-label="Properties"]');
const field = props.locator("textarea, input[type=text]").first();
await step("type 5 chars", async () => {
  await field.click();
  await field.pressSequentially("hello", { delay: 40 });
});
const box = await p.locator('[data-miditor-type="Text"]').first().boundingBox();
await step("drag 100px", async () => {
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  await p.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 60, { steps: 10 });
  await p.mouse.up();
});
const moved = await p.locator('[data-miditor-type="Text"]').first().boundingBox();
const page = await p.locator("[data-miditor-render]").first().boundingBox();
await step("select none", () => p.mouse.click(page.x + 5, page.y + page.height - 5));
await step("hover block", () =>
  p.mouse.move(moved.x + moved.width / 2, moved.y + moved.height / 2, { steps: 4 }),
);
await step("select block", () =>
  p.mouse.click(moved.x + moved.width / 2, moved.y + moved.height / 2),
);
await b.close();
if (failed) {
  console.error("A part committed more often than e2e/render-budget.json allows.");
  process.exit(1);
}
