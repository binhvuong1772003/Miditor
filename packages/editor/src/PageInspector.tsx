import type { PageMeta, Theme, TreeNode } from "@midito-kitchen/core";
import { BackgroundFields, type BackgroundPatch } from "./BackgroundFields";
import { ColourPopover } from "./ColourPopover";
import { FontSelect } from "./FontSelect";
import type { FontDef } from "./fonts";
import { PageHeightField } from "./PageHeightField";
import { PageInfoFields, type PageInfoFieldsProps } from "./PageInfoFields";
import fieldStyles from "./PropertiesPanel.module.css";
import { Section } from "./Section";
import { ThemePanel, type ThemePanelProps } from "./ThemePanel";
import type { UploadImage } from "./upload-image";

export interface PageInspectorProps {
  /** The page itself: its root node, whose styles are the height and the background of the whole page. */
  page: TreeNode;
  theme: Theme | undefined;
  meta: PageMeta | undefined;
  onMeta: PageInfoFieldsProps["onChange"];
  /** How tall the page is now in px, as drawn, and the lowest edge of what is on it. */
  pageHeight: { drawn: number; floor: number };
  onPageHeight: (height: number | undefined) => void;
  /** The host's way to upload a picture, for the background picture of the page. */
  uploadImage?: UploadImage | undefined;
  /** A colour of the background is being picked: show it, but do not store it yet. */
  onPreview: (patch: { key: "background"; value: string | undefined }) => void;
  /** The background of the page changed: its colour or its picture. */
  onCommit: (patch: BackgroundPatch | { key: "background"; value: string | undefined }) => void;
  themeActions: Pick<ThemePanelProps, "onSetColor" | "onRenameColor" | "onDeleteColor">;
  /** The fonts the host lets people choose. */
  fonts: readonly FontDef[];
  /** The font of the whole page changed, or went back to the default (`undefined`). */
  onPageFont: (stack: string | undefined) => void;
}

/**
 * The page itself, shown on the right when no block is selected, as the properties of a block are
 * when one is: what the page says about itself (title, description, share picture), how tall it is,
 * its background, and the colours and fonts that all its blocks share.
 */
export function PageInspector({
  page,
  theme,
  meta,
  onMeta,
  pageHeight,
  onPageHeight,
  uploadImage,
  onPreview,
  onCommit,
  themeActions,
  fonts,
  onPageFont,
}: PageInspectorProps) {
  return (
    <div className={fieldStyles.content}>
      <div className={fieldStyles.heading}>
        <h2 className={fieldStyles.title}>Page</h2>
        <p className={fieldStyles.meta}>Select a block to edit it.</p>
      </div>
      <Section
        title="Page info"
        help="What the page says about itself in a tab, a search result or a share."
      >
        <PageInfoFields meta={meta} onChange={onMeta} uploadImage={uploadImage} />
      </Section>
      <Section
        title="Size"
        help="How tall the page is. Drag the bottom edge of the page to change it as well."
      >
        <PageHeightField
          stored={page.styles.minHeight}
          drawn={pageHeight.drawn}
          floor={pageHeight.floor}
          onChange={onPageHeight}
        />
      </Section>
      <Section title="Background" help="The background of the whole page.">
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
      <Section
        title="Font"
        help="The font of all the text on the page. A text can be set in another font of its own."
      >
        <FontSelect
          label="Font"
          value={theme?.fonts?.body ?? ""}
          fonts={fonts}
          emptyLabel="Default"
          onChange={(stack) => onPageFont(stack === "" ? undefined : stack)}
        />
      </Section>
      <ThemePanel theme={theme} bare {...themeActions} />
    </div>
  );
}
