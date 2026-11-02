import { emptyPage } from "@midito-kitchen/core";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { createApi, type EditorApi } from "./control-api";
import { ControlProvider } from "./control-context";
import { applyContextMenu, OverrideSlot, type Overrides, OverridesContext } from "./overrides";
import {
  createEditorStore,
  type EditorState,
  initialDocumentState,
  initialHostState,
  initialSelectionState,
  initialViewState,
} from "./store";

const store = createEditorStore<EditorState>({
  ...initialViewState({ narrow: false }),
  ...initialSelectionState("root"),
  ...initialDocumentState(emptyPage()),
  ...initialHostState({ hostStatus: undefined, hasSave: false }),
});

const api: EditorApi = createApi({
  run: (() => true) as never,
  getState: store.getState,
  save: async () => true,
  addBlock: () => {},
  fit: () => {},
  alive: () => true,
});

const a: ContextMenuItem = { label: "A", onSelect: () => {} };
const b: ContextMenuItem = { label: "B", onSelect: () => {} };
const items: readonly ContextMenuItem[] = [a, "separator", b];

const spy = () => vi.spyOn(console, "error").mockImplementation(() => {});
afterEach(() => vi.restoreAllMocks());

describe("applyContextMenu", () => {
  it("no override gives the lines as they are", () => {
    expect(applyContextMenu(undefined, api, items)).toBe(items);
  });

  it("contextMenu adds a line", () => {
    const extra: ContextMenuItem = { label: "Host", onSelect: () => {} };
    const out = applyContextMenu(({ items }) => [...items, extra], api, items);
    expect(out).toEqual([a, "separator", b, extra]);
  });

  it("contextMenu drops a line", () => {
    const out = applyContextMenu(({ items }) => items.filter((i) => i !== b), api, items);
    expect(out).toEqual([a, "separator"]);
  });

  it("a throw in contextMenu gives the default lines", () => {
    const err = spy();
    const out = applyContextMenu(
      () => {
        throw new Error("boom");
      },
      api,
      items,
    );
    expect(out).toBe(items);
    expect(err).toHaveBeenCalledTimes(1);
    expect(String(err.mock.calls[0]?.[0])).toContain('the override of "contextMenu"');
  });

  it("a result that is not a list gives the default lines", () => {
    const err = spy();
    const out = applyContextMenu((() => "nope") as never, api, items);
    expect(out).toBe(items);
    expect(err).toHaveBeenCalledTimes(1);
  });

  it("an item with a bad shape gives the default lines", () => {
    const err = spy();
    for (const bad of [{ label: "x" }, { label: 1, onSelect: () => {} }, 5, null, "line"]) {
      expect(applyContextMenu((() => [a, bad]) as never, api, items)).toBe(items);
    }
    expect(err).toHaveBeenCalledTimes(5);
  });
});

describe("ContextMenu keys", () => {
  it("two items with the same label render two rows", () => {
    const err = spy();
    const html = renderToString(
      <ContextMenu
        x={0}
        y={0}
        onClose={() => {}}
        items={[
          { label: "Same", onSelect: () => {} },
          { label: "Same", onSelect: () => {} },
          { id: "k", label: "", onSelect: () => {} },
        ]}
      />,
    );
    expect(html.match(/role="menuitem"/g)).toHaveLength(3);
    expect(err).not.toHaveBeenCalled();
  });
});

describe("quickActions slot", () => {
  it("quickActions wrapper receives disabled", () => {
    const overrides: Overrides = {
      quickActions: ({ disabled, children }) => (
        <div data-disabled={String(disabled)}>{children}</div>
      ),
    };
    const html = renderToString(
      <ControlProvider api={api}>
        <OverridesContext.Provider value={overrides}>
          <OverrideSlot name="quickActions" props={{ disabled: true }}>
            <i>qa</i>
          </OverrideSlot>
        </OverridesContext.Provider>
      </ControlProvider>,
    );
    expect(html).toBe('<div data-disabled="true"><i>qa</i></div>');
  });
});
