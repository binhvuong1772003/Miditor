import styles from "./EmptyPage.module.css";
import { Icon } from "./icons";

export interface EmptyPageProps {
  /** Blocks cannot be added from this screen (the phone), so the button is off and says why. */
  disabled: boolean;
  /** Add the first block. */
  onAdd: () => void;
  /** Open the library of blocks, when it is shut or another panel is open. */
  onOpenBlocks: () => void;
}

/**
 * What a page with no blocks says in its middle, so a new person knows where to begin. It lies over
 * the page, is not part of its data, and goes the moment a block is added. Only the buttons take the
 * pointer: the page under it still takes a press.
 */
export function EmptyPage({ disabled, onAdd, onOpenBlocks }: EmptyPageProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <Icon name="grid" size={28} />
        <h2 className={styles.title}>This page is empty</h2>
        <p className={styles.text}>
          {disabled
            ? "Switch to Desktop to add blocks."
            : "Add a block to start, or pick one from the library on the left."}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} disabled={disabled} onClick={onAdd}>
            Add a box
          </button>
          <button type="button" className={styles.secondary} onClick={onOpenBlocks}>
            Open blocks
          </button>
        </div>
      </div>
    </div>
  );
}
