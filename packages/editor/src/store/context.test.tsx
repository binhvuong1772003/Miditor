import { builtInRegistry, emptyPage } from "@midito-kitchen/core";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  createEditorStore,
  type EditorState,
  initialDocumentState,
  initialHostState,
  initialSelectionState,
  initialViewState,
  type Run,
  StoreProvider,
  useRun,
  useStore,
  useStoreApi,
  useStoreShallow,
} from "./index";

type State = { zoom: number; tool: string };
const initial: State = { zoom: 1.25, tool: "layers" };

function Zoom() {
  return <b>{useStore((state: State) => state.zoom)}</b>;
}

function Both() {
  const { zoom, tool } = useStoreShallow((state: State) => ({
    zoom: state.zoom,
    tool: state.tool,
  }));
  return (
    <i>
      {tool} {zoom}
    </i>
  );
}

let seen: unknown;
function Probe() {
  seen = useStoreApi<State>();
  return null;
}

describe("the store in React", () => {
  it("gives a part the piece it asks for", () => {
    const html = renderToString(
      <StoreProvider store={createEditorStore(initial)}>
        <Zoom />
      </StoreProvider>,
    );
    expect(html).toContain("1.25");
  });

  it("lets a selector build a new object each time when it compares the members", () => {
    const html = renderToString(
      <StoreProvider store={createEditorStore(initial)}>
        <Both />
      </StoreProvider>,
    );
    expect(html.replaceAll("<!-- -->", "")).toContain("layers 1.25");
  });

  it("gives two editors each their own state", () => {
    const html = renderToString(
      <>
        <StoreProvider store={createEditorStore({ ...initial, zoom: 2 })}>
          <Zoom />
        </StoreProvider>
        <StoreProvider store={createEditorStore({ ...initial, zoom: 3 })}>
          <Zoom />
        </StoreProvider>
      </>,
    );
    expect(html).toContain(">2<");
    expect(html).toContain(">3<");
  });

  it("hands the store to a part that gives it commands", () => {
    const store = createEditorStore(initial);
    renderToString(
      <StoreProvider store={store}>
        <Probe />
      </StoreProvider>,
    );
    expect(seen).toBe(store);
  });

  it("says so when a part reads the store outside of an editor", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderToString(<Zoom />)).toThrow("outside of an editor");
    spy.mockRestore();
  });
});

const doors = new Map<string, Run>();
const quiet = { parentSize: () => null, note: () => {} };
function Door({ name }: { name: string }) {
  doors.set(name, useRun(100, builtInRegistry, quiet));
  return null;
}

describe("useRun", () => {
  it("gives a door that works on the store of its own editor, also in StrictMode", () => {
    const state = (): EditorState => ({
      ...initialViewState({ narrow: false }),
      ...initialSelectionState("root"),
      ...initialDocumentState(emptyPage()),
      ...initialHostState({ hostStatus: undefined, hasSave: false }),
    });
    const a = createEditorStore<EditorState>(state());
    const b = createEditorStore<EditorState>(state());
    doors.clear();
    renderToString(
      <StrictMode>
        <StoreProvider store={a}>
          <Door name="a" />
        </StoreProvider>
        <StoreProvider store={b}>
          <Door name="b" />
        </StoreProvider>
      </StrictMode>,
    );
    (doors.get("a") as Run)("view.zoom", "in");
    expect(a.getState().zoom).toBe(1.25);
    expect(b.getState().zoom).toBe(1);
  });
});
