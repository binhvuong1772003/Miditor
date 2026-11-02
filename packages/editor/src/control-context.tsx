import { createContext, type ReactNode } from "react";
import type { EditorApi } from "./control-api";

export const ApiContext = createContext<EditorApi | null>(null);

/** Gives the parts drawn inside one editor its control object. */
export function ControlProvider({ api, children }: { api: EditorApi; children: ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}
