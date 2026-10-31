import { libraryOf, type Registry } from "@midito-kitchen/core";
import { useId, useState } from "react";
import styles from "./BlocksPanel.module.css";
import { Icon, type IconName, isIconName } from "./icons";

export interface BlocksPanelProps {
  registry: Registry;
  /** Blocks cannot be added from this screen (the phone), so the cards are off. */
  disabled: boolean;
  /** A kind was chosen: add a block of it. */
  onAdd: (type: string) => void;
}

/** The icon of a kind: the one it names when the editor has it, or a plain box. */
const iconFor = (name: string | undefined): IconName => (name && isIconName(name) ? name : "box");

/**
 * The library of blocks: a search box and the kinds of the registry in groups, each a card that adds
 * a block when it is pressed. Which kinds there are, their groups and icons come from the registry.
 */
export function BlocksPanel({ registry, disabled, onAdd }: BlocksPanelProps) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const groups = libraryOf(registry, query);
  const nothing = groups.length === 0;
  const why = disabled ? "Switch to Desktop to add blocks" : undefined;

  return (
    <div className={styles.panel}>
      <label className={styles.search} htmlFor={searchId}>
        <Icon name="search" />
        <input
          id={searchId}
          type="search"
          placeholder="Search blocks"
          aria-label="Search blocks"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {groups.map((group) => (
        <section key={group.category} className={styles.group} aria-label={group.category}>
          <h3 className={styles.heading}>{group.category}</h3>
          <div className={styles.grid}>
            {group.items.map(({ type, def }) => (
              <button
                key={type}
                type="button"
                className={styles.card}
                disabled={disabled}
                title={why ?? def.description ?? `Add ${def.label}`}
                onClick={() => onAdd(type)}
              >
                <Icon name={iconFor(def.icon)} size={20} />
                {def.label}
              </button>
            ))}
          </div>
        </section>
      ))}
      {nothing && <p className={styles.empty}>No block matches “{query.trim()}”.</p>}
    </div>
  );
}
