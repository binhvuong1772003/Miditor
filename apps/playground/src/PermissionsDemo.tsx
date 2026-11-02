import {
  type Denial,
  type HideName,
  type PageData,
  type Permissions,
  useEditor,
} from "@miditor/editor";
import { useState, useSyncExternalStore } from "react";
import { SAMPLE_PAGE } from "./sample-page";

// The host's side of `permissions`, `hide` and `onDenied` (`?permissions`): the footer of the page is
// locked by its id, every other block is free. `?permissions&viewer` refuses every change. Each
// `permissions` object is made once here, so the editor sees a stable one.

const LOCKED = "footer";

/** The sample page with a footer Text block the host will lock. */
export const PERMISSIONS_PAGE: PageData = {
  ...SAMPLE_PAGE,
  root: {
    ...SAMPLE_PAGE.root,
    children: [
      ...SAMPLE_PAGE.root.children,
      {
        id: LOCKED,
        type: "Text",
        props: { text: "Footer, kept by the host" },
        styles: {},
        position: {
          mode: "free",
          x: { anchor: "start", offset: 300 },
          y: { anchor: "start", offset: 200 },
        },
        size: { w: { kind: "px", v: 260 }, h: { kind: "px", v: 48 } },
        rotation: 0,
        children: [],
      },
    ],
  },
};

const free = (node: { id: string }) => node.id !== LOCKED;

export const lockedFooter: Permissions = {
  canDelete: free,
  canDrag: free,
  canEdit: free,
  canDuplicate: free,
};

export const viewer: Permissions = {
  canEdit: false,
  canDelete: false,
  canDuplicate: false,
  canDrag: false,
  canAdd: false,
};

export const hidden: readonly HideName[] = ["tool.themes", "props.anchors"];

// The last denial and how many there were. They live outside the editor, like the host's own state.
let last = "";
let count = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export function onDenied(denial: Denial): void {
  last = `${denial.action} ${denial.nodeId ?? "none"}`;
  count += 1;
  for (const listener of listeners) listener();
}

/** The host's notice: what was refused last and how many times. Drawn outside the editor. */
export function DeniedNotice() {
  const text = useSyncExternalStore(subscribe, () => last);
  const total = useSyncExternalStore(subscribe, () => count);
  return (
    <p style={{ margin: 8 }}>
      Refused: <span data-testid="denied">{text}</span> (
      <span data-testid="denied-count">{total}</span>)
    </p>
  );
}

/** A button of the host's own that takes the selected block away with `editor.remove()` and shows the answer. */
export function PermissionsHeader() {
  const editor = useEditor();
  const [result, setResult] = useState("");
  return (
    <>
      <button
        type="button"
        className="preview-link"
        onClick={() => setResult(String(editor.remove()))}
      >
        Host remove
      </button>
      <span className="preview-link" data-testid="host-remove-result">
        {result}
      </span>
    </>
  );
}
