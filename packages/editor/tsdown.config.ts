import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts", "locales/vi": "src/locales/vi.ts" },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  // Deterministic class names: the default hash depends on the absolute build path.
  // Keep *.module.css file names unique across the package to avoid collisions.
  css: { lightningcss: { cssModules: { pattern: "midito-[name]-[local]" } } },
  deps: {
    neverBundle: ["react", "react-dom", "react/jsx-runtime"],
    // The store library is a devDependency that ends up inside the package, so a host installs nothing
    // for it. Any other library getting bundled would fail the build, to be noticed and decided on.
    alwaysBundle: ["zustand", /^zustand\//],
    onlyBundle: ["zustand"],
  },
});
