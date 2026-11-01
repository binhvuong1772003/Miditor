import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts", "locales/vi": "src/locales/vi.ts" },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  // Deterministic class names: the default hash depends on the absolute build path.
  // Keep *.module.css file names unique across the package to avoid collisions.
  css: { lightningcss: { cssModules: { pattern: "midito-[name]-[local]" } } },
  deps: { neverBundle: ["react", "react-dom", "react/jsx-runtime"] },
});
