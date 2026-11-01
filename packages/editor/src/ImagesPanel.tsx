import { type CSSProperties, useState } from "react";
import styles from "./ImagesPanel.module.css";
import { useT } from "./i18n/context";
import { Icon } from "./icons";
import { foldersOf, type LibraryImage, searchImages } from "./images";
import fieldStyles from "./PropertiesPanel.module.css";
import { Section } from "./Section";

export interface ImagesPanelProps {
  /** Blocks cannot be added from this screen (the phone), so adding a picture is off. */
  disabled: boolean;
  /** The host can upload a picture: a button adds a picture block from a file. */
  upload?: { busy: boolean; error: string | null; onChoose: () => void } | undefined;
  /** The pictures of the host's library. Pressing one adds it to the page. */
  images: readonly LibraryImage[];
  onAdd: (image: LibraryImage) => void;
}

/**
 * The pictures to add to the page: a search over the host's library, a button to upload one, and the
 * pictures themselves, as they are shaped, in a list or grouped by folder. The page's own settings
 * (its title, height, background, colours and fonts) are in the panel on the right, which shows them
 * whenever no block is selected.
 */
export function ImagesPanel({ disabled, upload, images, onAdd }: ImagesPanelProps) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"images" | "folders">("images");
  const [folder, setFolder] = useState<string | null>(null);
  // The shape of a picture the host gave no size for, found as it loads.
  const [found, setFound] = useState<Readonly<Record<string, number>>>({});
  const folders = foldersOf(images);

  if (!upload && images.length === 0) {
    return <p className={fieldStyles.hint}>{t("images.none")}</p>;
  }

  const searching = query.trim() !== "";
  const inFolders = !searching && tab === "folders" && folders.length > 0;
  const shown = searching
    ? searchImages(images, query)
    : folder !== null
      ? images.filter((image) => image.folder === folder)
      : images;
  const ratioOf = (image: LibraryImage) =>
    image.width && image.height ? image.width / image.height : (found[image.url] ?? 1);

  return (
    <div className={styles.panel}>
      {images.length > 0 && (
        <label className={styles.search}>
          <Icon name="search" size={16} />
          <input
            type="search"
            aria-label={t("images.search")}
            placeholder={t("images.search")}
            value={query}
            spellCheck={false}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      )}
      {upload && (
        <>
          <button
            type="button"
            className={styles.upload}
            disabled={disabled || upload.busy}
            title={disabled ? t("images.disabled") : undefined}
            onClick={upload.onChoose}
          >
            <Icon name="img" size={16} />
            {upload.busy ? t("images.uploading") : t("images.upload")}
          </button>
          {upload.error && (
            <p className={fieldStyles.error} role="alert">
              {upload.error}
            </p>
          )}
        </>
      )}
      {images.length > 0 && folders.length > 0 && !searching && (
        <div className={styles.tabs} role="tablist" aria-label={t("images.tabs")}>
          {(["images", "folders"] as const).map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              className={styles.tab}
              onClick={() => {
                setTab(name);
                setFolder(null);
              }}
            >
              {name === "images" ? t("rail.images") : t("images.tabFolders")}
            </button>
          ))}
        </div>
      )}
      {inFolders && folder === null ? (
        <ul className={styles.folders}>
          {folders.map((entry) => (
            <li key={entry.name}>
              <button type="button" className={styles.folder} onClick={() => setFolder(entry.name)}>
                <img src={entry.cover.thumb ?? entry.cover.url} alt="" loading="lazy" />
                <span className={styles.folderName}>{entry.name}</span>
                <span className={styles.count}>{entry.count}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Section
          id="images.list"
          title={folder ?? (searching ? t("images.results") : t("images.pictures"))}
          actions={undefined}
        >
          {folder !== null && !searching && (
            <button
              type="button"
              className={styles.back}
              onClick={() => {
                setFolder(null);
                setTab("folders");
              }}
            >
              {t("images.back")}
            </button>
          )}
          {shown.length === 0 ? (
            <p className={fieldStyles.hint}>
              {searching ? t("images.noMatch") : t("images.empty")}
            </p>
          ) : (
            <ul className={styles.grid}>
              {shown.map((image) => {
                const ratio = ratioOf(image);
                return (
                  <li
                    key={image.url}
                    className={styles.cell}
                    style={
                      {
                        "--ratio": ratio,
                        flexGrow: ratio * 100,
                        flexBasis: `${ratio * 80}px`,
                      } as CSSProperties
                    }
                  >
                    <button
                      type="button"
                      className={styles.picture}
                      disabled={disabled}
                      title={
                        disabled ? t("images.disabled") : (image.name ?? t("images.addToPage"))
                      }
                      aria-label={
                        image.name
                          ? t("images.addNamed", { name: image.name })
                          : t("images.addThis")
                      }
                      onClick={() => onAdd(image)}
                    >
                      <img
                        src={image.thumb ?? image.url}
                        alt=""
                        loading="lazy"
                        onLoad={(event) => {
                          const { naturalWidth: w, naturalHeight: h } = event.currentTarget;
                          if (!(image.width && image.height) && w > 0 && h > 0) {
                            setFound((prev) => ({ ...prev, [image.url]: w / h }));
                          }
                        }}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
}
