import { useSyncExternalStore } from "react";

/** How many recently used colours the picker offers. */
export const MAX_RECENT = 8;

/** The list with this colour first and only once, cut to `max`. Colours compare without case. */
export function remember(list: readonly string[], colour: string, max = MAX_RECENT): string[] {
  const next = colour.toLowerCase();
  return [next, ...list.filter((entry) => entry !== next)].slice(0, max);
}

// The colours live for the editor session only: a library that writes to the host's storage on its
// own would surprise the host.
let recent: readonly string[] = [];
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Puts a colour the user picked at the front of the recent ones. */
export function rememberColour(colour: string): void {
  recent = remember(recent, colour);
  for (const listener of listeners) listener();
}

/** The colours picked most recently, newest first. */
export function useRecentColours(): readonly string[] {
  return useSyncExternalStore(
    subscribe,
    () => recent,
    () => recent,
  );
}
