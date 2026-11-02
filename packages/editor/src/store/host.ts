import type { SaveStatus } from "../save-status";
import { change } from "./change";
import type { HostState } from "./state";

// What the host tells the editor through its props and the header shows: the word it gave for how the
// page is stored, and whether it gave a way to save. Kept in the store so a part can read the status
// of the header with a selector.

export function initialHostState(host: {
  hostStatus: SaveStatus | undefined;
  hasSave: boolean;
}): HostState {
  return { hostStatus: host.hostStatus, hasSave: host.hasSave };
}

/** The same state when the host says what it said before. */
export const setHost = <S extends HostState>(
  state: S,
  host: { hostStatus: SaveStatus | undefined; hasSave: boolean },
): S => change(state, host as Partial<S>);
