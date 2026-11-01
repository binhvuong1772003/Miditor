import styles from "./ImagesPanel.module.css";
import { Icon } from "./icons";
import fieldStyles from "./PropertiesPanel.module.css";
import { Section } from "./Section";

export interface ImagesPanelProps {
  /** Blocks cannot be added from this screen (the phone), so the upload is off. */
  disabled: boolean;
  /** The host can upload a picture: a button adds a picture block from a file. */
  upload?: { busy: boolean; error: string | null; onChoose: () => void } | undefined;
}

/**
 * The pictures to add to the page: a button to upload one as a picture block. The page's own
 * settings (its title, height, background, colours and fonts) are in the panel on the right, which
 * shows them whenever no block is selected.
 */
export function ImagesPanel({ disabled, upload }: ImagesPanelProps) {
  if (!upload) {
    return (
      <p className={fieldStyles.hint}>
        Pictures can be added once the host gives the editor a way to upload them.
      </p>
    );
  }
  return (
    <div>
      <Section title="Upload" help="Upload a picture and add it to the page.">
        <button
          type="button"
          className={styles.upload}
          disabled={disabled || upload.busy}
          title={disabled ? "Switch to Desktop to add pictures" : undefined}
          onClick={upload.onChoose}
        >
          <Icon name="img" size={16} />
          {upload.busy ? "Uploading…" : "Upload image"}
        </button>
        {upload.error && (
          <p className={fieldStyles.error} role="alert">
            {upload.error}
          </p>
        )}
      </Section>
    </div>
  );
}
