// Fails when a built bundle weighs more than `budgets.json` allows. Run `pnpm build` first.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const { bundles } = JSON.parse(readFileSync(new URL("../budgets.json", import.meta.url), "utf8"));
let failed = false;
for (const [path, budget] of Object.entries(bundles)) {
  let code;
  try {
    code = readFileSync(new URL(`../${path}`, import.meta.url));
  } catch {
    console.error(`${path}: not built (run pnpm build first)`);
    failed = true;
    continue;
  }
  const raw = code.length;
  const gzip = gzipSync(code).length;
  const ok = raw <= budget.raw && gzip <= budget.gzip;
  if (!ok) failed = true;
  const kb = (n) => `${(n / 1000).toFixed(2)} kB`;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${path.padEnd(36)} ${kb(raw)} / ${kb(budget.raw)} raw, ${kb(gzip)} / ${kb(budget.gzip)} gzip`,
  );
}
process.exit(failed ? 1 : 0);
