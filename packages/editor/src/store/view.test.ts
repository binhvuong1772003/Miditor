import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import { createEditorStore } from "./create-editor-store";
import type { Tool, ViewState } from "./state";
import {
  announce,
  initialViewState,
  pickTool,
  setFrame,
  setZoom,
  showTool,
  viewCommands,
} from "./view";

const start = initialViewState({ narrow: false });
const tools: Tool[] = ["blocks", "layers", "images", "themes"];

describe("initialViewState", () => {
  it("shows the page on the desktop at full size with the blocks panel open", () => {
    expect(start).toEqual({
      frame: "desktop",
      zoom: 1,
      tool: "blocks",
      panelOpen: true,
      announcement: "",
    });
  });

  it("starts a narrow screen without the panel", () => {
    expect(initialViewState({ narrow: true }).panelOpen).toBe(false);
  });
});

describe("setFrame and setZoom", () => {
  it("change the frame and the zoom", () => {
    expect(setFrame(start, "phone").frame).toBe("phone");
    expect(setZoom(start, 1.5).zoom).toBe(1.5);
  });

  it("take a function of the zoom before", () => {
    expect(setZoom({ ...start, zoom: 2 }, (now) => now / 2).zoom).toBe(1);
  });

  it("give back the very state when nothing changes", () => {
    expect(setFrame(start, "desktop")).toBe(start);
    expect(setZoom(start, 1)).toBe(start);
    expect(setZoom(start, (now) => now)).toBe(start);
  });
});

describe("pickTool", () => {
  it("shows another tool and opens its panel", () => {
    const shut = { ...start, panelOpen: false };
    expect(pickTool(shut, "layers")).toMatchObject({ tool: "layers", panelOpen: true });
    expect(pickTool(start, "themes")).toMatchObject({ tool: "themes", panelOpen: true });
  });

  it("shuts the panel when the tool shown is pressed again, and keeps the tool", () => {
    expect(pickTool(start, "blocks")).toMatchObject({ tool: "blocks", panelOpen: false });
  });

  it("opens the panel of the tool when it is the tool of a shut panel", () => {
    const shut = { ...start, panelOpen: false };
    expect(pickTool(shut, "blocks")).toMatchObject({ tool: "blocks", panelOpen: true });
  });

  it("gives back the very state when showing a tool already shown and open", () => {
    expect(showTool(start, "blocks")).toBe(start);
  });

  it("leaves the panel open iff the last press was not on the tool shown", () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...tools), { minLength: 1 }), (presses) => {
        let state: ViewState = { ...start, panelOpen: false };
        let before = state;
        for (const press of presses) {
          before = state;
          state = pickTool(state, press);
        }
        const last = presses[presses.length - 1];
        const toggledOff = before.tool === last && before.panelOpen;
        expect(state.panelOpen).toBe(!toggledOff);
        expect(state.tool).toBe(toggledOff ? before.tool : last);
      }),
    );
  });
});

describe("announce", () => {
  it("says the words", () => {
    expect(announce(start, "Block added").announcement).toBe("Block added");
  });

  it("makes the same words new with a space at the end, and then the plain ones again", () => {
    const once = announce(start, "Box selected");
    const twice = announce(once, "Box selected");
    expect(twice.announcement).toBe("Box selected ");
    expect(announce(twice, "Box selected").announcement).toBe("Box selected");
  });

  it("never says the same thing as the time before, whatever is said", () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom("a", "b", "c"), { minLength: 2 }), (lines) => {
        let state = start;
        let previous = state.announcement;
        for (const line of lines) {
          state = announce(state, line);
          expect(state.announcement).not.toBe(previous);
          previous = state.announcement;
        }
      }),
    );
  });
});

describe("viewCommands", () => {
  it("run the commands on the store", () => {
    const store = createEditorStore(start);
    const view = viewCommands(store);
    view.setFrame("phone");
    view.setZoom((now) => now * 2);
    view.pickTool("images");
    view.announce("Hello");
    expect(store.getState()).toEqual({
      frame: "phone",
      zoom: 2,
      tool: "images",
      panelOpen: true,
      announcement: "Hello",
    });
  });

  it("tell nobody when the command changes nothing", () => {
    const store = createEditorStore(start);
    const listener = vi.fn();
    store.subscribe(listener);
    const view = viewCommands(store);
    view.setFrame("desktop");
    view.setZoom(1);
    view.showTool("blocks");
    expect(listener).not.toHaveBeenCalled();
  });
});
