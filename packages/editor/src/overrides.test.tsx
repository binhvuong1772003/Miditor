import type { Field, JsonValue } from "@midito-kitchen/core";
import { emptyPage } from "@midito-kitchen/core";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createApi, type EditorApi } from "./control-api";
import { ControlProvider } from "./control-context";
import { Editor } from "./Editor";
import { OverrideBoundary, OverrideSlot, type Overrides, OverridesContext } from "./overrides";
import {
  createEditorStore,
  type EditorState,
  initialDocumentState,
  initialHostState,
  initialSelectionState,
  initialViewState,
  StoreProvider,
} from "./store";
import { Toolbar } from "./Toolbar";

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

function draw(overrides: Overrides | undefined, slot: ReactNode) {
  return renderToString(
    <ControlProvider api={api}>
      <OverridesContext.Provider value={overrides}>{slot}</OverridesContext.Provider>
    </ControlProvider>,
  );
}

const Default = <i>default</i>;

describe("OverrideSlot", () => {
  it("draws the default when there is no override", () => {
    expect(
      draw(
        undefined,
        <OverrideSlot name="header" props={{}}>
          {Default}
        </OverrideSlot>,
      ),
    ).toBe("<i>default</i>");
    expect(
      draw(
        {},
        <OverrideSlot name="header" props={{}}>
          {Default}
        </OverrideSlot>,
      ),
    ).toBe("<i>default</i>");
  });

  it("draws the default inside the markup of a wrapper", () => {
    const overrides: Overrides = { header: ({ children }) => <section>{children}</section> };
    expect(
      draw(
        overrides,
        <OverrideSlot name="header" props={{}}>
          {Default}
        </OverrideSlot>,
      ),
    ).toBe("<section><i>default</i></section>");
  });

  it("draws none of the default when the override ignores it", () => {
    const overrides: Overrides = { header: () => <b>mine</b> };
    expect(
      draw(
        overrides,
        <OverrideSlot name="header" props={{}}>
          {Default}
        </OverrideSlot>,
      ),
    ).toBe("<b>mine</b>");
  });

  it("gives the override the editor and the props of the place", () => {
    let seen: unknown;
    const overrides: Overrides = {
      panelEnd: (props) => {
        seen = props;
        return null;
      },
    };
    draw(
      overrides,
      <OverrideSlot name="panelEnd" props={{ mode: "block", nodeId: "n1" }}>
        {Default}
      </OverrideSlot>,
    );
    expect(seen).toMatchObject({ editor: api, mode: "block", nodeId: "n1" });
  });

  it("gives a field its own property", () => {
    const field = { type: "text" } as Field;
    const value: JsonValue = "x";
    let seen: unknown;
    const overrides: Overrides = {
      field: (props) => {
        seen = props;
        return <u>{props.name}</u>;
      },
    };
    const html = draw(
      overrides,
      <OverrideSlot
        name="field"
        props={{ name: "href", field, value, onChange: () => {}, nodeId: "n1" }}
      >
        {Default}
      </OverrideSlot>,
    );
    expect(html).toBe("<u>href</u>");
    expect(seen).toMatchObject({ name: "href", value: "x", nodeId: "n1" });
  });

  it("draws the same when overrides is a new object each time", () => {
    const make = (): Overrides => ({ header: ({ children }) => <p>{children}</p> });
    const slot = (
      <OverrideSlot name="header" props={{}}>
        {Default}
      </OverrideSlot>
    );
    expect(draw(make(), slot)).toBe(draw(make(), slot));
  });
});

describe("OverrideBoundary", () => {
  const entry = () => null;

  it("fails over to the default once the override throws", () => {
    expect(OverrideBoundary.getDerivedStateFromError()).toEqual({ failed: true });
  });

  it("stays on the default while the entry is the same", () => {
    const state = { failed: true, entry };
    expect(OverrideBoundary.getDerivedStateFromProps({ entry }, state)).toBeNull();
  });

  it("tries the override again when its entry changes", () => {
    const state = { failed: true, entry };
    expect(OverrideBoundary.getDerivedStateFromProps({ entry: () => null }, state)).toMatchObject({
      failed: false,
    });
  });

  it("draws the fallback when it has failed", () => {
    const boundary = new OverrideBoundary({
      entry,
      name: "header",
      fallback: Default,
      children: <b />,
    });
    boundary.state = { failed: true, entry };
    expect(boundary.render()).toBe(Default);
  });
});

describe("overrides of the toolbar", () => {
  const bar = (overrides?: Overrides) =>
    renderToString(
      <StoreProvider store={store}>
        <ControlProvider api={api}>
          <OverridesContext.Provider value={overrides}>
            <Toolbar
              logo={null}
              headerStart={null}
              headerActions={<em>host</em>}
              status={undefined}
              saving={false}
              onSave={() => {}}
              onFit={() => {}}
              run={(() => true) as never}
            />
          </OverridesContext.Provider>
        </ControlProvider>
      </StoreProvider>,
    );

  it("wraps the bar in the host's markup", () => {
    const html = bar({ header: ({ children }) => <section id="mine">{children}</section> });
    expect(html.startsWith('<section id="mine"><header')).toBe(true);
    expect(html).toContain("<em>host</em>");
  });

  it("replaces the host's actions and Save", () => {
    const html = bar({ headerActions: () => <b>only mine</b> });
    expect(html).toContain("<b>only mine</b>");
    expect(html).not.toContain("<em>host</em>");
    expect(html).not.toContain("Save");
  });

  it("wraps the actions and keeps Save", () => {
    const html = bar({ headerActions: ({ children }) => <p>{children}</p> });
    expect(html).toContain("<p><em>host</em><button");
  });

  it("draws the same bar with no overrides and with an empty object", () => {
    expect(bar({})).toBe(bar(undefined));
  });
});

describe("the overrides prop of the editor", () => {
  it("draws the same editor with no overrides and with an empty object", () => {
    expect(renderToString(<Editor overrides={{}} />)).toBe(renderToString(<Editor />));
  });

  it("draws the host's header around the bar", () => {
    const html = renderToString(
      <Editor overrides={{ header: ({ children }) => <div id="host-bar">{children}</div> }} />,
    );
    expect(html).toContain('<div id="host-bar"><header');
  });
});
