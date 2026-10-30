import { isPageData, SCHEMA_VERSION } from "./page";
import type { PageData } from "./types";

/**
 * What `migratePage` found. `from` is the version the data had. `not-a-page`: not an object with a
 * whole `schemaVersion` of 1 or more. `too-new`: made by a newer version than this one can read.
 * `invalid`: of a version this one reads (or can upgrade) but not a page `isPageData` accepts.
 */
export type MigrateResult =
  | { ok: true; page: PageData; from: number }
  | { ok: false; reason: "not-a-page" | "too-new" | "invalid" };

/** One step: the data of version N written as version N + 1. It may assume nothing else about the data. */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * The steps from older versions, by the version each one starts from: `MIGRATIONS[1]` writes a
 * version 1 page as version 2. Empty while the schema is still at version 1. A step sets the
 * `schemaVersion` itself.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * `data` brought up to `target` one step at a time, then checked with `isPageData`. Split from
 * `migratePage` so that a chain of steps can be tried with steps of its own; `accept` is the check
 * the result has to pass, `isPageData` unless a test says otherwise.
 */
export function runMigrations(
  data: unknown,
  steps: Readonly<Record<number, Migration>>,
  target: number,
  accept: (value: unknown) => value is PageData = isPageData,
): MigrateResult {
  if (!isRecord(data)) return { ok: false, reason: "not-a-page" };
  const from = data.schemaVersion;
  if (typeof from !== "number" || !Number.isInteger(from) || from < 1) {
    return { ok: false, reason: "not-a-page" };
  }
  if (from > target) return { ok: false, reason: "too-new" };
  let current: Record<string, unknown> = data;
  for (let version = from; version < target; version++) {
    const step = Object.hasOwn(steps, version) ? steps[version] : undefined;
    if (!step) return { ok: false, reason: "invalid" };
    current = step(current);
    if (!isRecord(current) || current.schemaVersion !== version + 1) {
      return { ok: false, reason: "invalid" };
    }
  }
  return accept(current) ? { ok: true, page: current, from } : { ok: false, reason: "invalid" };
}

/**
 * Open data from outside (a saved file, a browser store, a server) as a page of this version: a page
 * that is current comes back as it is, an older one is upgraded step by step, and anything else is
 * told apart by `reason`. Never throws and never changes what it is given.
 */
export const migratePage = (data: unknown): MigrateResult =>
  runMigrations(data, MIGRATIONS, SCHEMA_VERSION);
