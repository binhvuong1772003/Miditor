import { useCallback, useEffect, useRef, useState } from "react";

/** How long the pointer rests over a block before the block takes what is dragged: a pass over it does not nest. */
export const DWELL_MS = 150;

/** What a drop reads and what a drag tells; see `useDropCommit`. */
export interface DropCommit {
  /** The block the pointer is over, to be told with every move; `null` when it is over none. */
  setCandidate: (id: string | null) => void;
  /** The block that has taken the drag: lit on the screen, and where the drop lands. Never other than what is lit. */
  committed: string | null;
  /** The same, to read at the moment of the drop, which has not been drawn yet. */
  committedRef: { readonly current: string | null };
}

/**
 * Which block a drag would go into. The page takes it at once; any other block only after the pointer has
 * rested on it for `DWELL_MS`, and it goes away the moment the pointer leaves it. The outline on the screen
 * and the block the drop lands in are the same value, so a drop never goes where nothing was lit.
 */
export function useDropCommit(rootId: string): DropCommit {
  const [committed, setCommitted] = useState<string | null>(null);
  const committedRef = useRef<string | null>(null);
  const candidate = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setCandidate = useCallback(
    (id: string | null) => {
      if (id === candidate.current) return;
      candidate.current = id;
      clearTimeout(timer.current);
      const now = id === null || id === rootId ? id : null;
      committedRef.current = now;
      setCommitted(now);
      if (now === null && id !== null) {
        timer.current = setTimeout(() => {
          committedRef.current = id;
          setCommitted(id);
        }, DWELL_MS);
      }
    },
    [rootId],
  );

  useEffect(() => () => clearTimeout(timer.current), []);
  return { setCandidate, committed, committedRef };
}
