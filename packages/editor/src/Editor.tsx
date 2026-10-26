import { cssFor, type FreeBox } from "@midito-kitchen/core";
import styles from "./Editor.module.css";

export interface EditorProps {
  /** Extra class on the root element, for example to size the editor inside the host page. */
  className?: string;
}

// Temporary: one hard-coded node so the page shows something. Replaced by real data at the
// data-model step.
const SAMPLE: FreeBox = {
  x: { anchor: "end", offset: 20 },
  y: { anchor: "start", offset: 40 },
  w: { kind: "px", v: 160 },
  h: { kind: "px", v: 96 },
  rotation: 0,
};

/** The editor shell: toolbar, left panel, canvas with one sample block, and right panel. */
export function Editor({ className }: EditorProps) {
  const rootClass = className ? `${styles.root} ${className}` : styles.root;

  return (
    <div className={rootClass} data-midito-editor="">
      <header className={styles.toolbar} />
      <aside className={`${styles.panel} ${styles.start}`} aria-label="Layers" />
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable with the keyboard */}
      <section className={styles.workspace} aria-label="Canvas" tabIndex={0}>
        <div className={styles.page}>
          <div className={styles.sample} style={cssFor(SAMPLE)} data-midito-node="" />
        </div>
      </section>
      <aside className={`${styles.panel} ${styles.end}`} aria-label="Properties" />
    </div>
  );
}
