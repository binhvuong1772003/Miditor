import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const fromRoot = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

// Dev serves the library from source, so editing a package reloads the playground without a build.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@midito-kitchen/core": fromRoot("packages/core/src/index.ts"),
      "@midito-kitchen/render": fromRoot("packages/render/src/index.ts"),
      // A subpath comes first: an alias is matched by prefix, so the package name would take it.
      "@midito-kitchen/editor/locales/vi": fromRoot("packages/editor/src/locales/vi.ts"),
      "@midito-kitchen/editor": fromRoot("packages/editor/src/index.ts"),
    },
  },
});
