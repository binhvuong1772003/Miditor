import type { ComponentType, ReactNode } from "react";
import type { EditorApi } from "./control-api";
import type { IconName } from "./icons";

/** What the editor gives the panel of a tool of the host. @experimental */
export interface HostToolPanelProps {
  editor: EditorApi;
  /** The label the tool has on the rail. */
  label: string;
}

/**
 * A tool of the host's own on the rail, with its panel beside the canvas (`config.tools`). @experimental
 */
export interface HostTool {
  /** Lower case letters, digits and `-`; not the name of a tool the editor has. */
  id: string;
  /** What the rail and the panel say. Translate it yourself: the editor does not know the words. */
  label: string;
  /** A name of the editor's own icons, or a node of yours. Without it, the first letters of the label. */
  icon?: IconName | ReactNode;
  panel: ComponentType<HostToolPanelProps>;
}

export const BUILT_IN_TOOLS = ["blocks", "layers", "images", "themes"] as const;

const told = new Set<string>();

/** The tools of the host that can be used: a bad id or a repeated one is told once and left out. */
export function usableTools(tools: readonly HostTool[] | undefined): readonly HostTool[] {
  const seen = new Set<string>(BUILT_IN_TOOLS);
  const usable: HostTool[] = [];
  for (const tool of tools ?? []) {
    const ok =
      typeof tool?.id === "string" &&
      /^[a-z][a-z0-9-]{0,39}$/.test(tool.id) &&
      !seen.has(tool.id) &&
      typeof tool.label === "string" &&
      tool.label.trim() !== "" &&
      typeof tool.panel === "function";
    if (!ok) {
      const key = String(tool?.id);
      if (!told.has(key)) {
        told.add(key);
        console.warn(`[miditor] config.tools: the tool "${key}" is not usable and is left out`);
      }
      continue;
    }
    seen.add(tool.id);
    usable.push(tool);
  }
  return usable;
}
