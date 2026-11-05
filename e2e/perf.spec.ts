import { expect, test } from "@playwright/test";
import { gotoFrame } from "./helpers";

test("?perf counts how often each part of the editor commits", async ({ page }) => {
  await gotoFrame(page, "/?reset&perf");
  const counts = await page.evaluate(
    () => (window as unknown as { __miditor_perf?: Record<string, number> }).__miditor_perf,
  );
  expect(counts?.editor).toBeGreaterThan(0);
  expect(counts?.canvas).toBeGreaterThan(0);
  expect(counts?.blocks).toBeGreaterThan(0);
});

test("without ?perf nothing is counted", async ({ page }) => {
  await gotoFrame(page, "/?reset");
  const counts = await page.evaluate(
    () => (window as unknown as { __miditor_perf?: unknown }).__miditor_perf,
  );
  expect(counts).toBeUndefined();
});
