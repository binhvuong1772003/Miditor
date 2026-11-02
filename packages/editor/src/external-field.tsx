import type { JsonValue } from "@miditor/core";
import { useEffect, useId, useState } from "react";
import { useT } from "./i18n/context";
import styles from "./PropertiesPanel.module.css";

/** One thing the host's list holds. @experimental */
export interface ExternalItem {
  id: string;
  label: string;
}

/**
 * A list the host keeps and the editor searches (`config.sources`, by the `source` of an `external` field):
 * products, articles, pages. `search` is asked for what the person typed (an empty text at first) and may
 * be asked again before it answers, so it should stop when `signal` is aborted. @experimental
 */
export interface ExternalSource {
  search(query: string, signal: AbortSignal): Promise<readonly ExternalItem[]>;
}

const DELAY_MS = 250;
const told = new Set<string>();

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; items: readonly ExternalItem[] };

const chosen = (value: JsonValue | undefined): ExternalItem | null =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  typeof value.id === "string" &&
  typeof value.label === "string"
    ? { id: value.id, label: value.label }
    : null;

/** The input of an `external` field: the chosen item, and a small panel to search the host's list. */
export function ExternalField({
  label,
  source,
  value,
  onChange,
  sources,
}: {
  label: string;
  source: string;
  value: JsonValue | undefined;
  onChange: (value: JsonValue) => void;
  sources: Readonly<Record<string, ExternalSource>> | undefined;
}) {
  const t = useT();
  const id = useId();
  const search = sources && Object.hasOwn(sources, source) ? sources[source] : undefined;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ status: "loading" });
  const current = chosen(value);

  useEffect(() => {
    if (search || told.has(source)) return;
    told.add(source);
    console.warn(`[miditor] no source "${source}" for an external field (config.sources)`);
  }, [search, source]);

  // Ask the host for the list while the panel is open, a moment after the last key, and drop the answer
  // of an earlier question.
  useEffect(() => {
    if (!open || !search) return;
    const controller = new AbortController();
    setState({ status: "loading" });
    const timer = setTimeout(
      () => {
        search.search(query, controller.signal).then(
          (items) => {
            if (!controller.signal.aborted) setState({ status: "done", items });
          },
          () => {
            if (!controller.signal.aborted) setState({ status: "error" });
          },
        );
      },
      query === "" ? 0 : DELAY_MS,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, search]);

  if (!search) {
    return (
      <p role="note" className={styles.note}>
        {t("field.noSource", { source })}
      </p>
    );
  }
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset would bring its own border and spacing
    <div role="group" aria-label={label} className={styles.stack}>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.chip}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen(!open)}
        >
          {label}: {current ? current.label : t("field.choose")}
        </button>
        {current && (
          <button type="button" className={styles.chip} onClick={() => onChange(null)}>
            {t("field.clear", { label })}
          </button>
        )}
      </div>
      {open && (
        // biome-ignore lint/a11y/noStaticElementInteractions: Esc is heard from the controls inside, to shut the panel
        <div
          id={`${id}-panel`}
          className={styles.stack}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setOpen(false);
            }
          }}
        >
          <input
            type="search"
            className={styles.input}
            aria-label={t("field.search", { label })}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {state.status === "loading" && <p role="status">{t("field.loading")}</p>}
          {state.status === "error" && <p role="alert">{t("field.loadError")}</p>}
          {state.status === "done" && state.items.length === 0 && (
            <p role="status">{t("field.nothing")}</p>
          )}
          {state.status === "done" && state.items.length > 0 && (
            <ul aria-label={label} style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {state.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={styles.chip}
                    aria-pressed={current?.id === item.id}
                    onClick={() => {
                      onChange({ id: item.id, label: item.label });
                      setOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
