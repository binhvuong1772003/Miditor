import { expect, test } from "@playwright/test";

test("?perf counts how often each part of the editor commits", async ({ page }) => {
  await page.goto("/?reset&perf");
  const counts = await page.evaluate(
    () => (window as unknown as { __midito_perf?: Record<string, number> }).__midito_perf,
  );
  expect(counts?.editor).toBeGreaterThan(0);
  expect(counts?.canvas).toBeGreaterThan(0);
  expect(counts?.blocks).toBeGreaterThan(0);
});

test("without ?perf nothing is counted", async ({ page }) => {
  await page.goto("/?reset");
  const counts = await page.evaluate(
    () => (window as unknown as { __midito_perf?: unknown }).__midito_perf,
  );
  expect(counts).toBeUndefined();
});
