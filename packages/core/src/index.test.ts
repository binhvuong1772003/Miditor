import { expect, it } from "vitest";
import { SCHEMA_VERSION } from "./index";

it("exposes the schema version", () => {
  expect(SCHEMA_VERSION).toBe(1);
});
