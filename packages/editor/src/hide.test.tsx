import { builtInRegistry, emptyPage, insertNode, newNode, type TreeNode } from "@miditor/core";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApi, type EditorApi } from "./control-api";
import { ControlProvider } from "./control-context";
import { EndPanel } from "./EndPanel";
import { type HideName, HideProvider } from "./hide";
import { OverrideSlot, type Overrides, OverridesContext } from "./overrides";
import { PropertiesPanel } from "./PropertiesPanel";
import { Rail } from "./Rail";
import { StartPanel } from "./StartPanel";
import {
  createEditorStore,
  type EditorState,
  initialDocumentState,
  initialHostState,
  initialSelectionState,
  initialViewState,
  type Run,
  StoreProvider,
} from "./store";
import { createRun } from "./store/commands";
import type { Env } from "./store/document";
import { Toolbar } from "./Toolbar";

const SIZE = { w: 680, h: 788 };

function makeStore(extra: Partial<EditorState> = {}) {
  const start = emptyPage();
  const root = insertNode(
    start.root,
    "root",
    newNode(builtInRegistry, "Text", "t1", SIZE) as TreeNode,
  );
  return createEditorStore<EditorState>({
    ...initialViewState({ narrow: false }),
    ...initialSelectionState("root"),
    ...initialDocumentState({ ...start, root }),
    ...initialHostState({ hostStatus: undefined, hasSave: true }),
    ...extra,
  });
}

function apiOf(store: ReturnType<typeof makeStore>): EditorApi {
  return createApi({
    run: (() => true) as never,
    getState: store.getState,
    save: async () => true,
    addBlock: () => {},
    fit: () => {},
    alive: () => true,
  });
}

function draw(
  hide: readonly HideName[] | undefined,
  part: ReactNode,
  overrides?: Overrides,
  store = makeStore(),
) {
  return renderToString(
    <StoreProvider store={store}>
      <ControlProvider api={apiOf(store)}>
        <OverridesContext.Provider value={overrides}>
          <HideProvider hide={hide}>{part}</HideProvider>
        </OverridesContext.Provider>
      </ControlProvider>
    </StoreProvider>,
  );
}

const noop = () => {};
const toolbar = (
  <Toolbar
    logo={undefined}
    headerStart={null}
    headerActions={null}
    status="saved"
    saving={false}
    onSave={noop}
    onFit={noop}
    run={(() => true) as unknown as Run}
  />
);
const startPanel = (
  <StartPanel
    registry={builtInRegistry}
    config={undefined}
    onAddBlock={noop}
    onDragMove={noop}
    onDrop={noop}
    onApplyTheme={noop}
  />
);
const endPanel = (
  <EndPanel
    config={undefined}
    documents={{} as never}
    selecting={{} as never}
    parentSize={() => undefined}
    pageHeight={{ value: 800, min: 400 } as never}
    selectedRect={undefined as never}
    shownDef={undefined as never}
  />
);

function properties(selectedCount: number) {
  const node = newNode(builtInRegistry, "Text", "t1", SIZE) as TreeNode;
  return (
    <PropertiesPanel
      initialTab="advanced"
      node={node}
      device="phone"
      def={builtInRegistry.Text}
      onPreview={noop}
      onCommit={noop}
      onDiscard={noop}
      onResetPhone={noop}
      onAnchor={noop}
      onRect={noop}
      selectedCount={selectedCount}
      onAlign={noop}
      onDistribute={noop}
    />
  );
}

afterEach(() => vi.restoreAllMocks());

describe("hide", () => {
  it("a hidden place is not drawn", () => {
    const seen: string[] = [];
    const spy = (name: string) => () => {
      seen.push(name);
      return <b>{name}</b>;
    };
    const overrides: Overrides = {
      header: spy("header"),
      rail: spy("rail"),
      panelStart: spy("panelStart"),
      panelEnd: spy("panelEnd"),
      quickActions: spy("quickActions"),
    };
    const everything = (
      <>
        {toolbar}
        <Rail run={(() => true) as unknown as Run} />
        {startPanel}
        {endPanel}
        <OverrideSlot name="quickActions" props={{ disabled: false }}>
          <i>quick</i>
        </OverrideSlot>
      </>
    );
    expect(draw(undefined, everything, overrides)).toContain("<b>header</b>");
    seen.length = 0;
    const html = draw(
      ["header", "rail", "panelStart", "panelEnd", "quickActions"],
      everything,
      overrides,
    );
    expect(html).toBe("");
    expect(seen).toEqual([]);
  });

  it("hidden header parts are absent and the rest stays", () => {
    const all = draw(undefined, toolbar);
    expect(all).toContain('aria-label="Undo"');
    const html = draw(
      ["header.undo", "header.redo", "header.frame", "header.zoom", "header.save", "header.status"],
      toolbar,
    );
    for (const gone of ["Undo", "Redo", "Desktop", "Zoom out", "Fit", "Save", 'role="status"']) {
      expect(all).toContain(gone);
      expect(html).not.toContain(gone);
    }
    expect(draw(["header.undo"], toolbar)).toContain('aria-label="Redo"');
    expect(draw(["header.undo"], toolbar)).not.toContain('aria-label="Undo"');
    expect(draw(["header.save"], toolbar)).toContain("Desktop");
  });

  it("a hidden tool is absent from the rail and the panel shows the first tool left", () => {
    const rail = <Rail run={(() => true) as unknown as Run} />;
    const html = draw(["tool.blocks", "tool.images"], rail);
    expect(html).not.toContain("Blocks");
    expect(html).not.toContain("Images");
    expect(html).toContain("Layers");
    expect(html).toContain("Themes");
    // The open tool (blocks) is hidden: the first one left (layers) is active and shown.
    expect(html).toMatch(/aria-current="true"[^>]*>(?:<svg.*?<\/svg>)?Layers/);
    const panel = draw(["tool.blocks"], startPanel);
    expect(panel).toContain('aria-label="Layers"');
    expect(draw(undefined, startPanel)).toContain('aria-label="Blocks"');
  });

  it("props.align, props.anchors and props.phone hide their sections", () => {
    const all = draw(undefined, properties(1));
    expect(all).toContain("Align");
    expect(all).toContain("Anchors");
    expect(all).toContain("Phone");
    const noAlign = draw(["props.align"], properties(1));
    expect(noAlign).not.toContain("Align");
    expect(noAlign).toContain("Anchors");
    const noAnchors = draw(["props.anchors"], properties(1));
    expect(noAnchors).not.toContain("Anchors");
    expect(noAnchors).toContain("Phone");
    const noPhone = draw(["props.phone"], properties(1));
    expect(noPhone).not.toContain(">Phone<");
    expect(noPhone).toContain("Anchors");
    // Several blocks selected: the heading stays, the section goes.
    expect(draw(undefined, properties(2))).toContain("Align");
    const many = draw(["props.align"], properties(2));
    expect(many).not.toContain("Align");
    expect(many).toContain("2");
  });

  it("an unknown name warns once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const hide = ["nope.never", "nope.never", "header.undo"] as unknown as HideName[];
    const html = draw(hide, toolbar);
    expect(html).not.toContain('aria-label="Undo"');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("nope.never");
    draw(["nope.never"] as unknown as HideName[], toolbar);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("hiding does not stop the command", () => {
    const store = makeStore();
    const env: Env = { limit: 100, registry: builtInRegistry, denied: () => {} };
    const run = createRun(store, env, () => ({ parentSize: () => SIZE, note: () => {} }));
    const api = createApi({
      run,
      getState: store.getState,
      save: async () => true,
      addBlock: () => {},
      fit: () => {},
      alive: () => true,
    });
    draw(["header.undo", "header.redo"], toolbar, undefined, store);
    expect(api.select("t1")).toBe(true);
    expect(api.remove()).toBe(true);
    expect(api.undo()).toBe(true);
    expect(store.getState().history.present.root.children).toHaveLength(1);
  });
});
