import { describe, expect, it } from "vitest";
import { type Migration, migratePage, runMigrations } from "./migrate";
import { emptyPage, SCHEMA_VERSION } from "./page";
import type { PageData } from "./types";

const page = emptyPage();
/** A page of an older version: same root, other number. */
const at = (version: unknown) => ({ ...page, schemaVersion: version });

describe("migratePage", () => {
  it("returns a current page as it is", () => {
    const result = migratePage(page);
    expect(result).toEqual({ ok: true, page, from: SCHEMA_VERSION });
    expect(result.ok && result.page).toBe(page);
  });

  it.each([undefined, null, 5, "page", [], true])("says %j is not a page", (value) => {
    expect(migratePage(value)).toEqual({ ok: false, reason: "not-a-page" });
  });

  it.each([undefined, null, "1", 0, -1, 1.5, Number.NaN, {}])(
    "says a page with the version %j is not a page",
    (version) => {
      expect(migratePage(at(version))).toEqual({ ok: false, reason: "not-a-page" });
    },
  );
  it("says a missing version is not a page", () => {
    expect(migratePage({ root: page.root })).toEqual({ ok: false, reason: "not-a-page" });
  });

  it("says a page of a newer version is too new, whatever else it holds", () => {
    expect(migratePage(at(SCHEMA_VERSION + 1))).toEqual({ ok: false, reason: "too-new" });
    expect(migratePage({ schemaVersion: SCHEMA_VERSION + 1 })).toEqual({
      ok: false,
      reason: "too-new",
    });
  });

  it("says a page that is the right version but broken is invalid", () => {
    expect(migratePage({ schemaVersion: SCHEMA_VERSION, root: 5 })).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(migratePage({ ...page, extra: 1 })).toEqual({ ok: false, reason: "invalid" });
  });

  it("does not change what it is given", () => {
    const given = JSON.parse(JSON.stringify(page));
    migratePage(given);
    expect(given).toEqual(page);
  });
});

describe("runMigrations", () => {
  const bump: Migration = (data) => ({
    ...data,
    schemaVersion: (data.schemaVersion as number) + 1,
  });
  const any = (value: unknown): value is PageData => true;
  const log =
    (seen: number[]): Migration =>
    (data) => {
      seen.push(data.schemaVersion as number);
      return bump(data);
    };

  it("runs the steps one after the other up to the target and gives the page and where it began", () => {
    const seen: number[] = [];
    const result = runMigrations(at(1), { 1: log(seen), 2: log(seen) }, 3, any);
    expect(seen).toEqual([1, 2]);
    expect(result).toEqual({ ok: true, page: at(3), from: 1 });
  });

  it("starts from the version the data has", () => {
    const seen: number[] = [];
    const result = runMigrations(at(2), { 1: log(seen), 2: log(seen) }, 3, any);
    expect(seen).toEqual([2]);
    expect(result).toEqual({ ok: true, page: at(3), from: 2 });
  });

  it("runs no step for data that is already at the target", () => {
    const seen: number[] = [];
    expect(runMigrations(at(3), { 1: log(seen), 2: log(seen), 3: log(seen) }, 3, any)).toEqual({
      ok: true,
      page: at(3),
      from: 3,
    });
    expect(seen).toEqual([]);
  });

  it("checks the result with the real check by default", () => {
    expect(runMigrations(at(1), { 1: bump }, 2)).toEqual({ ok: false, reason: "invalid" });
    expect(runMigrations(page, {}, SCHEMA_VERSION)).toEqual({
      ok: true,
      page,
      from: SCHEMA_VERSION,
    });
  });

  it("calls a missing step, a step that gives no object and a step that skips a number invalid", () => {
    const invalid = { ok: false, reason: "invalid" };
    expect(runMigrations(at(1), { 2: bump }, 3, any)).toEqual(invalid);
    expect(runMigrations(at(1), { 1: bump }, 3, any)).toEqual(invalid);
    expect(runMigrations(at(1), { 1: () => null as never }, 2, any)).toEqual(invalid);
    expect(runMigrations(at(1), { 1: (d) => ({ ...d, schemaVersion: 3 }) }, 2, any)).toEqual(
      invalid,
    );
    expect(runMigrations(at(1), { 1: (d) => d }, 2, any)).toEqual(invalid);
  });

  it("does not take a step from the prototype", () => {
    const inherited = Object.create({ 1: bump }) as Record<number, Migration>;
    expect(runMigrations(at(1), inherited, 2, any)).toEqual({ ok: false, reason: "invalid" });
  });

  it("refuses data newer than the target without running any step", () => {
    const seen: number[] = [];
    expect(runMigrations(at(5), { 1: log(seen) }, 3, any)).toEqual({
      ok: false,
      reason: "too-new",
    });
    expect(seen).toEqual([]);
  });
});
