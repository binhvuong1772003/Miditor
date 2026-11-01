import { en, type MessageKey } from "./en";
import { format, type Params } from "./translate";

/**
 * An error whose text a person may read: it keeps the key and the values, so the screen can say it in
 * the language of the editor, and its own `message` is the English sentence for the console and for
 * anyone who catches it.
 */
export class TranslatableError extends Error {
  readonly key: MessageKey;
  readonly params: Params | undefined;
  constructor(key: MessageKey, params?: Params) {
    super(format(en[key], params));
    this.name = "TranslatableError";
    this.key = key;
    this.params = params;
  }
}
