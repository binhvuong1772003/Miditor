import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { Tool } from "./store";

/**
 * The parts of the interface a host can hide, by name. Hiding only stops a part being drawn; it never
 * stops a command (only `permissions` do). Experimental.
 */
export type HideName =
  | "header"
  | "rail"
  | "panelStart"
  | "panelEnd"
  | "quickActions"
  | "contextMenu"
  | "header.undo"
  | "header.redo"
  | "header.frame"
  | "header.zoom"
  | "header.save"
  | "header.status"
  | "tool.blocks"
  | "tool.layers"
  | "tool.images"
  | "tool.themes"
  | "props.align"
  | "props.anchors"
  | "props.phone";

const NAMES: ReadonlySet<string> = new Set<HideName>([
  "header",
  "rail",
  "panelStart",
  "panelEnd",
  "quickActions",
  "contextMenu",
  "header.undo",
  "header.redo",
  "header.frame",
  "header.zoom",
  "header.save",
  "header.status",
  "tool.blocks",
  "tool.layers",
  "tool.images",
  "tool.themes",
  "props.align",
  "props.anchors",
  "props.phone",
]);

const TOOLS: readonly Tool[] = ["blocks", "layers", "images", "themes"];

const warned = new Set<string>();

/** The names that are known; each unknown one is ignored, with one warning for the whole session. */
function known(hide: readonly string[]): ReadonlySet<string> {
  const set = new Set<string>();
  for (const name of hide) {
    if (NAMES.has(name)) set.add(name);
    else if (!warned.has(name)) {
      warned.add(name);
      console.warn(`[midito] hide: "${name}" is not a part that can be hidden; ignored.`);
    }
  }
  return set;
}

export const HideContext = createContext<ReadonlySet<string> | undefined>(undefined);

/** Gives the parts of the editor the list of what to hide. */
export function HideProvider({
  hide,
  children,
}: {
  hide: readonly HideName[] | undefined;
  children: ReactNode;
}) {
  const set = useMemo(() => (hide && hide.length > 0 ? known(hide) : undefined), [hide]);
  return <HideContext.Provider value={set}>{children}</HideContext.Provider>;
}

/** Whether this part is hidden. */
export function useHidden(name: HideName): boolean {
  return useContext(HideContext)?.has(name) ?? false;
}

/** The names asked of the context from places that do not have a `HideName` (a slot name, say). */
export function useHiddenName(name: string): boolean {
  return useContext(HideContext)?.has(name) ?? false;
}

/** The tool whose panel is shown: the open one, or the first tool left when it is hidden. */
export function visibleTool(tool: Tool, hidden: (name: HideName) => boolean): Tool {
  if (!hidden(`tool.${tool}`)) return tool;
  return TOOLS.find((id) => !hidden(`tool.${id}`)) ?? tool;
}

/** The open tool as the panel and the rail show it. */
export function useVisibleTool(tool: Tool): Tool {
  const set = useContext(HideContext);
  return visibleTool(tool, (name) => set?.has(name) ?? false);
}
