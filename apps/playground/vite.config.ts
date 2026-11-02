import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const fromRoot = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

// Dev serves the library from source, so editing a package reloads the playground without a build.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@miditor/core": fromRoot("packages/core/src/index.ts"),
      "@miditor/render": fromRoot("packages/render/src/index.ts"),
      // A subpath comes first: an alias is matched by prefix, so the package name would take it.
      "@miditor/editor/locales/vi": fromRoot("packages/editor/src/locales/vi.ts"),
      "@miditor/editor": fromRoot("packages/editor/src/index.ts"),
    },
  },
});
