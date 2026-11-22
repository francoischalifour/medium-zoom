# Contributing to Medium Zoom

## Principles

- **v1 never changes by accident.** The published package keeps its files, entries, and [browser support](https://medium-zoom.francoischalifour.com/docs/javascript/#browser-support). A change meant for v1 says so in its pull request.
- **v2 previews are deliberate.** Candidate entries and the modern preset stay out of the v1 release manifest and stable user documentation. A separately approved manual preview selects the modern contract in the same package on `next`; see [Preview releases](#preview-releases). They stay private until that publication is authorized.
- **Every change reports its cost.** Size and runtime are measured against recorded baselines. Raising a budget is a decision, not a fix.
- **Tests wait on behavior, not time.** Pause the page clock with `page.clock` instead of waiting a fixed time.

## Set up

```sh
bun install --frozen-lockfile
bunx playwright install chromium firefox webkit
```

Use the versions in `.node-version` and `.bun-version`. Run every command from the repository root.

## Develop

- `bun run dev`: watch the library build.
- `bun run dev:gallery`: serve the gallery playground on the candidate entries.
- `bun run dev:example <name>`: serve a Vite example against the local build.
- `bun run dev:website`: serve the website against the library source.
- `bun run stories`: serve the API stories.
- `bun run examples`: preview the built website, stories, and every example.

## Source

One package holds two libraries. Each directory of `src` is one part of them:

| Directory                     | Part                                                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `src/preset/`                 | The v1 library: `mediumZoom()` and its options, built for the compat profile.                                              |
| `src/modern/`                 | The v2 preset: a slim controller composing core, HD loading, native dialog and accessible triggers, with structural CSS.   |
| `src/core/` to `src/gallery/` | The modern library, one directory per entry: `src/<entry>/index.ts` is `medium-zoom/<entry>`.                              |
| `src/zoom/`                   | What both are made of: selectors, frames, geometry, transition waits, the HD loader, container bounds, and the stylesheet. |
| `src/platform/`               | What the compat and modern profiles answer differently, imported as `#platform`.                                           |

- **Neither library imports the other.** Both import `src/zoom`, so a change outside `src/zoom`, `src/platform`, and `src/preset` cannot change a released file.
- **An entry's code stays in its bundle.** Entries share types through `medium-zoom/<entry>`. `src/core/stage.ts` is the one private contract between two entries: the engine drives it and a renderer implements it.
- **Extensions use the public API.** Triggers and the gallery work on any zoom through its methods, state, events, and documented class names.
- **The modern preset composes entries.** Only `src/modern/` bundles their runtime implementations together; it never imports `src/preset/`. Optional entries remain independently usable.

`oxlint.config.mts` enforces the imports.

## Check

```sh
bun run check
```

It runs every step CI runs, in parallel where it can. `scripts/check.ts` lists the steps. Name some to run only those and the steps they need, as in `bun run check lint typecheck`, or add `--changed` to run what your branch's changes can affect. Slow steps are skipped when nothing they read has changed since they last passed; add `--no-cache` to run them anyway.

To pass arguments, run a step's own command:

- `bun run format`: format files.
- `bun run test:browser <file> --project=<browser>`: run some browser suites.
- `bun run test:stress`: run long random gallery sequences; replay one with its seed.

Browser suites need `bun run build:website && bun run test:examples` first.

## Measure

| Command                 | Compares with                                      |
| ----------------------- | -------------------------------------------------- |
| `bun run size`          | `baselines/size.json` and `config/size.config.mts` |
| `bun run bench`         | `baselines/bench.json`                             |
| `bun run check:release` | `baselines/release.json`                           |

Add `--update` to record an intended change. Add `--markdown` to `size` or `bench` for tables to paste in a pull request, and `--diff origin/main` to `check:release` to see what changed in the released files.

## Document

User guides and API references live in `website/src/docs/`, and the root README covers installation and a first image. Change the public API, its page, and its examples together. To add a page, follow [Add a page](website/README.md#add-a-page).

## Submit

Use Conventional Commits and follow `.github/pull_request_template.md`. Include the change's cost, and name any check you could not run.

## Release

Release Please opens a release pull request against `main`. Merging it tags the commit, creates the GitHub release, and publishes to npm through trusted publishing. A follow-up pull request updates the examples to the new version. If publication fails, fix the cause and rerun the failed job without moving the tag.

The stable publisher accepts only final `1.x.y` versions and explicitly uses `latest`. The separate manual v2 preview workflow accepts only `2.0.0-next.N` and publishes a checked candidate tarball with `--tag next`. It does not run Release Please or synchronize examples. Neither workflow promotes previews to stable.

### Preview releases

Setup only: no v2 preview has been published. The historical `next` tag is not evidence that these candidates are available. Read the registry before choosing an unused, increasing milestone version:

```sh
npm view medium-zoom dist-tags --json
```

```sh
npm view medium-zoom versions --json
```

Before the first authorized publication:

1. Review the exact `main` commit, candidate APIs and milestone readiness. A preview is feedback material, not a stable fix or permission to close issues.
2. Protect the GitHub environment `npm-next` with required maintainer reviewers and `main`-only deployments. Prevent self-review and approval bypass where supported.
3. Add an npm trusted publisher for package `medium-zoom`, owner `francoischalifour`, repository `medium-zoom`, workflow `preview-release.yml`, environment `npm-next`. Explicitly enable **Allow npm publish**: new trusted publishers default to staged publishing, whereas this workflow publishes the checked tarball directly. Preserve the existing `release.yml` publisher and its permissions. Use the pinned Node version with npm >=11.5.1; publication uses OIDC, not a long-lived npm token. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).
4. Run non-publishing verification with the pinned toolchain:

```sh
bun run check format lint isolated unit typecheck size release package preview
```

```sh
bun scripts/check-preview.ts 2.0.0-next.0
```

The checker stages candidate files outside the release package and tests the built tarball; the example version does not reserve or publish it. Only after explicit publication authorization, run **Preview release** (`preview-release.yml`) on `main`, enter the reviewed version and `publish-next`, inspect the `npm-preview` artifact, then approve the protected publication job. Both publishers share release concurrency. The preview publishes only the validated tarball with `--tag next --access public --ignore-scripts`; it creates no GitHub release and does not synchronize examples. After publication, verify the exact registry version and that `latest` is unchanged. If the outcome is uncertain, inspect the registry before retrying; never move tags or republish as a repair step.

### Modern preview contract

The preview root, `/pure`, declarations and `/style.css` select the modern preset: HD loading, native dialog, accessible activation and structural CSS without decorative themes or gallery controls. Explicit `/modern` and `/compat` paths have their own matching `/pure` and `/style.css`. Compat retains the v1 API and browser contract; modern is a breaking API/style/browser change. Do not mix their styles on one page.

```js
import mediumZoom from 'medium-zoom/pure'
import 'medium-zoom/style.css'

const zoom = mediumZoom('[data-zoomable]', { margin: 24 })
const unsubscribe = zoom.subscribe(() => console.log(zoom.getSnapshot()))
await zoom.open()
await zoom.close()
unsubscribe()
zoom.destroy()
```

The slim controller exposes `open(image?)`, `close()`, `attach`, `detach`, `update`, `getSnapshot`, `subscribe` and `destroy`; commands are not chainable and lifecycle promises resolve to `void`. Options are `margin`, `background`, `scrollOffset` and creation-time `signal`. The first argument is always images, not an options-object overload. Legacy getters, `clone`, `toggle`, `on`/`off` and DOM events are absent; snapshots replace them. Content, viewport, gallery and gestures are explicit compositions through the public entries.

Modern targets Chrome/Edge 99+, Firefox 98+ and Safari/iOS 15.4+, requiring native dialog, CSS cascade layers, AbortController, Promises and animation APIs; no polyfill is injected. Test the packed milestone in Chromium, Firefox and WebKit, mobile layouts, keyboard/focus restoration, Escape/backdrop behavior, reduced motion, HD success/failure and teardown. Current-browser CI does not prove historical minimum-browser or physical-device support. Verify reporter reproductions before claiming fixes. The default CSS uses the `medium-zoom` cascade layer, `Canvas` backdrop and `--medium-zoom-backdrop`, `--medium-zoom-duration` and `--medium-zoom-easing` overrides; preserve focus indicators.
