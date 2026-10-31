import type { TreeNode } from "@midito-kitchen/core";
import styles from "./AssetsPanel.module.css";
import { BackgroundFields, type BackgroundPatch } from "./BackgroundFields";
import { Icon } from "./icons";
import fieldStyles from "./PropertiesPanel.module.css";
import { Section } from "./Section";
import type { UploadImage } from "./upload-image";

export interface AssetsPanelProps {
  /** The selected block, or `undefined` when nothing is selected. */
  node: TreeNode | undefined;
  /** Blocks cannot be added from this screen (the phone), so the upload is off. */
  disabled: boolean;
  /** The host can upload a picture: a button adds a picture block from a file. */
  upload?: { busy: boolean; error: string | null; onChoose: () => void } | undefined;
  /** The host's way to upload a picture, for the background picture of the block. */
  uploadImage?: UploadImage | undefined;
  /** The background picture of the selected block changed. */
  onChange: (patch: BackgroundPatch) => void;
}

/**
 * The pictures of the page: a button to upload one as a picture block, and the picture behind the
 * selected block with how it sits.
 */
export function AssetsPanel({ node, disabled, upload, uploadImage, onChange }: AssetsPanelProps) {
  return (
    <div>
      {upload && (
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
      )}
      <Section title="Background image" help="The picture behind the selected block.">
        {node ? (
          <BackgroundFields
            // A new set of fields for each block, so an address typed for one is not applied to another.
            key={node.id}
            styles={node.styles}
            uploadImage={uploadImage}
            onChange={onChange}
          />
        ) : (
          <p className={styles.hint}>Select a block to set its background image.</p>
        )}
      </Section>
    </div>
  );
}
