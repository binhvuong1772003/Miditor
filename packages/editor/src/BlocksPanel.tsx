import { libraryOf, type Registry, searchRegistry } from "@midito-kitchen/core";
import { useId, useState } from "react";
import styles from "./BlocksPanel.module.css";
import { Icon, type IconName, isIconName } from "./icons";

export interface BlocksPanelProps {
  registry: Registry;
  /** Blocks cannot be added from this screen (the phone), so the cards are off. */
  disabled: boolean;
  /** A kind was chosen: add a block of it. */
  onAdd: (type: string) => void;
  /** The host can upload a picture: a card adds a picture block from a file. */
  upload?: { busy: boolean; error: string | null; onChoose: () => void } | undefined;
}

/** What `upload` is found by when someone searches, as if it were a kind of the registry. */
const UPLOAD_ENTRY: Registry = {
  upload: {
    label: "Upload image",
    keywords: ["picture", "photo"],
    canContain: false,
    defaultProps: {},
    fields: {},
  },
};

/** The icon of a kind: the one it names when the editor has it, or a plain box. */
const iconFor = (name: string | undefined): IconName => (name && isIconName(name) ? name : "box");

/**
 * The library of blocks: a search box and the kinds of the registry in groups, each a card that adds
 * a block when it is pressed. Which kinds there are, their groups and icons come from the registry.
 */
export function BlocksPanel({ registry, disabled, onAdd, upload }: BlocksPanelProps) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const groups = libraryOf(registry, query);
  const showUpload = upload !== undefined && searchRegistry(UPLOAD_ENTRY, query).length > 0;
  const nothing = groups.length === 0 && !showUpload;
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
      {groups.map((group, index) => (
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
            {index === 0 && showUpload && upload && (
              <UploadCard disabled={disabled} upload={upload} why={why} />
            )}
          </div>
        </section>
      ))}
      {groups.length === 0 && showUpload && upload && (
        <div className={styles.grid}>
          <UploadCard disabled={disabled} upload={upload} why={why} />
        </div>
      )}
      {upload?.error && (
        <p className={styles.error} role="alert">
          {upload.error}
        </p>
      )}
      {nothing && <p className={styles.empty}>No block matches “{query.trim()}”.</p>}
    </div>
  );
}

function UploadCard({
  disabled,
  upload,
  why,
}: {
  disabled: boolean;
  upload: NonNullable<BlocksPanelProps["upload"]>;
  why: string | undefined;
}) {
  return (
    <button
      type="button"
      className={styles.card}
      disabled={disabled || upload.busy}
      title={why ?? "Upload a picture and add it"}
      onClick={upload.onChoose}
    >
      <Icon name="img" size={20} />
      {upload.busy ? "Uploading…" : "Upload image"}
    </button>
  );
}
