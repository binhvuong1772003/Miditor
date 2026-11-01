import { en, type MessageKey, type Messages } from "./en";

/** Values for the places (`{name}`) of a sentence. */
export type Params = Readonly<Record<string, string | number>>;

/** How the host speaks to the editor about language. */
export interface I18n {
  /** The language, as a BCP 47 tag (`vi`, `en-GB`). Put on the editor as `lang`, so a screen reader speaks it. */
  locale?: string;
  /** A translation, or part of one. A key left out is said in English. */
  messages?: Partial<Messages>;
  /**
   * The host's own translator, for a system that already has one (react-i18next, next-intl...). It is
   * asked first for every sentence, with the key, the values and `fallback`: the sentence the editor
   * would say without it, already filled in. Return the translation, or `undefined` to use the
   * fallback. With i18next: `(key, params, fallback) => t(key, { ...params, defaultValue: fallback })`.
   * Fill in `{name}` places yourself, the editor does not touch what you return.
   */
  translate?: (key: MessageKey, params: Params | undefined, fallback: string) => string | undefined;
}

/** What a part of the editor calls to say something. */
export interface T {
  (key: MessageKey, params?: Params): string;
  /**
   * The sentence for a key that may not exist, such as the name of a kind of block (`kind.Hero.label`):
   * the host's `translate`, then its `messages`, then `fallback`, which is the text the kind was
   * registered with (the editor's own English for the kinds it ships).
   */
  or(key: string, fallback: string): string;
}

/** A sentence with its `{name}` places filled in; a place with no value is left as it is. */
export function format(sentence: string, params?: Params): string {
  if (!params) return sentence;
  return sentence.replace(/\{(\w+)\}/g, (place, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : place,
  );
}

/**
 * The function the editor says things with. The order is the host's `translate`, then the host's
 * `messages`, then English.
 */
export function createT(i18n: I18n | undefined): T {
  const messages = i18n?.messages as Readonly<Record<string, unknown>> | undefined;
  const translate = i18n?.translate;
  const say = (key: string, params: Params | undefined, base: string): string => {
    const own = messages && Object.hasOwn(messages, key) ? messages[key] : undefined;
    const fallback = format(typeof own === "string" ? own : base, params);
    if (!translate) return fallback;
    const said = translate(key as MessageKey, params, fallback);
    return typeof said === "string" && said !== "" ? said : fallback;
  };
  const t = ((key: MessageKey, params?: Params) => say(key, params, en[key])) as T;
  t.or = (key, fallback) => say(key, undefined, fallback);
  return t;
}

/** The places (`{name}`) of a sentence, in order, for a test that compares two languages. */
export const placesOf = (sentence: string): string[] =>
  [...sentence.matchAll(/\{(\w+)\}/g)].map((match) => match[1] as string).sort();
