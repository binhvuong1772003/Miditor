import { createContext, useContext } from "react";
import { createT, type T } from "./translate";

/** What the parts of the editor say things with. Outside an editor it is English. */
export const TContext = createContext<T>(createT(undefined));

export const useT = (): T => useContext(TContext);
