import styles from "./Editor.module.css";
import { useT } from "./i18n/context";

/**
 * Says that stored items of the page have newer data in the host's sources, and offers to take it into
 * the page. Nothing changes until Update is pressed. Draws nothing when there is nothing newer.
 */
export function SourcesBanner({ count, onUpdate }: { count: number; onUpdate: () => void }) {
  const t = useT();
  if (count === 0) return null;
  return (
    <span className={styles.sources} role="status">
      {count === 1 ? t("sources.newerOne") : t("sources.newerMany", { count })}
      <button type="button" className={styles.sourcesButton} onClick={onUpdate}>
        {t("sources.update")}
      </button>
    </span>
  );
}
