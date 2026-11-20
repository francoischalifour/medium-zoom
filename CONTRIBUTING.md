# Contributing to Medium Zoom

## Set up

Use the Node version in `.node-version` and the Bun version in `.bun-version`. From the repository root, install dependencies and browser binaries:

```sh
bun install --frozen-lockfile
bunx playwright install chromium firefox webkit
```

## Develop

Run commands from the repository root:

- `bun run dev`: watch the library build.
- `bun run dev:example vanilla`: serve an example against the local library build. Run the build watcher in another terminal to pick up library changes.
- `bun run dev:website`: serve the website against the library source. Run `bun run build` once to supply package-size metadata.
- `bun run stories`: build the library and serve the API stories at <http://127.0.0.1:9001/storybook/>.
- `bun run examples`: build and preview the website, stories, and examples at <http://127.0.0.1:4173>. Examples live under `/examples/<name>/`.

For website source, generated files, and analytics, see the [website development guide](website/README.md).

## Write documentation

User guides and API references live in `website/src/docs/`. Keep the root README focused on installation and a first working image. The Markdown files in `docs/` preserve links to guides that moved to the website.

When changing the public API, update the relevant MDX page and its examples together. For new pages, add the route and metadata to `website/src/docs/pages.ts`, list the URL in `website/public/sitemap.xml`, and include the page in `tests/browser/website-docs.spec.ts`. Add aliases for the URL without a trailing slash and for `index.html` in `website/public/_redirects`. Run `bun run generate:og` to create its sharing image.

Keep each page focused on one task or reference topic. Explain prerequisites before commands, use complete examples, and link to existing explanations instead of repeating them. Each example's README covers its purpose and how to run it.

## Verify changes

Run the complete check before submitting a change:

```sh
bun run check
```

This checks formatting, lint, types, package contents, bundle sizes, website and example builds, browser behavior, React Server Components, and website analytics.

For a focused check, use the commands below:

- `bun run format` or `bun run format:check`: format maintained files or check formatting.
- `bun run lint`: check source, tests, and tooling with Oxlint.
- `bun run typecheck`: check tooling, documentation snippets, and framework examples.
- `bun run test:package`: verify the npm tarball's exports, declarations, CSS, and ES5 syntax.
- `bun run test:examples`: copy each example outside the workspace, install with npm, check types, and build against the published package.
- `bun run size`: print the size benchmark and check gzip budgets (`test:size` is an alias). It lists what a bundler ships for each set of imports and every file in `dist`, each compared with `config/size-baseline.json`. After an intended size change, run `bun run size:baseline` to record the new reference.
- `bun run test:browser`: exercise the packed library, website, examples, and stories in Chromium, Firefox, and WebKit. Package rendering is compared with the published package.

Before individual package checks, run `bun run build`. Before browser checks, run `bun run build:website && bun run test:examples`. Browser fixtures use port 4175. To select browsers, append `--project=chromium --project=webkit` to the browser test command.

For documentation changes, the [website guide](website/README.md#verify-changes) lists the checks for snippets, navigation, and metadata.

## Preserve compatibility

Preserve the [documented browser support](https://medium-zoom.francoischalifour.com/docs/javascript/#browser-support) and package entry paths, including CommonJS, AMD, and the `mediumZoom` browser global. The default entry injects CSS; the pure entry does not. Both declaration paths are generated from the TypeScript source and must describe the same API.

The build uses Babel and Terser to retain ES5 syntax after bundling with tsdown. Keep the older-browser CSS fallbacks and existing bundle-size budgets.

Composable entries (`core`, `loaders`, `viewport`, `content`, `triggers`, `renderers`, `transitions`, `session`, `gallery`) are listed in `config/package.config.mts` and tested through the private package fixture in `tests/experimental`. Keep them out of the release tarball until their API is ready. `bun run test:browser:shadcn-composable` runs the published React component's suites against `examples/shadcn/tests/experimental/image-zoom.tsx`, the same component rewritten on those entries.

## Release

Use Conventional Commits. Release Please maintains the version and changelog in a release PR against `main`. Merging that PR creates an unprefixed tag and GitHub release, then verifies and publishes that commit to npm through trusted publishing.

If publication fails, fix the cause and rerun the failed publish job. Do not move the tag or repeat a completed publication.
