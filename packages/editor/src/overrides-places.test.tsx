import { builtInRegistry, emptyPage } from "@miditor/core";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createApi, type EditorApi } from "./control-api";
import { ControlProvider } from "./control-context";
import { EndPanel } from "./EndPanel";
import { type Overrides, OverridesContext, type RailTool } from "./overrides";
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

const page = emptyPage();

function makeStore(selectedId: string | null = null) {
  return createEditorStore<EditorState>({
    ...initialViewState({ narrow: false }),
    ...initialSelectionState(page.root.id),
    ...initialDocumentState(page),
    ...initialHostState({ hostStatus: undefined, hasSave: false }),
    selectedId,
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
  store: ReturnType<typeof makeStore>,
  overrides: Overrides | undefined,
  part: ReactNode,
) {
  return renderToString(
    <StoreProvider store={store}>
      <ControlProvider api={apiOf(store)}>
        <OverridesContext.Provider value={overrides}>{part}</OverridesContext.Provider>
      </ControlProvider>
    </StoreProvider>,
  );
}

const startPanel = (
  <StartPanel
    registry={builtInRegistry}
    config={undefined}
    onAddBlock={() => {}}
    onDragMove={() => {}}
    onDrop={() => {}}
    onApplyTheme={() => {}}
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

describe("the rail override", () => {
  it("rail receives the four tools and pick runs tool.pick", () => {
    const run = vi.fn();
    let tools: readonly RailTool[] = [];
    draw(
      makeStore(),
      {
        rail: (props) => {
          tools = props.tools;
          return null;
        },
      },
      <Rail run={run as unknown as Run} />,
    );
    expect(tools.map((tool) => tool.id)).toEqual(["blocks", "layers", "images", "themes"]);
    expect(tools.map((tool) => tool.icon)).toEqual(["grid", "layers", "img", "palette"]);
    expect(tools.map((tool) => tool.active)).toEqual([true, false, false, false]);
    tools[0]?.pick();
    expect(run).toHaveBeenCalledWith("tool.pick", "blocks");
  });

  it("a replaced rail still lets the panel change through pick", () => {
    const store = makeStore();
    const run = ((name: string, tool: never) => {
      if (name === "tool.pick") store.setState({ tool, panelOpen: true } as never);
      return true;
    }) as unknown as Run;
    let tools: readonly RailTool[] = [];
    const overrides: Overrides = {
      rail: (props) => {
        tools = props.tools;
        return <b>mine</b>;
      },
    };
    expect(draw(store, overrides, <Rail run={run} />)).toBe("<b>mine</b>");
    tools[1]?.pick();
    expect(store.getState().tool).toBe("layers");
    // The server render reads the first state of a store, so the panel is drawn from the state `pick` left.
    let seen: unknown;
    draw(
      createEditorStore<EditorState>(store.getState()),
      {
        panelStart: (props) => {
          seen = props.tool;
          return null;
        },
      },
      startPanel,
    );
    expect(seen).toBe("layers");
  });

  it("the default markup is the same with and without overrides={{}} for the rail", () => {
    const store = makeStore();
    const rail = <Rail run={(() => true) as never} />;
    expect(draw(store, {}, rail)).toBe(draw(store, undefined, rail));
  });
});

describe("the panelStart override", () => {
  it("panelStart receives the open tool", () => {
    let seen: unknown;
    draw(
      makeStore(),
      {
        panelStart: (props) => {
          seen = props.tool;
          return null;
        },
      },
      startPanel,
    );
    expect(seen).toBe("blocks");
  });

  it("the default markup is the same with and without overrides={{}} for the start panel", () => {
    const store = makeStore();
    expect(draw(store, {}, startPanel)).toBe(draw(store, undefined, startPanel));
  });
});

describe("the panelEnd override", () => {
  const modeOf = (store: ReturnType<typeof makeStore>) => {
    let seen: unknown;
    draw(
      store,
      {
        panelEnd: (props) => {
          seen = { mode: props.mode, nodeId: props.nodeId };
          return null;
        },
      },
      endPanel,
    );
    return seen;
  };

  it("panelEnd receives mode page with no selection and mode block with one", () => {
    expect(modeOf(makeStore(null))).toEqual({ mode: "page", nodeId: null });
    expect(modeOf(makeStore(page.root.id))).toEqual({ mode: "block", nodeId: page.root.id });
  });

  it("the default markup is the same with and without overrides={{}} for the end panel", () => {
    const store = makeStore();
    expect(draw(store, {}, endPanel)).toBe(draw(store, undefined, endPanel));
  });
});
