import { type ComponentProps, createContext, type ReactNode, useContext } from "react";
import type { EndPanel } from "./EndPanel";
import type { Rail } from "./Rail";
import type { StartPanel } from "./StartPanel";
import type { Toolbar } from "./Toolbar";

/**
 * What the parts of the editor need from the provider that is not already in the store or in one of
 * the other contexts: for each part, the props it is drawn with. The provider builds it on every
 * render, as it drew its parts before they became parts.
 */
export interface Shell {
  header: ComponentProps<typeof Toolbar>;
  rail: ComponentProps<typeof Rail>;
  start: ComponentProps<typeof StartPanel>;
  end: ComponentProps<typeof EndPanel>;
  /** The canvas, as the provider draws it. */
  canvas: ReactNode;
}

export const ShellContext = createContext<Shell | null>(null);

/** The shell of the provider this part is drawn in; `part` names the part in the error. */
export function useShell(part: string): Shell {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error(`${part} must be used inside <EditorProvider>`);
  return shell;
}
