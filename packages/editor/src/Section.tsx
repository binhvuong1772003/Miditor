import { type ReactNode, useId, useState } from "react";
import { Icon } from "./icons";
import styles from "./PropertiesPanel.module.css";

export interface SectionProps {
  /** The name of the section, which is also what remembers whether it is open. */
  title: string;
  /** What remembers whether it is open, when the title can change (a translation): stays the same in every language. Without it, the title. */
  id?: string;
  /** One sentence about the section, shown when its title is pointed at. */
  help?: string | undefined;
  /** Small controls at the right end of the title: a choice, a button to add something. */
  actions?: ReactNode;
  /** Shut at first. Without it the section is open. */
  closed?: boolean;
  children: ReactNode;
}

/** Which sections a person shut, kept for as long as the editor is open, so a new selection keeps them. */
const remembered = new Map<string, boolean>();

/**
 * One part of the panel, set apart from the next by a rule: a title that opens and shuts it, small
 * controls beside the title, and the fields under it. It is how the panel is divided, the way a
 * design tool divides its own.
 */
export function Section({ title, id, help, actions, closed = false, children }: SectionProps) {
  const memory = id ?? title;
  const [open, setOpen] = useState(() => remembered.get(memory) ?? !closed);
  const bodyId = useId();
  const toggle = () => {
    remembered.set(memory, !open);
    setOpen(!open);
  };
  return (
    <section className={styles.card} aria-label={title}>
      <div className={styles.head}>
        <h3 className={styles.name}>
          <button
            type="button"
            className={styles.fold}
            aria-expanded={open}
            aria-controls={bodyId}
            title={help}
            onClick={toggle}
          >
            <Icon name={open ? "chevronDown" : "chevronRight"} size={14} />
            {title}
          </button>
        </h3>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {open && (
        <div id={bodyId} className={styles.body}>
          {children}
        </div>
      )}
    </section>
  );
}
