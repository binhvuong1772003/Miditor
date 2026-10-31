import type { Theme, TreeNode } from "@midito-kitchen/core";
import styles from "./AssetsPanel.module.css";
import { BackgroundFields, type BackgroundPatch } from "./BackgroundFields";
import { ColourPopover } from "./ColourPopover";
import { Icon } from "./icons";
import fieldStyles from "./PropertiesPanel.module.css";
import { Section } from "./Section";
import type { UploadImage } from "./upload-image";

export interface AssetsPanelProps {
  /** The page itself: its root node, whose styles are the background of the whole page. */
  page: TreeNode;
  /** The theme of the page: its colours can be picked for the background. */
  theme?: Theme | undefined;
  /** Blocks cannot be added from this screen (the phone), so the upload is off. */
  disabled: boolean;
  /** The host can upload a picture: a button adds a picture block from a file. */
  upload?: { busy: boolean; error: string | null; onChoose: () => void } | undefined;
  /** The host's way to upload a picture, for the background picture of the block. */
  uploadImage?: UploadImage | undefined;
  /** A colour of the background is being picked: show it, but do not store it yet. */
  onPreview: (patch: { key: "background"; value: string | undefined }) => void;
  /** The background of the page changed: its colour or its picture. */
  onCommit: (patch: BackgroundPatch | { key: "background"; value: string | undefined }) => void;
}

/**
 * The pictures of the page: a button to upload one as a picture block, and the background of the
 * whole page, a colour (of the theme or one's own) with a picture over it and how it sits.
 */
export function AssetsPanel({
  page,
  theme,
  disabled,
  upload,
  uploadImage,
  onPreview,
  onCommit,
}: AssetsPanelProps) {
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
      <Section title="Page background" help="The background of the whole page.">
        <div className={fieldStyles.row}>
          <ColourPopover
            label="Colour"
            hint="The colour behind the whole page. Clear it for none."
            theme={theme}
            stored={page.styles.background}
            noneLabel="No colour"
            onPreview={(value) => onPreview({ key: "background", value })}
            onCommit={(value) => onCommit({ key: "background", value })}
          />
        </div>
        <BackgroundFields styles={page.styles} uploadImage={uploadImage} onChange={onCommit} />
      </Section>
    </div>
  );
}
