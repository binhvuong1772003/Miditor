# MiDito

An embeddable visual page editor for React.

The host app mounts `<Editor>` on its own route, owns persistence, and renders the saved
JSON with `<Render>`. Data goes in through props and comes out through callbacks.

## Packages

| Package           | Purpose                                                       |
| ----------------- | ------------------------------------------------------------- |
| `packages/core`   | Framework-free schema, registry, tree operations and commands |
| `packages/render` | Read-only `<Render>` for published pages (SSR friendly)       |
| `packages/editor` | `<Editor>`: canvas, layers, properties, drag and drop         |
| `apps/playground` | Vite app for trying the library                               |

Packages are published as `@midito-kitchen/core`, `@midito-kitchen/render` and
`@midito-kitchen/editor`.

## Requirements

- Node 22.18 or newer
- pnpm, through Corepack: `corepack enable` (the version is pinned in `package.json`)

## Commands

```bash
pnpm install
pnpm dev         # start the playground
pnpm test        # unit tests (Vitest)
pnpm typecheck   # tsc --noEmit
pnpm lint        # Biome
pnpm build       # build every package with tsdown
```

## Notes

- TypeScript is pinned to 6.x: the declaration build in tsdown does not support TypeScript 7 yet.
