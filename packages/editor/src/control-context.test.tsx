import { emptyPage } from "@miditor/core";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createApi, type EditorApi } from "./control-api";
import { ControlProvider, useEditor } from "./control-context";
import { attachController, createEditor } from "./controller";
import {
  createEditorStore,
  type EditorState,
  initialDocumentState,
  initialHostState,
  initialSelectionState,
  initialViewState,
  StoreProvider,
} from "./store";

const makeStore = (frame: "desktop" | "phone" = "desktop") =>
  createEditorStore<EditorState>({
    ...initialViewState({ narrow: false }),
    frame,
    ...initialSelectionState("root"),
    ...initialDocumentState(emptyPage()),
    ...initialHostState({ hostStatus: undefined, hasSave: true }),
  });

type TestStore = ReturnType<typeof makeStore>;

const stubApi = (store: TestStore) =>
  createApi({
    run: (() => true) as never,
    getState: store.getState,
    save: async () => true,
    addBlock: () => {},
    fit: () => {},
    alive: () => true,
  });

function around(store: TestStore, api: EditorApi, children: ReactNode) {
  return (
    <StoreProvider store={store}>
      <ControlProvider api={api}>{children}</ControlProvider>
    </StoreProvider>
  );
}

let seen: EditorApi | undefined;

function Keeper() {
  seen = useEditor();
  return null;
}

function Reader() {
  return <b>{`${useEditor((view) => view.frame)}|${useEditor((view) => view.canUndo)}`}</b>;
}

function Shape() {
  const { zoom, status } = useEditor((view) => ({ zoom: view.zoom, status: view.status }));
  return <b>{`${zoom}|${status}`}</b>;
}

function Outside({ editor }: { editor: ReturnType<typeof createEditor> }) {
  const same = useEditor(editor) === editor;
  const frame = useEditor(editor, (view) => view.frame);
  const shape = useEditor(editor, (view) => ({ zoom: view.zoom, undo: view.canUndo }));
  return <b>{`${same}|${frame}|${shape.zoom}|${shape.undo}`}</b>;
}

describe("useEditor with a controller", () => {
  it("gives the idle view before an editor is attached", () => {
    expect(renderToString(<Outside editor={createEditor()} />)).toContain("true|desktop|1|false");
  });

  it("reads the editor that is attached", () => {
    const editor = createEditor();
    const store = makeStore("phone");
    attachController(editor, { api: stubApi(store), store });
    expect(renderToString(<Outside editor={editor} />)).toContain("true|phone|1|false");
  });
});

describe("useEditor", () => {
  it("gives the control object of the editor it is drawn in", () => {
    const store = makeStore();
    const api = stubApi(store);
    renderToString(around(store, api, <Keeper />));
    expect(seen).toBe(api);
  });

  it("reads a piece of the state through a selector", () => {
    const store = makeStore("phone");
    expect(renderToString(around(store, stubApi(store), <Reader />))).toContain("phone|false");
  });

  it("takes a selector that builds a new object each time", () => {
    const store = makeStore();
    expect(renderToString(around(store, stubApi(store), <Shape />))).toContain("1|saved");
  });

  it("says so outside an editor", () => {
    expect(() => renderToString(<Keeper />)).toThrow("useEditor must be used inside <Editor>");
  });
});
