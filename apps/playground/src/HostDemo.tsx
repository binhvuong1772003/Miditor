import type { ReactNode } from "react";

/**
 * A stand-in for the system that embeds the editor: its own sidebar and navbar, with the editor in
 * the room that is left. `?host` shows it, to see how the editor sits inside another product.
 */
export function HostDemo({ children }: { children: ReactNode }) {
  return (
    <div className="host">
      <aside className="host-side" aria-label="Host navigation">
        <strong className="host-brand">Acme</strong>
        <a href="?host">Pages</a>
        <a href="?host">Campaigns</a>
        <a href="?host">Media</a>
        <a href="?host">Settings</a>
      </aside>
      <div className="host-main">
        <header className="host-nav">
          <a href="?host">← Pages</a>
          <span>Summer campaign</span>
          <span className="host-user">Lan N.</span>
        </header>
        <div className="host-work">{children}</div>
      </div>
    </div>
  );
}
