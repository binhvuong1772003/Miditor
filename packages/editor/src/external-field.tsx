import { type JsonValue, MAX_EXTERNAL_DATA } from "@miditor/core";
import { useEffect, useId, useState } from "react";
import { useT } from "./i18n/context";
import styles from "./PropertiesPanel.module.css";

/**
 * One thing the host's list holds. `data` is what a block shows of it (a title, a price, a picture): it is
 * stored in the page with the item, as plain JSON of at most 8000 bytes. `hint` and `image` are for the list
 * the person picks from and are not stored. @experimental
 */
export interface ExternalItem {
  id: string;
  label: string;
  data?: JsonValue;
  hint?: string;
  image?: string;
}

const sameJson = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => sameJson((a as never)[key], (b as never)[key]))
  );
};

/** Whether `data` is plain JSON that fits the page: what survives a round trip, in at most 8000 bytes. */
function fitsThePage(data: unknown): boolean {
  try {
    const text = JSON.stringify(data);
    return (
      text !== undefined &&
      new TextEncoder().encode(text).length <= MAX_EXTERNAL_DATA &&
      sameJson(JSON.parse(text), data)
    );
  } catch {
    return false;
  }
}

/**
 * What is stored for a picked item: `{ id, label }`, and with the item's data `{ id, label, data, at }`.
 * `null` when the data is not plain JSON or is too large to keep in the page.
 */
export function pickValue(item: ExternalItem, now: Date): JsonValue | null {
  if (item.data === undefined) return { id: item.id, label: item.label };
  if (!fitsThePage(item.data)) return null;
  return { id: item.id, label: item.label, data: item.data, at: now.toISOString() };
}

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

/** What the editor tells a source about the page it is asked for: the `metadata` of the `<Editor>`. @experimental */
export interface SourceContext {
  metadata: JsonValue | undefined;
}

/**
 * A list the host keeps and the editor searches (`config.sources`, by the `source` of an `external` field):
 * products, articles, pages. `search` is asked for what the person typed (an empty text at first) and may
 * be asked again before it answers, so it should stop when `signal` is aborted. `ctx` carries the
 * `metadata` of the editor (a language, a shop, who is editing). @experimental
 */
export interface ExternalSource {
  search(query: string, signal: AbortSignal, ctx: SourceContext): Promise<readonly ExternalItem[]>;
}

/** A source as the field asks it: the editor has already put its `metadata` in. */
export interface AskedSource {
  search(query: string, signal: AbortSignal): Promise<readonly ExternalItem[]>;
}

/** The sources, each asking the host's `search` with the editor's `metadata` as `ctx`. */
export function withMetadata(
  sources: Readonly<Record<string, ExternalSource>> | undefined,
  metadata: JsonValue | undefined,
): Readonly<Record<string, AskedSource>> | undefined {
  if (!sources) return undefined;
  const out: Record<string, AskedSource> = {};
  for (const [name, source] of Object.entries(sources)) {
    out[name] = { search: (query, signal) => source.search(query, signal, { metadata }) };
  }
  return out;
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
