import { defineConfig } from "@playwright/test";

// The suite drives the playground the way a person would. It is a safety net for refactors, so it
// asserts behaviour, not markup.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://localhost:5199", viewport: { width: 1440, height: 900 } },
  webServer: {
    command: "pnpm --filter playground exec vite --port 5199 --strictPort",
    url: "http://localhost:5199",
    reuseExistingServer: true,
  },
});
