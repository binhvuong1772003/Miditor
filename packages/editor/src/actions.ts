/** One value an action asks for, shown as a field under the button's action. */
export interface ActionParam {
  /** The key in the payload: a lowercase name such as `sku`. */
  name: string;
  label: string;
  /** What kind of value it is. Without it, `text`. */
  type?: "text" | "number" | "boolean";
}

/**
 * What a host's page can do when a button is pressed. The editor lists these in the button's Action
 * field and asks for each `params` value; `<Render onAction>` hands the choice back at run time.
 * The editor stores only the `name` and the values, never code.
 */
export interface ActionDef {
  /** A lowercase name, such as `add-to-cart`: what `onAction` receives. */
  name: string;
  /** What the person sees in the list. */
  label: string;
  params?: readonly ActionParam[];
}
