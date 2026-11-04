import {
  type Answer,
  answerKey,
  canCheckSource,
  type ExternalItem,
  type ExternalRef,
  type ExternalSource,
  externalRefs,
  fillItemData,
  findNode,
  judge,
  loadPageItems,
  type PageData,
  type Registry,
  type SourceContext,
  updateValue,
  withExternalValues,
} from "@miditor/core";
import type { EditorStore } from "./create-editor-store";
import { type Env, edit, runner } from "./document";
import { allowed, type Permissions } from "./permissions";
import type { DocumentState } from "./state";

/** What the last check of the page's stored items found out, by source and id. */
export type SourcesState = {
  sourceAnswers: ReadonlyMap<string, Answer>;
};

export const initialSourcesState = (): SourcesState => ({ sourceAnswers: new Map() });

export { answerKey };

/** Whether the editor can check a source: it has a `get` or a `getMany`. */
export const canCheck = canCheckSource;

/**
 * Asks each source the host gave, once, for the ids the page holds, but not for blocks the person may not
 * edit (nothing would be said of them), and gives the answers by source and id. Rejects with an
 * `AbortError` when `signal` aborts.
 */
export function checkPage(
  page: PageData,
  registry: Registry,
  sources: Readonly<Record<string, ExternalSource>> | undefined,
  signal: AbortSignal,
  ctx: SourceContext,
  permissions?: Permissions,
): Promise<ReadonlyMap<string, Answer>> {
  return loadPageItems(page, registry, sources, signal, ctx, (ref) => {
    const owner = findNode(page.root, ref.nodeId);
    return owner !== undefined && allowed(permissions?.canEdit, owner);
  });
}

/**
 * What tells a check that its question is not the one asked before: the `metadata`, as text. Metadata
 * that cannot be written as JSON (a cycle, a BigInt) gives an empty key rather than an error.
 */
export function metadataKey(metadata: unknown): string {
  try {
    return JSON.stringify(metadata) ?? "";
  } catch {
    return "";
  }
}

/** The answers without the one for this id of this source (the person has picked it again since). */
export function withoutAnswer(
  answers: ReadonlyMap<string, Answer>,
  source: string,
  id: string,
): ReadonlyMap<string, Answer> {
  const key = answerKey(source, id);
  if (!answers.has(key)) return answers;
  const next = new Map(answers);
  next.delete(key);
  return next;
}

/** The stored items of the page, by what the last check said of each. */
export type SourceReport = {
  changed: ExternalRef[];
  gone: ExternalRef[];
  failed: ExternalRef[];
};

/**
 * Compares the answers of the last check with the page as it is now, so an edit, an update or an undo
 * keeps the report right and an old answer cannot overwrite a newer edit. Leaves out the items of a
 * source that is not checked (`checked` says which have a `get` or a `getMany`), items nobody was asked
 * about, and blocks the person may not edit.
 */
export function sourceReport(
  page: PageData,
  answers: ReadonlyMap<string, Answer>,
  registry: Registry,
  checked: (source: string) => boolean,
  permissions: Permissions | undefined,
): SourceReport {
  const report: SourceReport = { changed: [], gone: [], failed: [] };
  for (const ref of externalRefs(registry, page)) {
    if (!checked(ref.source)) continue;
    const answer = answers.get(answerKey(ref.source, ref.value.id));
    if (!answer) continue;
    const node = findNode(page.root, ref.nodeId);
    if (!node || !allowed(permissions?.canEdit, node)) continue;
    const verdict = judge(ref.value, answer);
    // A reference stores no data, so there is nothing newer to take into the page.
    if (verdict === "changed") {
      if (ref.store !== "reference") report.changed.push(ref);
    } else if (verdict === "gone") report.gone.push(ref);
    else if (verdict === "failed") report.failed.push(ref);
  }
  return report;
}

/**
 * Takes the newer data of every changed item into the page, as one step of history. The very state when
 * nothing has changed. An item that is gone or could not be checked is left as it is.
 */
export function refreshSources<S extends DocumentState & SourcesState>(
  state: S,
  args: { checked: (source: string) => boolean; now: Date },
  env: Env,
): S {
  const { changed } = sourceReport(
    state.history.present,
    state.sourceAnswers,
    env.registry,
    args.checked,
    env.permissions,
  );
  const changes = changed.flatMap((ref) => {
    const answer = state.sourceAnswers.get(answerKey(ref.source, ref.value.id));
    if (answer?.status !== "found") return [];
    return [
      {
        nodeId: ref.nodeId,
        layer: ref.layer,
        path: ref.path,
        value: updateValue(ref.value, answer.item, args.now),
      },
    ];
  });
  if (changes.length === 0) return state;
  return edit(state, (page) => withExternalValues(page, changes), env);
}

/** The item the last check found for a stored value, if it found one. */
const foundItem = (answers: ReadonlyMap<string, Answer>, ref: ExternalRef) => {
  const answer = answers.get(answerKey(ref.source, ref.value.id));
  return answer?.status === "found" ? answer.item : undefined;
};

/**
 * The page as the canvas draws it: the fields that keep a reference get the data the source gave, which
 * is never stored. The very page when there is nothing to fill.
 */
export const drawnPage = (
  page: PageData,
  registry: Registry,
  answers: ReadonlyMap<string, Answer>,
): PageData =>
  answers.size === 0
    ? page
    : fillItemData(page, registry, (ref) => foundItem(answers, ref), "reference");

/** The answers with this item as the answer for its id, as when the person picked it from a search. */
export function seedAnswer(
  answers: ReadonlyMap<string, Answer>,
  source: string,
  item: ExternalItem,
): ReadonlyMap<string, Answer> {
  const next = new Map(answers);
  next.set(answerKey(source, item.id), { status: "found", item });
  return next;
}

/** The commands on the answers of the last check, which need no more than the store. */
export function answerCommands<S extends SourcesState>(store: EditorStore<S>) {
  return {
    setSourceAnswers: (answers: ReadonlyMap<string, Answer>) => {
      store.setState({ sourceAnswers: answers } as Partial<S>);
    },
    seedSourceAnswer: (source: string, item: ExternalItem) => {
      store.setState({
        sourceAnswers: seedAnswer(store.getState().sourceAnswers, source, item),
      } as Partial<S>);
    },
    forgetSourceAnswer: (source: string, id: string) => {
      const answers = store.getState().sourceAnswers;
      const next = withoutAnswer(answers, source, id);
      if (next !== answers) store.setState({ sourceAnswers: next } as Partial<S>);
    },
  };
}

/** The commands tied to a store. */
export function sourcesCommands<S extends DocumentState & SourcesState>(
  store: EditorStore<S>,
  env: Env,
) {
  const run = runner(store, env);
  return {
    ...answerCommands(store),
    refreshSources: (checked: (source: string) => boolean) =>
      run((state) => refreshSources(state, { checked, now: new Date() }, env)),
  };
}

export type SourcesCommands = ReturnType<typeof sourcesCommands<DocumentState & SourcesState>>;
