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
      "@midito-kitchen/editor": fromRoot("packages/editor/src/index.ts"),
    },
  },
});
