import { drawsPhoneFlow, type PageMeta, type Theme, type TreeNode } from "@miditor/core";
import { BackgroundFields, type BackgroundPatch } from "./BackgroundFields";
import { ColourPopover } from "./ColourPopover";
import { FontSelect } from "./FontSelect";
import type { FontDef } from "./fonts";
import { useT } from "./i18n/context";
import { PageHeightField } from "./PageHeightField";
import { PageInfoFields, type PageInfoFieldsProps } from "./PageInfoFields";
import fieldStyles from "./PropertiesPanel.module.css";
import { useRenders } from "./perf";
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
  /** Whether the page is shown for a phone: it then has a height of its own. */
  onPhone: boolean;
  /** Every place set for the phone is taken back, so the phone follows the desktop again. */
  onArrangePhone: () => void;
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
  onPhone,
  onArrangePhone,
  uploadImage,
  onPreview,
  onCommit,
  themeActions,
  fonts,
  onPageFont,
}: PageInspectorProps) {
  useRenders("page");
  const t = useT();
  return (
    <div className={fieldStyles.content}>
      <div className={fieldStyles.heading}>
        <h2 className={fieldStyles.title}>{t("page.title")}</h2>
        <p className={fieldStyles.meta}>{t("page.selectHint")}</p>
      </div>
      <Section id="page.info" title={t("pageInfo.title")} help={t("pageInfo.help")}>
        <PageInfoFields meta={meta} onChange={onMeta} uploadImage={uploadImage} />
      </Section>
      <Section id="page.size" title={t("common.size")} help={t("size.help")}>
        <PageHeightField
          stored={onPhone ? page.styles.phoneMinHeight : page.styles.minHeight}
          drawn={pageHeight.drawn}
          floor={pageHeight.floor}
          onChange={onPageHeight}
        />
        {onPhone && !drawsPhoneFlow(page) && (
          <button
            type="button"
            className={fieldStyles.chip}
            title={t("phone.arrangeHint")}
            onClick={() => {
              if (window.confirm(t("phone.arrangeConfirm"))) onArrangePhone();
            }}
          >
            {t("phone.arrange")}
          </button>
        )}
      </Section>
      <Section id="page.background" title={t("background.title")} help={t("background.help")}>
        <div className={fieldStyles.row}>
          <ColourPopover
            label={t("common.colour")}
            hint={t("background.colour.hint")}
            theme={theme}
            stored={page.styles.background}
            noneLabel={t("common.noColour")}
            onPreview={(value) => onPreview({ key: "background", value })}
            onCommit={(value) => onCommit({ key: "background", value })}
          />
        </div>
        <BackgroundFields styles={page.styles} uploadImage={uploadImage} onChange={onCommit} />
      </Section>
      <Section id="page.font" title={t("font.title")} help={t("font.help")}>
        <FontSelect
          label={t("font.title")}
          value={theme?.fonts?.body ?? ""}
          fonts={fonts}
          emptyLabel={t("font.default")}
          onChange={(stack) => onPageFont(stack === "" ? undefined : stack)}
        />
      </Section>
      <ThemePanel theme={theme} bare {...themeActions} />
    </div>
  );
}
