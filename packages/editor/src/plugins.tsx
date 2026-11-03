import type { ComponentType, ReactNode } from "react";
import type { Appearance } from "./appearance";
import type { EditorProps } from "./Editor";
import type { HideName } from "./hide";
import type { I18n } from "./i18n/translate";
import type { ComponentOverrides, Overrides } from "./overrides";
import type { Permissions } from "./store";

/** The version of the plugin shape; a plugin may say which one it needs. */
export const PLUGIN_API_VERSION = 1;

type Config = NonNullable<EditorProps["config"]>;
type PluginConfig = Pick<
  Config,
  | "components"
  | "renderers"
  | "tools"
  | "customFields"
  | "sources"
  | "actions"
  | "fonts"
  | "images"
  | "icons"
>;

/** A bundle of changes to the editor, given in `plugins`. @experimental */
export interface EditorPlugin {
  /** Tells it apart from the others in warnings; each plugin has its own. */
  name: string;
  /** The version of the plugin shape it was written for (`PLUGIN_API_VERSION`); without it, 1. */
  apiVersion?: number;
  overrides?: Overrides;
  hide?: readonly HideName[];
  permissions?: Permissions;
  appearance?: Appearance;
  i18n?: I18n;
  config?: PluginConfig;
}

/** Gives a plugin its type. */
export const definePlugin = (plugin: EditorPlugin): EditorPlugin => plugin;

const told = new Set<string>();
const warn = (message: string) => {
  if (told.has(message)) return;
  told.add(message);
  console.warn(`[miditor] ${message}`);
};

/** The plugins that can be used: a bad or repeated one is told once and left out. */
export function usablePlugins(plugins: readonly EditorPlugin[] | undefined): EditorPlugin[] {
  const names = new Set<string>();
  const usable: EditorPlugin[] = [];
  for (const plugin of plugins ?? []) {
    const name = typeof plugin?.name === "string" ? plugin.name.trim() : "";
    if (name === "") {
      warn("a plugin has no name and is left out");
      continue;
    }
    const version = plugin.apiVersion ?? 1;
    if (!Number.isInteger(version) || version < 1 || version > PLUGIN_API_VERSION) {
      warn(
        `the plugin "${name}" needs plugin API version ${String(plugin.apiVersion)}, this editor has ${PLUGIN_API_VERSION}: left out`,
      );
      continue;
    }
    if (names.has(name)) {
      warn(`the plugin "${name}" is given twice: the second is left out`);
      continue;
    }
    names.add(name);
    usable.push(plugin);
  }
  return usable;
}

/** `outer` drawn around `inner`, both given the props of the place and the part inside as `children`. */
const wrapped = new WeakMap<object, WeakMap<object, ComponentType<never>>>();

function wrap(inner: ComponentType<never>, outer: ComponentType<never>): ComponentType<never> {
  // The same pair gives the same component, so a host that gives new objects each render does not make
  // its overrides draw again from scratch.
  const known = wrapped.get(inner)?.get(outer);
  if (known) return known;
  const Inner = inner as ComponentType<{ children?: ReactNode }>;
  const Outer = outer as ComponentType<{ children?: ReactNode }>;
  // biome-ignore lint/correctness/noComponentHookFactories: made once for each pair and kept, so it is the same component on every render
  function Wrapped(props: { children?: ReactNode }) {
    return (
      <Outer {...props}>
        <Inner {...props}>{props.children}</Inner>
      </Outer>
    );
  }
  const made = Wrapped as ComponentType<never>;
  const byOuter = wrapped.get(inner) ?? new WeakMap<object, ComponentType<never>>();
  byOuter.set(outer, made);
  wrapped.set(inner, byOuter);
  return made;
}

/** `later` on top of `earlier`, place by place. */
export function mergeOverrides(
  earlier: Overrides | undefined,
  later: Overrides | undefined,
): Overrides | undefined {
  if (!earlier) return later;
  if (!later) return earlier;
  const merged: Record<string, unknown> = { ...earlier };
  for (const [place, entry] of Object.entries(later)) {
    if (entry === undefined) continue;
    const before = (earlier as Record<string, unknown>)[place];
    if (before === undefined) merged[place] = entry;
    else if (place === "contextMenu") {
      const first = before as NonNullable<Overrides["contextMenu"]>;
      const second = entry as NonNullable<Overrides["contextMenu"]>;
      merged[place] = (args: Parameters<typeof first>[0]) =>
        second({ ...args, items: first(args) });
    } else {
      merged[place] = wrap(
        before as ComponentOverrides[keyof ComponentOverrides] as ComponentType<never>,
        entry as ComponentType<never>,
      );
    }
  }
  return merged as Overrides;
}

type OnNode = boolean | ((...args: never[]) => boolean) | undefined;
const both = (a: OnNode, b: OnNode): OnNode => {
  if (a === undefined) return b;
  if (b === undefined) return a;
  if (typeof a === "boolean" && typeof b === "boolean") return a && b;
  const call = (x: OnNode, args: unknown[]) =>
    typeof x === "function" ? (x as (...rest: unknown[]) => boolean)(...args) : x !== false;
  return (...args: never[]) => call(a, args) && call(b, args);
};

/** Every key allowed only when both allow it. */
export function mergePermissions(a: Permissions | undefined, b: Permissions | undefined) {
  if (!a) return b;
  if (!b) return a;
  const out: Record<string, unknown> = {};
  for (const key of ["canEdit", "canDelete", "canDuplicate", "canDrag", "canAdd"] as const) {
    const value = both(a[key] as OnNode, b[key] as OnNode);
    if (value !== undefined) out[key] = value;
  }
  return out as Permissions;
}

function mergeMaps<T>(
  name: string,
  earlier: Readonly<Record<string, T>> | undefined,
  later: Readonly<Record<string, T>> | undefined,
) {
  if (!earlier) return later;
  if (!later) return earlier;
  for (const key of Object.keys(later)) {
    if (Object.hasOwn(earlier, key))
      warn(`${name} "${key}" is given by more than one plugin: the later one wins`);
  }
  return { ...earlier, ...later };
}

const join = <T,>(a: readonly T[] | undefined, b: readonly T[] | undefined) =>
  a && b ? [...a, ...b] : (a ?? b);

function mergeConfig(a: Config | undefined, b: Config | undefined): Config | undefined {
  if (!a) return b;
  if (!b) return a;
  const merged: Config = { ...a, ...b };
  const set = <K extends keyof Config>(key: K, value: Config[K]) => {
    if (value === undefined) delete merged[key];
    else merged[key] = value;
  };
  set("components", mergeMaps("component", a.components, b.components) as Config["components"]);
  set("renderers", mergeMaps("renderer", a.renderers, b.renderers));
  set("customFields", mergeMaps("custom field", a.customFields, b.customFields));
  set("sources", mergeMaps("source", a.sources, b.sources));
  set("icons", mergeMaps("icon", a.icons, b.icons));
  set("tools", join(a.tools, b.tools));
  set("actions", join(a.actions, b.actions));
  set("fonts", join(a.fonts, b.fonts));
  set("images", join(a.images, b.images));
  return merged;
}

function mergeAppearance(a: Appearance | undefined, b: Appearance | undefined) {
  if (!a) return b;
  if (!b) return a;
  const colors = a.colors || b.colors ? { ...a.colors, ...b.colors } : undefined;
  return { ...a, ...b, ...(colors ? { colors } : {}) };
}

function mergeI18n(a: I18n | undefined, b: I18n | undefined) {
  if (!a) return b;
  if (!b) return a;
  const messages = a.messages || b.messages ? { ...a.messages, ...b.messages } : undefined;
  return { ...a, ...b, ...(messages ? { messages } : {}) };
}

/**
 * The props of the editor with the plugins applied, in order, and the host's own props last. The result
 * is a new object only when there are plugins.
 */
export function applyPlugins<P extends EditorProps>(props: P): P {
  const plugins = usablePlugins(props.plugins);
  if (plugins.length === 0) return props;
  let overrides: Overrides | undefined;
  let permissions: Permissions | undefined;
  let appearance: Appearance | undefined;
  let i18n: I18n | undefined;
  let config: Config | undefined;
  const hide = new Set<HideName>();
  const layers = [
    ...plugins.map(({ overrides, permissions, appearance, i18n, config, hide }) => ({
      overrides,
      permissions,
      appearance,
      i18n,
      config,
      hide,
    })),
    {
      overrides: props.overrides,
      permissions: props.permissions,
      appearance: props.appearance,
      i18n: props.i18n,
      config: props.config,
      hide: props.hide,
    },
  ];
  for (const layer of layers) {
    overrides = mergeOverrides(overrides, layer.overrides);
    permissions = mergePermissions(permissions, layer.permissions) as Permissions | undefined;
    appearance = mergeAppearance(appearance, layer.appearance);
    i18n = mergeI18n(i18n, layer.i18n);
    config = mergeConfig(config, layer.config as Config | undefined);
    for (const name of layer.hide ?? []) hide.add(name);
  }
  return {
    ...props,
    ...(overrides ? { overrides } : {}),
    ...(permissions ? { permissions } : {}),
    ...(appearance ? { appearance } : {}),
    ...(i18n ? { i18n } : {}),
    ...(config ? { config } : {}),
    ...(hide.size > 0 ? { hide: [...hide] } : {}),
  };
}
