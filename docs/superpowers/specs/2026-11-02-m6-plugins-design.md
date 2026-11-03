# M6: plugins

A plugin is a bundle a host (or another team) can hand to `<Editor plugins={[...]}>`: overrides, tools, parts to
hide, permissions, looks, words and config, written once and reused. Everything is `@experimental`.

**Shape.** `EditorPlugin = { name; apiVersion?; overrides?; hide?; permissions?; appearance?; i18n?; config? }`,
where `config` may carry `components`, `renderers`, `tools`, `customFields`, `sources`, `actions`, `fonts`,
`images`, `icons`. `definePlugin(p)` only types it. `PLUGIN_API_VERSION` is 1.

**Rules (tested).** Plugins are applied in array order, then the host's own props, which always win.
- A plugin whose `name` is missing or repeated, or whose `apiVersion` is not a whole number from 1 up to the
  current one, is left out with one warning. Without `apiVersion` it needs version 1.
- `overrides`: for a component place, a later plugin **wraps** the earlier ones (the host's own is outermost):
  `host(plugin2(plugin1(default)))`. `contextMenu` functions run in order, each given the lines the one
  before gave back.
- `hide`: the union.
- `permissions`: every key is the AND of all that give it, so a plugin can only take away, never give back.
- `appearance`: later wins per field, `colors` merged by name. `i18n`: `messages` merged, later wins; `locale` and
  `translate` of the last that sets one.
- `config`: `components`, `renderers`, `customFields`, `sources`, `icons` merge by key (later wins, one warning
  naming the key); `tools`, `actions`, `fonts`, `images` are joined (a repeated tool id keeps the first, see
  `usableTools`).
- The merge is memoised on the identity of `plugins` and the props it reads, so a stable `plugins` gives a
  stable result and nothing redraws more than before. Without `plugins` nothing changes.
