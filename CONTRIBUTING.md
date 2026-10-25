# Contributing to Medium Zoom

Medium Zoom is a small, composable image zoom with no runtime dependencies.

## Development

Use the Node version in `.node-version` and Bun version in `.bun-version`.

```sh
bun install --frozen-lockfile
bunx playwright install chromium firefox webkit
bun run check
```

Run commands from the repository root:

- `bun run dev`: watch the library build.
- `bun run dev:example vanilla`: serve an example against the local library build.
- `bun run dev:website`: serve the website.
- `bun run stories`: build the library and serve the API stories at
  <http://127.0.0.1:9001/storybook/>.
- `bun run examples`: build and preview the website, stories, and examples at
  <http://127.0.0.1:4173>. Examples live under `/examples/<name>/`.

## Verification

`bun run check` checks formatting, lint, types, package contents, bundle sizes,
website/example builds, and browser behavior.

- `bun run format` / `bun run format:check`: format maintained files or check formatting.
- `bun run lint`: check source, tests, and tooling with Oxlint.
- `bun run typecheck`: check tooling and framework examples.
- `bun run test:package`: verify the npm tarball's exports, declarations, CSS, source maps, and ES5 syntax.
- `bun run test:examples`: copy each example outside the workspace, install with npm,
  check types, and build against the published package.
- `bun run test:size`: check the existing gzip budgets.
- `bun run test:browser`: exercise the packed library, website, examples, and stories
  in Chromium, Firefox, and WebKit. Package rendering is compared with the published package.

Before running individual package checks, run `bun run build`. Before browser
checks, run `bun run build:website && bun run test:examples`. Browser fixtures use port 4175.
To select browsers, append `--project=chromium --project=webkit`.

## Compatibility

Preserve the documented browser support and package entry paths, including
CommonJS, AMD, and the `mediumZoom` browser global. The default entry injects CSS;
the pure entry does not. Both declaration paths must match `src/medium-zoom.d.ts`.

The build uses Babel and Terser to retain ES5 syntax after bundling with tsdown.
Keep the older-browser CSS fallbacks and existing bundle-size budgets.

All six JavaScript artifacts ship adjacent hidden `.js.map` files with embedded
maintained sources and relative paths. Load the map manually in your debugger
(e.g. DevTools' **Add source map** command); JavaScript has no `sourceMappingURL`
comment so maps do not change its gzip cost. Maps compose tsdown, Babel, and Terser
output, including the release banner offset. `bun run test:package` checks the
packed maps and traces generated positions back to both source modules. Keep maps
outside the JavaScript size budgets and declarations free of dangling map links.

## Releases

Use Conventional Commits. Release Please maintains the version and changelog in
a release PR against `main`. Merging that PR creates an unprefixed tag and GitHub
release, then verifies and publishes that commit to npm through trusted publishing.

If publication fails, fix the cause and rerun the failed publish job. Do not move
the tag or repeat a completed publication.
