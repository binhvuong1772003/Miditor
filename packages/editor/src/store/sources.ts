import {
  type Answer,
  type ExternalRef,
  type ExternalSource,
  externalRefs,
  findNode,
  judge,
  loadItems,
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

/** The key of one id of one source in `sourceAnswers`. */
export const answerKey = (source: string, id: string) => `${source}\u0000${id}`;

/** Whether the editor can check a source: it has a `get` or a `getMany`. */
export const canCheck = (source: ExternalSource | undefined): boolean =>
  source !== undefined && (source.get !== undefined || source.getMany !== undefined);

/**
 * Asks each source the host gave, once, for the ids the page holds (equal ids once, see `loadItems`), and
 * gives the answers by source and id. A source with no `get` or `getMany` is left out. Rejects with an
 * `AbortError` when `signal` aborts.
 */
export async function checkPage(
  page: PageData,
  registry: Registry,
  sources: Readonly<Record<string, ExternalSource>> | undefined,
  signal: AbortSignal,
  ctx: SourceContext,
): Promise<ReadonlyMap<string, Answer>> {
  const wanted = new Map<string, string[]>();
  for (const ref of externalRefs(registry, page)) {
    const source = sources && Object.hasOwn(sources, ref.source) ? sources[ref.source] : undefined;
    if (!canCheck(source)) continue;
    const ids = wanted.get(ref.source) ?? [];
    ids.push(ref.value.id);
    wanted.set(ref.source, ids);
  }
  const answers = new Map<string, Answer>();
  await Promise.all(
    [...wanted].map(async ([name, ids]) => {
      const loaded = await loadItems(
        (sources as Record<string, ExternalSource>)[name] as ExternalSource,
        ids,
        signal,
        ctx,
      );
      for (const [id, answer] of loaded) answers.set(answerKey(name, id), answer);
    }),
  );
  return answers;
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
    if (verdict === "changed") report.changed.push(ref);
    else if (verdict === "gone") report.gone.push(ref);
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
        path: ref.path,
        value: updateValue(ref.value, answer.item, args.now),
      },
    ];
  });
  if (changes.length === 0) return state;
  return edit(state, (page) => withExternalValues(page, changes), env);
}

/** The commands tied to a store. */
export function sourcesCommands<S extends DocumentState & SourcesState>(
  store: EditorStore<S>,
  env: Env,
) {
  const run = runner(store, env);
  return {
    setSourceAnswers: (answers: ReadonlyMap<string, Answer>) => {
      store.setState({ sourceAnswers: answers } as Partial<S>);
    },
    refreshSources: (checked: (source: string) => boolean) =>
      run((state) => refreshSources(state, { checked, now: new Date() }, env)),
  };
}

export type SourcesCommands = ReturnType<typeof sourcesCommands<DocumentState & SourcesState>>;
