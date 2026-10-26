import styles from "./Editor.module.css";

export interface EditorProps {
  /** Extra class on the root element, for example to size the editor inside the host page. */
  className?: string;
}

/** The empty editor shell: toolbar, left panel, canvas and right panel. Nothing to edit yet. */
export function Editor({ className }: EditorProps) {
  const rootClass = className ? `${styles.root} ${className}` : styles.root;

  return (
    <div className={rootClass} data-midito-editor="">
      <header className={styles.toolbar} />
      <aside className={`${styles.panel} ${styles.start}`} aria-label="Layers" />
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable with the keyboard */}
      <section className={styles.workspace} aria-label="Canvas" tabIndex={0}>
        <div className={styles.page} />
      </section>
      <aside className={`${styles.panel} ${styles.end}`} aria-label="Properties" />
    </div>
  );
}
