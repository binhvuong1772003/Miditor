import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createEditorStore, StoreProvider, useStore, useStoreApi, useStoreShallow } from "./index";

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
