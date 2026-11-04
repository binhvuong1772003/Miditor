import type { ReactNode } from "react";
import styles from "./Editor.module.css";
import { useHidden } from "./hide";
import { useT } from "./i18n/context";
import { Icon } from "./icons";
import { OverrideSlot } from "./overrides";
import { SourcesBanner } from "./SourcesBanner";
import { type SaveStatus, STATUS_KEY } from "./save-status";
import { canRun, type Run, useEditorState } from "./store";
import { zoomText } from "./zoom";

export interface ToolbarProps {
  /** What stands before the buttons; `undefined` is the editor's own mark. */
  logo: ReactNode;
  headerStart: ReactNode;
  headerActions: ReactNode;
  /** What the header says about the page being saved, if anything. */
  status: Exclude<SaveStatus, "idle"> | undefined;
  /** A save is under way, so the button waits. */
  saving: boolean;
  /** Without a save, the host stores the page itself and there is no Save button. */
  onSave: (() => void) | undefined;
  /** Zoom to fit the page in the room there is. */
  onFit: () => void;
  /** How many blocks hold items that have newer data in the host's sources. */
  newer?: number;
  /** Takes that newer data into the page. */
  onUpdateSources?: () => void;
  run: Run;
}

/** The bar over the editor: undo and redo, the frame, the zoom and save. */
export function Toolbar({
  logo,
  headerStart,
  headerActions,
  status,
  saving,
  onSave,
  onFit,
  newer = 0,
  onUpdateSources,
  run,
}: ToolbarProps) {
  const t = useT();
  const frame = useEditorState((state) => state.frame);
  const zoom = useEditorState((state) => state.zoom);
  const selectedId = useEditorState((state) => state.selectedId);
  const picked = useEditorState((state) => state.picked);
  const history = useEditorState((state) => state.history);
  const hide = {
    undo: useHidden("header.undo"),
    redo: useHidden("header.redo"),
    frame: useHidden("header.frame"),
    zoom: useHidden("header.zoom"),
    save: useHidden("header.save"),
    status: useHidden("header.status"),
  };
  const canState = { frame, selectedId, picked, history, zoom };
  return (
    <OverrideSlot name="header" props={{}}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarStart}>
          {logo === undefined ? (
            <span className={styles.logo} aria-hidden="true">
              M
            </span>
          ) : (
            logo
          )}
          {headerStart}
          {!hide.undo && (
            <button
              type="button"
              className={`${styles.button} ${styles.ghost} ${styles.icon}`}
              aria-label={t("header.undo")}
              disabled={!canRun(canState, "history.undo")}
              title={t("header.undoTitle")}
              onClick={() => run("history.undo")}
            >
              <Icon name="undo" size={18} />
            </button>
          )}
          {!hide.redo && (
            <button
              type="button"
              className={`${styles.button} ${styles.ghost} ${styles.icon}`}
              aria-label={t("header.redo")}
              disabled={!canRun(canState, "history.redo")}
              title={t("header.redoTitle")}
              onClick={() => run("history.redo")}
            >
              <Icon name="redo" size={18} />
            </button>
          )}
          {status && !hide.status && (
            <span className={styles.status} role="status" data-state={status}>
              {t(STATUS_KEY[status])}
            </span>
          )}
          <SourcesBanner count={newer} onUpdate={() => onUpdateSources?.()} />
        </div>
        {hide.frame ? (
          <div />
        ) : (
          // biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing
          <div className={styles.segmented} role="group" aria-label={t("header.frame")}>
            <button
              type="button"
              className={styles.segment}
              aria-pressed={frame === "desktop"}
              onClick={() => run("view.frame", "desktop")}
            >
              <Icon name="desk" />
              {t("header.desktop")}
            </button>
            <button
              type="button"
              className={styles.segment}
              aria-pressed={frame === "phone"}
              onClick={() => run("view.frame", "phone")}
            >
              <Icon name="phone" />
              {t("header.phone")}
            </button>
          </div>
        )}
        <div className={styles.toolbarEnd}>
          {!hide.zoom && (
            // biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing
            <div className={styles.zoomBar} role="group" aria-label={t("header.zoom")}>
              <button
                type="button"
                className={`${styles.button} ${styles.ghost} ${styles.icon}`}
                aria-label={t("header.zoomOut")}
                title={t("header.zoomOutTitle")}
                disabled={!canRun(canState, "view.zoom", "out")}
                onClick={() => run("view.zoom", "out")}
              >
                −
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.ghost} ${styles.zoomValue}`}
                title={t("header.zoomResetTitle")}
                onClick={() => run("view.zoom", "reset")}
              >
                {zoomText(zoom)}
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.ghost} ${styles.icon}`}
                aria-label={t("header.zoomIn")}
                title={t("header.zoomInTitle")}
                disabled={!canRun(canState, "view.zoom", "in")}
                onClick={() => run("view.zoom", "in")}
              >
                +
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.ghost}`}
                title={t("header.fitTitle")}
                onClick={onFit}
              >
                {t("header.fit")}
              </button>
            </div>
          )}
          <OverrideSlot name="headerActions" props={{}}>
            {headerActions}
            {onSave && !hide.save && (
              <button
                type="button"
                className={`${styles.button} ${styles.primary}`}
                disabled={saving}
                onClick={onSave}
              >
                {t("header.save")}
              </button>
            )}
          </OverrideSlot>
        </div>
      </header>
    </OverrideSlot>
  );
}
