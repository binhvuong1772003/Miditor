import { builtInRegistry, emptyPage, type FreeNode } from "@midito-kitchen/core";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlocksPanel } from "./BlocksPanel";
import { gesturesOf } from "./canvas/SelectionBox";
import { PropertiesPanel } from "./PropertiesPanel";
import { PermissionsContext } from "./permissions-context";
import { quickOffs } from "./QuickActions";
import {
  type CanState,
  canRun,
  createEditorStore,
  type EditorState,
  initialDocumentState,
  initialHostState,
  initialSelectionState,
  initialViewState,
  type Permissions,
  StoreProvider,
} from "./store";

const block: FreeNode = {
  id: "a",
  type: "Text",
  props: { text: "hello" },
  styles: {},
  children: [],
  position: { mode: "free", x: { anchor: "start", offset: 0 }, y: { anchor: "start", offset: 0 } },
  size: { w: { kind: "px", v: 100 }, h: { kind: "px", v: 40 } },
  rotation: 0,
};
const start = emptyPage();
const page = { ...start, root: { ...start.root, children: [block] } };

function makeStore() {
  return createEditorStore<EditorState>({
    ...initialViewState({ narrow: false }),
    ...initialSelectionState(page.root.id),
    ...initialDocumentState(page),
    ...initialHostState({ hostStatus: undefined, hasSave: false }),
    selectedId: "a",
  });
}

const draw = (permissions: Permissions | undefined, part: ReactNode) =>
  renderToString(
    <StoreProvider store={makeStore()}>
      <PermissionsContext.Provider value={permissions}>{part}</PermissionsContext.Provider>
    </StoreProvider>,
  );

const panel = (
  <PropertiesPanel
    node={block}
    device="desktop"
    def={builtInRegistry.Text}
    onPreview={() => {}}
    onCommit={() => {}}
    onDiscard={() => {}}
    onAnchor={() => {}}
    rect={undefined}
    onRect={() => {}}
    onResetPhone={() => {}}
  />
);

const canState = (permissions: Permissions | undefined): CanState => ({
  ...makeStore().getState(),
  permissions,
});

describe("the interface follows the permissions", () => {
  it("no handles for a block that cannot be dragged", () => {
    expect(gesturesOf(true, false)).toEqual({
      draggable: false,
      resizable: false,
      rotatable: false,
    });
    expect(gesturesOf(false, false)).toEqual({ draggable: true, resizable: true, rotatable: true });
    expect(gesturesOf(false, true).resizable).toBe(false);
  });

  it("fields are read-only for a block that cannot be edited", () => {
    expect(draw({ canEdit: false }, panel)).toContain("<fieldset disabled");
    expect(draw({ canEdit: (node) => node.id !== "a" }, panel)).toContain("<fieldset disabled");
    expect(draw({ canEdit: true }, panel)).not.toContain("<fieldset");
    expect(draw(undefined, panel)).not.toContain("<fieldset");
  });

  it("cards are off when blocks cannot be added", () => {
    const cards = (permissions: Permissions | undefined) =>
      draw(
        permissions,
        <BlocksPanel registry={builtInRegistry} disabled={false} onAdd={() => {}} />,
      );
    expect(cards(undefined)).not.toContain("disabled");
    expect(cards({ canAdd: false })).toContain("disabled");
    // A function that refuses the page for one kind turns only that card off.
    const some = cards({ canAdd: (_, kind) => kind !== "Text" });
    expect(some).toContain("disabled");
    expect(some.match(/disabled/g)?.length).toBeLessThan(
      (cards({ canAdd: false }).match(/disabled/g) ?? []).length,
    );
  });

  it("quick action delete is off when canDelete is false", () => {
    expect(quickOffs(canState(undefined)).delete).toBe(true);
    expect(quickOffs(canState({ canDelete: false })).delete).toBe(false);
    expect(quickOffs(canState({ canDelete: false })).duplicate).toBe(true);
  });

  it("menu duplicate line is off when canDuplicate is false", () => {
    // The lines of the menu are `disabled: !canRun(state, name)`.
    expect(canRun(canState(undefined), "block.duplicate")).toBe(true);
    expect(canRun(canState({ canDuplicate: false }), "block.duplicate")).toBe(false);
    expect(quickOffs(canState({ canDuplicate: false })).duplicate).toBe(false);
  });
});
