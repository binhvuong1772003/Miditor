import type { Overrides } from "@midito-kitchen/editor";
import { useSyncExternalStore } from "react";

// The host's side of `overrides` (`?overrides`): a bar around the editor's, the host's own rail, frames
// around the two panels and the quick actions, a line in the right-click menu, and its own input for
// the link of a Button. Each `overrides` object is made once, here, so the editor sees a stable one.

// How many times "Host: log" ran. It lives outside the editor, like the host's own state would.
let logCount = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** Shows how often the menu line "Host: log" ran; it is drawn outside the editor. */
export function HostLogCount() {
  const count = useSyncExternalStore(subscribe, () => logCount);
  return (
    <p style={{ margin: 8 }}>
      Host log: <span data-testid="host-log-count">{count}</span>
    </p>
  );
}

// The editor lays its parts out as grid items, so a wrapper is a grid item itself: it keeps the part's
// place (the bar spans the row) and gives the part its own cell.
const frame = {
  border: "2px dashed #2563eb",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  minBlockSize: 0,
  overflow: "hidden",
} as const;

const common: Overrides = {
  header: ({ children }) => (
    <div
      data-testid="host-bar"
      style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center" }}
    >
      <strong style={{ padding: "0 8px" }}>Host title</strong>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  ),
  rail: ({ tools }) => (
    <div role="toolbar" aria-label="Host tools" style={{ display: "grid", alignContent: "start" }}>
      {tools.map(({ id, name, active, pick }) => (
        <button
          key={id}
          type="button"
          data-testid={`host-tool-${id}`}
          aria-pressed={active}
          onClick={pick}
        >
          {name}
        </button>
      ))}
    </div>
  ),
  panelStart: ({ tool, children }) => (
    <div data-testid="host-panel-frame" style={frame}>
      <small>
        Open tool: <span data-testid="host-open-tool">{tool}</span>
      </small>
      {children}
    </div>
  ),
  panelEnd: ({ mode, children }) => (
    <div data-testid="host-panel-end" style={frame}>
      <small>mode: {mode}</small>
      {children}
    </div>
  ),
  contextMenu: ({ items }) => [
    ...items,
    "separator",
    {
      id: "host-log",
      label: "Host: log",
      onSelect: () => {
        logCount += 1;
        for (const listener of listeners) listener();
      },
    },
  ],
  field: ({ name, field, value, onChange, children }) =>
    field.type === "link" && name === "href" ? (
      <input
        data-testid="host-href"
        aria-label="Host link"
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      />
    ) : (
      children
    ),
  quickActions: ({ children }) => <div data-testid="host-quick">{children}</div>,
};

export const overrides: Overrides = common;

/** The same, but the header throws while it is drawn: the editor shows its own bar and says why. */
export const throwingOverrides: Overrides = {
  ...common,
  header: () => {
    throw new Error("the host's header broke");
  },
};

const bar = (id: string, color: string): Overrides => ({
  header: ({ children }) => (
    <div data-testid={id} style={{ borderBlockStart: `6px solid ${color}` }}>
      {children}
    </div>
  ),
});

/** `?overrides&two`: one for each editor. */
export const overridesA = bar("bar-a", "#16a34a");
export const overridesB = bar("bar-b", "#9333ea");
