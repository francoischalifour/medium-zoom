# Contributing to Medium Zoom

## Set up

Use the Node version in `.node-version` and the Bun version in `.bun-version`. From the repository root, install dependencies and browser binaries:

```sh
bun install --frozen-lockfile
bunx playwright install chromium firefox webkit
```

## Develop

Run commands from the repository root. Development servers move to the next free port when theirs is taken, so open the URL each command prints when running several worktrees at once.

- `bun run dev`: watch the library build.
- `bun run dev:example vanilla`: serve a Vite example against the local library build. Run `bun run build` first, or keep `bun run dev` running in another terminal to pick up library changes. The Angular, Astro, and VitePress examples run with `bun run examples`.
- `bun run dev:website`: build the library for package-size metadata, then serve the website against the library source.
- `bun run stories`: build the library and serve the API stories at <http://127.0.0.1:9001/storybook/>.
- `bun run examples`: build and preview the website, stories, and examples at <http://127.0.0.1:4173>. Examples live under `/examples/<name>/`.

For website source, generated files, and analytics, see the [website development guide](website/README.md).

## Write documentation

User guides and API references live in `website/src/docs/`. Keep the root README focused on installation and a first working image. The Markdown files in `docs/` preserve links to guides that moved to the website.

When changing the public API, update the relevant MDX page and its examples together. For new pages, add the route and metadata to `website/src/docs/pages.ts` and include the page in `tests/browser/website-docs.spec.ts`. The build generates the sitemap from the registered pages. Add aliases for the URL without a trailing slash and for `index.html` in `website/public/_redirects`. Run `bun run generate:og` to create its sharing image.

Keep each page focused on one task or reference topic. Explain prerequisites before commands, use complete examples, and link to existing explanations instead of repeating them. Each example's README covers its purpose and how to run it.

## Verify changes

Run the complete check before submitting a change:

```sh
bun run check
```

This checks formatting, lint, types, package contents, bundle sizes, website and example builds, browser behavior, React Server Components, and website analytics.

For a focused check, use the commands below:

- `bun run format` or `bun run format:check`: format or check maintained files; pass paths to limit either to those files.
- `bun run lint`: check source, tests, and tooling with Oxlint.
- `bun run check:isolated`: run the format and lint checks again in a copy of the repository's files under an empty home folder, and fail if the results differ from the checkout's. Tools look for configs, ignore files, and dependencies in parent directories, so a nested worktree can pass locally and fail in CI. Run `bun install` in each worktree: without its own `node_modules`, scripts resolve tools from the parent checkout.
- `bun run typecheck`: check tooling, documentation snippets, and framework examples.
- `bun run test:package`: verify the npm tarball's entries, declarations, CSS, and ES5 syntax and APIs, then the same for the private candidate package.
- `bun run test:examples`: copy each example outside the workspace, install with npm, check types, and build against the published package.
- `bun run size`: check gzip budgets and compare each import set and `dist` file with `config/size-baseline.json`. After an intended size change, run `bun run size:baseline` to record the new sizes.
- `bun run test:browser`: exercise the packed library, website, examples, and stories in Chromium, Firefox, and WebKit. Package rendering is compared with the published package.
- `bun run test:stress`: run long seeded sequences of every gallery interaction (buttons, keys, swipes, taps, pinches, scrolls, resizes) with full-size images that arrive late or fail, checking on every frame that something is on screen and focus stays in the zoom, and at every rest that the counter, labels, buttons and fit agree. `test:browser` runs two short seeds. A failure names its seed and the actions before it: replay it with `MEDIUM_ZOOM_STRESS_SEED=<seed> bun run test:browser gallery-stress.spec.ts`.

Before individual package checks, run `bun run build`. Before browser checks, run `bun run build:website && bun run test:examples`. Browser checks reserve the first free block of four ports from 4175 (4175, 4185, …), so worktrees can run them at the same time; set `MEDIUM_ZOOM_TEST_PORT` to choose the block. To select browsers, append `--project=chromium --project=webkit` to the browser test command. The `slow-mobile-chromium` project runs the gesture and stress suites with Chromium's CPU throttled six times, so events arrive sparse and late as on a slow phone or a loaded CI runner; Chromium gestures take their event times from the test, so a flick keeps its speed however slowly the page runs. Tests that depend on when something happens pause the page clock with `page.clock` instead of waiting a fixed time.

For documentation changes, the [website guide](website/README.md#verify-changes) lists the checks for snippets, navigation, and metadata.

## Preserve compatibility

Preserve the [documented browser support](https://medium-zoom.francoischalifour.com/docs/javascript/#browser-support) and package entry paths, including CommonJS, AMD, and the `mediumZoom` browser global. The default entry injects CSS; the pure entry does not. Both declaration paths are generated from the TypeScript source and must describe the same API.

The build uses Babel and Terser to retain ES5 syntax after bundling with tsdown. Keep the older-browser CSS fallbacks and existing bundle-size budgets.

Candidate entries are private: `config/package.config.mts` defines the composable entries (`core`, `loaders`, `viewport`, `content`, `triggers`, `renderers`, `transitions`, `gallery`) and the `compat`, `compat/pure`, `modern`, and `pure` presets. Keep them out of the release manifest and the user documentation until their API is ready. `bun run test:package` packs them from the fixture in `tests/experimental`. `bun run test:browser:shadcn-composable` runs the React component's browser suites against `examples/shadcn/tests/experimental/image-zoom.tsx`, the same component built on those entries. `bun run dev:gallery` builds the library and serves the gallery playground in `playground/gallery` against those entries; run `bun run dev` alongside it to rebuild on change. Candidate entries ship their CSS as stylesheets to import, such as `medium-zoom/renderers/style.css`, `medium-zoom/gallery/style.css`, and the combined `medium-zoom/gallery.css`, instead of injecting it.

## Release

Use Conventional Commits. Release Please maintains the version and changelog in a release PR against `main`. Merging that PR creates an unprefixed tag and GitHub release, then verifies and publishes that commit to npm through trusted publishing.

After npm publication, the workflow opens or updates a pull request with the released dependency in every standalone example and the matching Bun lockfile.

If publication fails, fix the cause and rerun the failed publish job. Do not move the tag or repeat a completed publication.
