# v2 milestone previews

Status on November 22, 2026: **setup only; no v2 preview has been published**. Registry reads confirmed `latest = 1.1.2` and the historical `next = 1.0.0-next.0` (published August 27, 2018). Leave that tag untouched until an explicitly authorized first publication. Installing `medium-zoom@next` today does not test these candidates. Recheck registry state before making availability claims.

## One package, two channels

- `latest`: compatible v1, managed by Release Please, including release PR #247 proposing 1.2.0 and its normal example synchronization.
- `next`: opt-in `2.0.0-next.N` milestone previews; no release date promised. No automatic push/PR/tag trigger, GitHub release, example synchronization, or stable promotion.
- The preview selects the [modern preset contract](https://github.com/francoischalifour/medium-zoom/blob/main/docs/modern-preset.md) for the root, `/pure`, declarations and `/style.css`: image zoom and HD loading, native dialog and accessible triggers, structural modern CSS, and a slim state-based controller. No gallery controls or decorative theme are included. Explicit `/modern` and `/compat` presets each have matching `/pure` and `/style.css` paths. Historical v1 dist imports remain available.
- **The v2 default direction is agreed, not published.** Switching to modern is a breaking API/style/browser change, not just a transpilation change. The stable v1 build and release manifest remain untouched. Review the modern contract, migration notes and milestone readiness before the first preview; gallery/content/viewport composition remains opt-in.

## Maintainer prerequisites

1. Merge the reviewed setup on `main`, then review the exact commit and candidate APIs for the intended milestone. Do not publish this uncommitted audit checkout. Read the maintainer matrix; a preview is feedback material, not proof that historical bugs are fixed.
2. Configure the GitHub environment `npm-next` with required maintainer reviewers, prevent self-review where available, restrict deployment branches to `main`, and disable approval bypass where supported. An unprotected environment is not a human approval gate: configure protection **before** using the workflow.
3. Add an npm trusted publisher for package `medium-zoom`, GitHub owner `francoischalifour`, repository `medium-zoom`, workflow filename `preview-release.yml`, environment `npm-next`. Explicitly enable **Allow npm publish**: new trusted publishers default to staged publishing, but this workflow publishes the approved tarball directly. Preserve the existing `release.yml` trusted publisher and its permissions; do not replace it. npm supports multiple trusted publishers. Use the pinned Node version with npm >=11.5.1; OIDC needs `id-token: write` only in the publication job. No long-lived npm token is needed. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).
4. Review the packaged API expectations below and finish matching milestone notes/docs before authorizing publication. Decide a fresh increasing `N`; never reuse a published version. Repository/branch guards and a shared `release` concurrency group prevent accidental fork/branch runs and overlapping normal/preview workflows in this repository.

To inspect current public state (read-only):

```fish
npm view medium-zoom dist-tags --json
```

```fish
npm view medium-zoom versions --json
```

## Non-publishing verification

Run from the repository root with its pinned Bun and Node versions. These commands do not publish or move tags. `2.0.0-next.0` here is only a local test version, not a reservation or availability claim.

```fish
bun install --frozen-lockfile
```

```fish
bun run check format lint isolated unit typecheck size release package preview
```

```fish
bun scripts/check-preview.ts 2.0.0-next.0
```

The preview checker consumes the existing build, stages a deliberately allowlisted manifest outside the checkout, then packs and validates the actual tarball. It requires every release/candidate JS, declaration and stylesheet and rejects extra files, missing files, wrong metadata, scripts, development dependencies, workspaces and `private: true`. Source-version banners are re-versioned only inside that staging directory. It runs the existing publint/ATTW exceptions and consumer matrix (ESM/CJS, TypeScript resolution modes and Vite) on those packed bytes, saving `.cache/preview/medium-zoom.tgz` only after success. The experimental fixture remains private and is never a publication target. The root manifest, v1 entries and release baseline stay untouched.

For browser checks, install the repository's matching Playwright browsers, then:

```fish
bun run build:website
```

```fish
bun run test:examples
```

```fish
bun run test:browser
```

The workflow reuses the full existing checks at the dispatched commit, including Chromium, Firefox and WebKit coverage, before packaging. Those browser suites exercise source/candidate builds; the tarball consumer matrix separately verifies packaging. Test an installed tarball in the reporter's application too; neither layer substitutes for the original reproduction or physical Safari/legacy devices.

## Deliberately authorize a milestone

Only after explicit publication authorization, manually run **Preview release** (`preview-release.yml`) on `main`, enter the reviewed `2.0.0-next.N`, and type `publish-next`. Do not dispatch as part of setup or testing. Inspect the `npm-preview` artifact and checks before approving the protected `npm-next` job. Publication uses only that downloaded tarball, rechecks package identity/version/channel, rejects existing/non-increasing milestones, and runs `npm publish ... --tag next --access public --ignore-scripts`. Registry/network errors fail closed. It creates no GitHub release and does not change the normal release PR or examples.

After an authorized publication, read `npm view medium-zoom dist-tags --json` and the exact version's metadata, compare `latest` with the preflight value, and install that exact version in a clean consumer. Record the actual version, commit, checks, limitations and docs URL before offering it to issue authors. If a publish job fails or its outcome is uncertain, inspect registry metadata first; do not blindly rerun a version that may already exist. Stop and investigate; do not move tags, republish or promote a preview as a repair step. No such actions are authorized by this document.

## Preview API and browser expectations

Candidate modern entries target Safari/iOS 15.4+, Chrome/Edge 99+ and Firefox 98+ (native dialog and CSS cascade layers), not the v1 legacy-browser promise. Compatibility entries retain their existing profile; a native dialog renderer still requires native dialog support. Gallery, focus and gestures must be verified on actual target browsers. Pure/composable entries need explicit CSS and binding cleanup.

Once an actual milestone exists, install its **exact** version first; use `@next` only after verifying the tag. This illustrative command must not be treated as an already published version:

```fish
npm install --save-exact medium-zoom@2.0.0-next.0
```

Minimal composition matching `playground/gallery/main.ts` (application markup supplies `.gallery img`):

```js
import { createZoom } from 'medium-zoom/core'
import { galleryControls } from 'medium-zoom/gallery'
import { loadHdImage } from 'medium-zoom/loaders'
import { dialog } from 'medium-zoom/renderers'
import { slide } from 'medium-zoom/transitions'
import { bindZoomTriggers } from 'medium-zoom/triggers'
import 'medium-zoom/gallery.css'

const zoom = createZoom('.gallery img', {
  loader: loadHdImage,
  renderer: dialog({ content: galleryControls(), transition: slide() }),
})
const unbind = bindZoomTriggers(zoom)
```

On application teardown call `unbind()` and `zoom.detach()`; confirm application-owned loaders/content cleanup as well. See the typed contracts and playground for explicit headless controllers, keyboard/gesture binders and content callbacks. Do not invent a v1 `change()`, native video target, Promise-returning template option, automatic history integration or class option.

Test next/previous, keyboard boundaries, gesture thresholds and cancellation, focus restoration/Escape/backdrop/top-layer behavior, reduced motion, HD failure and rapid navigation, custom content cleanup and responsive CSS in the reporter's case. A prerelease test invitation does not satisfy a stable closure gate. Leave issues open for feedback; only claim a published fix after a supported stable release and original-case verification (or an explicit maintainer scope decision).
