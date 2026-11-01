import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import { createEditorStore } from "./create-editor-store";

describe("createEditorStore", () => {
  it("starts with the state it is given", () => {
    const initial = { zoom: 1 };
    expect(createEditorStore(initial).getState()).toBe(initial);
  });

  it("keeps what a change does not name", () => {
    const store = createEditorStore({ zoom: 1, tool: "blocks" });
    store.setState({ zoom: 2 });
    expect(store.getState()).toEqual({ zoom: 2, tool: "blocks" });
  });

  it("takes a function of the state before the change", () => {
    const store = createEditorStore({ zoom: 1 });
    store.setState((state) => ({ zoom: state.zoom + 1 }));
    expect(store.getState().zoom).toBe(2);
  });

  it("tells a listener once for a change that sets several things", () => {
    const store = createEditorStore({ zoom: 1, tool: "blocks", frame: "desktop" });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ zoom: 2, tool: "layers", frame: "phone" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("tells nobody when a change gives back the state it was handed", () => {
    const store = createEditorStore({ zoom: 1 });
    const before = store.getState();
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState((state) => state);
    expect(listener).not.toHaveBeenCalled();
    expect(store.getState()).toBe(before);
  });

  it("gives the listener the new state and the old one", () => {
    const store = createEditorStore({ zoom: 1 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ zoom: 2 });
    expect(listener).toHaveBeenCalledWith({ zoom: 2 }, { zoom: 1 });
  });

  it("stops telling a listener that has unsubscribed", () => {
    const store = createEditorStore({ zoom: 1 });
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    stop();
    store.setState({ zoom: 2 });
    expect(listener).not.toHaveBeenCalled();
  });

  it("does not call a listener that was removed while the others were being told", () => {
    const store = createEditorStore({ zoom: 1 });
    const second = vi.fn();
    let stopSecond = () => {};
    store.subscribe(() => stopSecond());
    stopSecond = store.subscribe(second);
    store.setState({ zoom: 2 });
    store.setState({ zoom: 3 });
    expect(second).not.toHaveBeenCalled();
  });

  it("keeps the states of two editors apart", () => {
    const one = createEditorStore({ zoom: 1 });
    const other = createEditorStore({ zoom: 1 });
    const listener = vi.fn();
    other.subscribe(listener);
    one.setState({ zoom: 3 });
    expect(other.getState().zoom).toBe(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it("ends in the last state set, whatever the changes were", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 1 }), (zooms) => {
        const store = createEditorStore({ zoom: 0 });
        for (const zoom of zooms) store.setState({ zoom });
        expect(store.getState().zoom).toBe(zooms[zooms.length - 1]);
      }),
    );
  });
});
