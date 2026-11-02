import type { Field, JsonValue } from "@midito-kitchen/core";
import {
  Component,
  type ComponentProps,
  type ComponentType,
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
} from "react";
import type { ContextMenuItem } from "./ContextMenu";
import type { EditorApi } from "./control-api";
import { ApiContext } from "./control-context";
import type { IconName } from "./icons";
import type { Tool } from "./store";

// Places of the editor a host can wrap or replace. Each is drawn by a slot (`OverrideSlot`) that
// looks its name up in `overrides`: without an entry it draws the editor's own part, as it always did.

/** What every component override receives besides the props of its own place. */
type Base = {
  /** The control object of the editor (see `useEditor`). */
  editor: EditorApi;
  /** The editor's own part: draw it to wrap, leave it out to replace. */
  children: ReactNode;
};

/** One tool button of the rail. */
export interface RailTool {
  id: Tool;
  name: string;
  icon: IconName;
  /** Its panel is the one open. */
  active: boolean;
  /** Show its panel, or shut the panel if it is the one shown. */
  pick(): void;
}

/** The places a host replaces with a component. */
export interface ComponentOverrides {
  /** The bar at the top. */
  header: ComponentType<Base>;
  /** The right end of the bar: the host's `headerActions` and Save. */
  headerActions: ComponentType<Base>;
  /** The input of one property of the selected block. */
  field: ComponentType<
    Base & {
      name: string;
      field: Field;
      value: JsonValue;
      /** A new value for this property only. */
      onChange(value: JsonValue): void;
      nodeId: string;
    }
  >;
  /** The tool buttons beside the left panel. */
  rail: ComponentType<Base & { tools: readonly RailTool[] }>;
  /** The left panel. */
  panelStart: ComponentType<Base & { tool: Tool }>;
  /** The right panel: the page's settings, or the properties of the selected block. */
  panelEnd: ComponentType<Base & { mode: "page" | "block"; nodeId: string | null }>;
  /** The row of buttons under the selected block. */
  quickActions: ComponentType<Base & { disabled: boolean }>;
}

/**
 * What a host changes in the editor, by place. @experimental
 *
 * Keep the object stable (a constant or a `useMemo`): a new function for a place is a new component to
 * the editor.
 */
export interface Overrides extends Partial<ComponentOverrides> {
  /**
   * The lines of the right-click menu: given the ones the editor would show, give back the ones to show.
   */
  contextMenu?: (args: {
    editor: EditorApi;
    items: readonly ContextMenuItem[];
  }) => readonly ContextMenuItem[];
}

export const OverridesContext = createContext<Overrides | undefined>(undefined);

type State = { failed: boolean; entry: unknown };

/**
 * Draws the host's override; if it throws, the editor's own part is drawn in its place, outside the
 * try, and one error names the place. The override is tried again when the host gives another one.
 */
export class OverrideBoundary extends Component<
  { entry: unknown; name: string; fallback: ReactNode; children: ReactNode },
  State
> {
  override state: State = { failed: false, entry: this.props.entry };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: { entry: unknown }, state: State): Partial<State> | null {
    return props.entry === state.entry ? null : { failed: false, entry: props.entry };
  }

  override componentDidCatch(error: unknown) {
    console.error(`[midito] the override of "${this.props.name}" threw: ${String(error)}`);
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * A place of the editor. `children` is the editor's own part; `props` are what an override of this place
 * receives besides `editor` and `children`.
 */
export function OverrideSlot<N extends keyof ComponentOverrides>({
  name,
  props,
  children,
}: {
  name: N;
  props: Omit<ComponentProps<ComponentOverrides[N]>, "editor" | "children">;
  children: ReactNode;
}): ReactElement {
  const entry = useContext(OverridesContext)?.[name];
  const editor = useContext(ApiContext);
  if (!entry || !editor) return <>{children}</>;
  const Override = entry as ComponentType<Record<string, unknown>>;
  return (
    <OverrideBoundary entry={entry} name={name} fallback={children}>
      <Override {...props} editor={editor}>
        {children}
      </Override>
    </OverrideBoundary>
  );
}
