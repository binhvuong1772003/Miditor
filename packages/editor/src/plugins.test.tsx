import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Editor } from "./Editor";
import type { Overrides } from "./overrides";
import { applyPlugins, definePlugin, mergePermissions, usablePlugins } from "./plugins";

const around = (id: string) =>
  definePlugin({
    name: `around-${id}`,
    overrides: { header: ({ children }) => <div id={id}>{children}</div> },
  });

describe("plugins", () => {
  it("wrap the header in order, the host's own outermost", () => {
    const html = renderToString(
      <Editor
        plugins={[around("one"), around("two")]}
        overrides={{ header: ({ children }) => <div id="host">{children}</div> }}
      />,
    );
    const host = html.indexOf('id="host"');
    const two = html.indexOf('id="two"');
    const one = html.indexOf('id="one"');
    const bar = html.indexOf("<header");
    expect(host).toBeGreaterThanOrEqual(0);
    expect(host).toBeLessThan(two);
    expect(two).toBeLessThan(one);
    expect(one).toBeLessThan(bar);
  });

  it("give the same wrapped component for the same pair, whatever object carries it", () => {
    const a = around("a").overrides?.header as NonNullable<Overrides["header"]>;
    const b = around("b").overrides?.header as NonNullable<Overrides["header"]>;
    const first = applyPlugins({
      plugins: [{ name: "x", overrides: { header: a } }],
      overrides: { header: b },
    });
    const second = applyPlugins({
      plugins: [{ name: "x", overrides: { header: a } }],
      overrides: { header: b },
    });
    expect(first.overrides?.header).toBe(second.overrides?.header);
  });

  it("run the context menu functions in order", () => {
    const merged = applyPlugins({
      plugins: [{ name: "a", overrides: { contextMenu: ({ items }) => [...items, "separator"] } }],
      overrides: { contextMenu: ({ items }) => [...items, { label: "Host", onSelect: () => {} }] },
    });
    const lines = merged.overrides?.contextMenu?.({ editor: {} as never, items: [] });
    expect(lines).toEqual(["separator", expect.objectContaining({ label: "Host" })]);
  });

  it("join the hidden parts and keep the host's own", () => {
    const merged = applyPlugins({
      plugins: [
        { name: "a", hide: ["tool.themes"] },
        { name: "b", hide: ["header.zoom", "tool.themes"] },
      ],
      hide: ["rail"],
    });
    expect(new Set(merged.hide)).toEqual(new Set(["tool.themes", "header.zoom", "rail"]));
  });

  it("allow only what every plugin and the host allow", () => {
    const both = mergePermissions(
      { canDelete: true, canEdit: (node) => node.id !== "a" },
      { canDelete: false, canEdit: (node) => node.id !== "b" },
    );
    expect(both?.canDelete).toBe(false);
    const edit = both?.canEdit as (node: { id: string }) => boolean;
    expect([edit({ id: "a" }), edit({ id: "b" }), edit({ id: "c" })]).toEqual([false, false, true]);
    expect(mergePermissions(undefined, { canAdd: false })).toEqual({ canAdd: false });
  });

  it("merge looks, words and config, the later winning, and join lists", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const merged = applyPlugins({
      plugins: [
        {
          name: "a",
          appearance: { scheme: "dark", colors: { text: "#111111", muted: "#222222" } },
          i18n: { locale: "vi", messages: { "header.save": "Lưu A" } },
          config: { fonts: [{ name: "A", stack: "A" }], customFields: { picker: () => null } },
        },
      ],
      appearance: { colors: { text: "#333333" }, radius: "2px" },
      i18n: { messages: { "header.undo": "Hoàn tác" } },
      config: { fonts: [{ name: "B", stack: "B" }], customFields: { picker: () => <i /> } },
    });
    expect(merged.appearance).toEqual({
      scheme: "dark",
      colors: { text: "#333333", muted: "#222222" },
      radius: "2px",
    });
    expect(merged.i18n).toEqual({
      locale: "vi",
      messages: { "header.save": "Lưu A", "header.undo": "Hoàn tác" },
    });
    expect(merged.config?.fonts?.map((font) => font.name)).toEqual(["A", "B"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"picker"'));
    warn.mockRestore();
  });

  it("leave out a plugin with no name, a repeated one or one for a newer version", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const good = { name: "good" };
    const result = usablePlugins([
      good,
      { name: " " },
      { name: "good" },
      { name: "future", apiVersion: 2 },
      { name: "odd", apiVersion: 1.5 },
      { name: "ok", apiVersion: 1 },
    ]);
    expect(result.map(({ name }) => name)).toEqual(["good", "ok"]);
    expect(warn).toHaveBeenCalledTimes(4);
    warn.mockRestore();
  });

  it("change nothing without plugins", () => {
    const props = { overrides: {} };
    expect(applyPlugins(props)).toBe(props);
  });
});
