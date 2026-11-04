import {
  type Answer,
  type ExternalItem,
  type ExternalSource,
  type JsonValue,
  judge,
  pickValue,
} from "@miditor/core";
import { useEffect, useId, useState } from "react";
import { useT } from "./i18n/context";
import styles from "./PropertiesPanel.module.css";
import { answerKey, useEditorState } from "./store";

export type { ExternalItem, ExternalSource, SourceContext } from "@miditor/core";

/** One line of the list: the label, with the picture and the hint of the item when it has them. */
export function ItemRow({ item }: { item: ExternalItem }) {
  return (
    <>
      {item.image && <img src={item.image} alt="" width={24} height={24} />}
      <span>{item.label}</span>
      {item.hint && <small>{item.hint}</small>}
    </>
  );
}

/** A source as the field asks it: the editor has already put its `metadata` in. */
export interface AskedSource {
  search(query: string, signal: AbortSignal): Promise<readonly ExternalItem[]>;
}

/**
 * The sources, each asking the host's `search` with the editor's `metadata` as `ctx`. `read` gives the
 * metadata when a search starts, and `cache` keeps one wrapper for each source of the host, so a host that
 * builds its `config` again (or its metadata) does not hand the panel a new source and restart its search.
 */
export function withMetadata(
  sources: Readonly<Record<string, ExternalSource>> | undefined,
  read: () => JsonValue | undefined,
  cache: WeakMap<ExternalSource, AskedSource> = new WeakMap(),
): Readonly<Record<string, AskedSource>> | undefined {
  if (!sources) return undefined;
  const out: Record<string, AskedSource> = {};
  for (const [name, source] of Object.entries(sources)) {
    let asked = cache.get(source);
    if (!asked) {
      asked = { search: (query, signal) => source.search(query, signal, { metadata: read() }) };
      cache.set(source, asked);
    }
    out[name] = asked;
  }
  return out;
}

const DELAY_MS = 250;
const told = new Set<string>();

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; items: readonly ExternalItem[] };

/**
 * What the last check says about the item that is stored, when it is something to tell: the source no
 * longer has it (the block keeps what it had), or it could not be checked.
 */
export function ExternalNote({
  value,
  answer,
}: {
  value: { id: string; label: string; data?: JsonValue };
  answer: Answer | undefined;
}) {
  const t = useT();
  if (!answer) return null;
  const verdict = judge(value, answer);
  if (verdict !== "gone" && verdict !== "failed") return null;
  return (
    <p role="note" className={styles.note}>
      {t(verdict === "gone" ? "field.gone" : "field.unchecked")}
    </p>
  );
}

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
  sources: Readonly<Record<string, AskedSource>> | undefined;
}) {
  const t = useT();
  const id = useId();
  const search = sources && Object.hasOwn(sources, source) ? sources[source] : undefined;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ status: "loading" });
  const [tooBig, setTooBig] = useState<string | null>(null);
  const current = chosen(value);
  const answer = useEditorState((state) =>
    current ? state.sourceAnswers.get(answerKey(source, current.id)) : undefined,
  );

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
      {current && <ExternalNote value={current} answer={answer} />}
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
          {tooBig !== null && <p role="alert">{t("field.tooBig", { label: tooBig })}</p>}
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
                      const value = pickValue(item, new Date());
                      if (value === null) {
                        setTooBig(item.label);
                        return;
                      }
                      setTooBig(null);
                      onChange(value);
                      setOpen(false);
                    }}
                  >
                    <ItemRow item={item} />
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
