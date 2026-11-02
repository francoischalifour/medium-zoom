# Explicit composition experiment

These APIs belong to a **private package fixture**, not the published npm API. The root
release manifest still ships only the existing v1 distributions and declarations.
[Packaging and release proposal](PACKAGING.md) describes the proposed exports and rollout.

## Compose each responsibility directly

```ts
import { templateContent } from 'medium-zoom/content'
import { createZoom } from 'medium-zoom/core'
import { createGallery, bindGalleryKeyboard } from 'medium-zoom/gallery'
import { loadHdImage } from 'medium-zoom/loaders'
import { dialog } from 'medium-zoom/renderers'
import { createZoomSession } from 'medium-zoom/session'
import { bindZoomTriggers } from 'medium-zoom/triggers'
import { containerBounds } from 'medium-zoom/viewport'

import 'medium-zoom/modern/style.css'

const zoom = createZoom('.photos img', {
  margin: 72,
  loader: loadHdImage,
  viewport: containerBounds(container),
  renderer: dialog({
    content: view => {
      const removeContent = templateContent('#photo-content')(view)
      const unbindKeys = bindGalleryKeyboard(view.element, createGallery(view.zoom))
      return () => {
        unbindKeys()
        removeContent?.()
      }
    },
  }),
})
const session = createZoomSession(zoom)
const gallery = createGallery(zoom)
const unbindTriggers = bindZoomTriggers(zoom)
const unsubscribe = gallery.subscribe(() => renderApplicationUI(gallery.getSnapshot()))

await session.open({ target: image, trigger: button })
await gallery.next()

// The application owns bindings and controller lifetime.
unsubscribe()
unbindTriggers()
gallery.dispose()
await session.dispose()
```

`#photo-content` is authored application markup, including a visible close control and
its presentation. An authored `form method="dialog"` works through the normal close
lifecycle; imperative content receives `view.close`. Native buttons and React components
can provide their own activation and omit `bindZoomTriggers` entirely. No runtime export
creates control markup, live-position UI, or control styles.

There is no feature array, `.use()` method, or configurable factory. `createZoom` returns
an instance. `loader`, `viewport` and `renderer` are construction-time strategies; core
options are `margin`, `background` and `scrollOffset`. `getOptions()` contains those options,
and `update()` changes them. `clone()` preserves strategies and core options, initially
has no attached images, and does not install bindings/controllers on the clone.

## Contracts and ownership

| Capability      | API                                     | Owns                                                                                    |
| --------------- | --------------------------------------- | --------------------------------------------------------------------------------------- |
| Loading         | `loader: loadHdImage`                   | Source work and a synchronous cancellation function                                     |
| Viewport        | `viewport: containerBounds(target)`     | Positioning-time layout measurements                                                    |
| Renderer        | `renderer: dialog({ content })`         | Modal host, inertness, focus, content and transition presentation                       |
| Content helper  | `templateContent(template)`             | Cloning authored markup into the renderer slot and removing it on disposal              |
| Trigger binding | `bindZoomTriggers(zoom)`                | Bare-image activation semantics, pointer/keyboard events and restoration                |
| Gallery         | `createGallery(zoom)`                   | Selection, attached-image order, bounds and subscriptions                               |
| Session         | `createZoomSession(zoom)`               | Per-document ownership, queued requests and cancellation                                |
| Gallery keys    | `bindGalleryKeyboard(element, gallery)` | Optional interaction on an application-owned surface                                    |
| Engine          | shared internal engine                  | Sequencing, loading completion, interruption, frame cleanup and outgoing-frame disposal |

A `ZoomLoader` receives `{ original, content }` and calls `ready(media?)` with detached
media when loading finishes, or no argument to retain the existing content. It returns
cancellation synchronously. It receives no frame, append, geometry or disposal operations.
The engine adopts the first current result through its target frame, positions it and owns
its cleanup. Repeated/obsolete completions are ignored; never return connected application
DOM. The loader owns any detached resources until accepted. Set request attributes such as
CORS and referrer policy before starting a request. Loader/viewport failures reject opening
and use normal close cleanup. Content cleanup errors still release the modal before close
rejects. These contracts remain private candidate APIs.

A `ZoomViewport` receives viewport bounds and current core options, including margin.
`containerBounds` captures a target but resolves/measures it when positioning runs. It does
not add a `container` option to `update()`. Applications may supply their own measurement
function or change its application-owned input between openings.

`templateContent` is renderer-owned content: it mounts once per host and cleanup runs as
the host is disposed after closing. It preserves authored presentation and supplies no
automatic close fade. This intentionally differs from the legacy template option, whose
close fade remains in the compatibility preset. Application motion belongs in application
content or a transition strategy.

`bindZoomTriggers` returns an idempotent unbind function and does not replace instance
methods. It follows generic attach/detach notifications, removes its listeners and restores only attributes that still match its injected values, skips interactive wrappers/contenteditable surfaces and already-authored
interactive images, and does not handle protected/repeated activation. Clone content keeps
the authored accessible name and has no trigger-only role/tabindex/popup semantics.
The binding owns pointer and keyboard activation and requires a modal renderer. Unbinding
removes both. Modern core installs no source activation. Native/framework buttons supply
their own activation; compatibility presets retain automatic pointer zoom.

Gallery and session remain independent controllers. `createGallery` exposes stable
snapshots, subscription, previous/next/select, attachment and disposal; bounds stop at
either end. Session installation routes pointer, binding and framework requests through
the same coordinator. Calling either constructor again for the same instance returns the
same controller. A session coordinates commands through a stable internal request gate;
public method identities never change. Await `session.dispose()` to close, detach and
release ownership. The retained zoom can then be reattached and given a new session. A
disposed session stays inert and cannot interfere with its replacement. Collection subscriptions observe both controller and direct `zoom.attach()`/`detach()`
commands. Collection notifications coalesce in a microtask so they see the completed
batch, including legacy detach timing. `getSnapshot()` reads current state synchronously.
Gallery disposal releases subscriptions without disposing the zoom/session. Both keyboard binding
helpers return cleanup.

## Frames and gallery transitions

Target adapters remain internal. The current image adapter owns detection, resolved
sources, intrinsic measurements and frame creation; existing picture sources, SVG files
and SVG data URLs inside images retain regression coverage. Pure geometry consumes layout,
painted content, intrinsic dimensions and optional clipping. Frames own content/root nodes,
measurement/adoption, geometry application, clipping, visibility and idempotent disposal.
The engine measures a frame rather than looking up its content node as another target.
An engine-local immutable adapter list is verified with a test-only adapter whose root and
content differ; it does not register global mutable extensions.

Object-fit/object-position measurement, inline SVG and SVG use references remain later
increments. There is no adapter/geometry/frame-creation package export. Future adapters can
handle viewBox, preserveAspectRatio and referenced resources inside the frame boundary.

Gallery replacement stays instant for pointer and keyboard by default. Host, overlay and
application content persist; outgoing content remains visible while loading. Optional
`dialog({ transition })` receives prepared incoming/outgoing frame surfaces, geometry,
direction and an AbortSignal. The renderer narrows runtime descriptors; consumers receive
no engine disposal/mutation methods. The engine retains completion and frame retirement.
Late settlement, close, detach and session disposal cannot complete an obsolete scene;
reduced motion bypasses or cancels effects. No animation library is bundled.

## Migration from the previous private experiment

| Previous API                                | Explicit API                                              |
| ------------------------------------------- | --------------------------------------------------------- |
| `createMediumZoom(config)(images, options)` | `createZoom(images, { ...strategies, ...coreOptions })`   |
| `features: [hdImage()]`                     | `loader: loadHdImage`                                     |
| `container()` plus container option         | `viewport: containerBounds(target)`                       |
| `template()` plus template option           | `dialog({ content: templateContent(template) })`          |
| `accessibility()`                           | `bindZoomTriggers(zoom)` and retain its cleanup           |
| Factory-installed capabilities on clone     | Strategies clone; bindings/controllers install explicitly |

The published `mediumZoom(images, options)` API remains the compatibility preset. It
retains dynamic container/template options, option merging, body templates, their close
fade, and existing Promise/CustomEvent/scroll/keyboard fallbacks. Private adapters wire
these behaviors to the same engine. Composition modules target ES2020/native APIs; native
dialog support is an additional renderer requirement. No globals are patched.

## Verification and comparison

```fish
bun run check:core
bun run check:library
bun run test:size
bun scripts/check-size.ts --artifacts
env MEDIUM_ZOOM_TEST_PORT=4390 bun tests/server.ts
```

`/experiments/gallery.html` exercises application-owned vanilla markup; `/composition/`
exercises React compound controls and Strict Mode/unmount/remount against the same session
and gallery modules. The React source is not part of the runtime package or published
registry yet. The browser harness builds both real private and release package consumers.

`bundle-baseline.json` captures commit `53e96a2` before this API refactor, using Bun 1.4.4,
gzip level 9 and the same installed build tools. The size command prints raw entries,
selected-consumer JS/CSS transfer, named incremental comparisons and before/after rows.
Raw module sizes are not additive consumer costs. App UI/CSS and React are excluded;
explicit core CSS is 245 B and counted separately. The example custom transition includes
its strategy code. Template-bearing before/after rows are omitted where ownership/fade
changed; preset comparisons retain the same legacy behavior.

The compatibility preset now has a strict **less than 3,800 B gzip** budget, including
injected CSS: **3,697 B ESM, 3,694 B CommonJS and 3,787 B standalone UMD**. It retains
v1 browser support, ES5 UMD syntax, Promise/CustomEvent fallbacks and all legacy options.
Against the preceding boundary checkpoint `09086b0`, compatibility ESM falls from
4,637 to 3,697 B (−940 B). Raw core falls from 3,766 to 3,552 B ESM; CJS is 3,554 B.
Both core formats and its rebundled consumer retain 3,800 B JS ceilings.

| Selected consumer                  | Before JS | After JS | Change |
| ---------------------------------- | --------: | -------: | -----: |
| core                               |   3,729 B |  3,544 B | −185 B |
| core + HD                          |   4,047 B |  3,775 B | −272 B |
| core + container                   |   3,959 B |  3,744 B | −215 B |
| core + dialog                      |   4,741 B |  4,484 B | −257 B |
| gallery + session                  |   5,665 B |  5,580 B |  −85 B |
| accessible gallery                 |   6,220 B |  6,230 B |  +10 B |
| Compatibility preset, CSS included |   4,172 B |  3,696 B | −476 B |

These consumer comparisons use the reproducible `53e96a2` baseline, not `09086b0`.
Composed rows additionally transfer 251 B CSS before and 245 B after. HD + container is
3,976 B JS plus 245 B CSS. Raw module sizes are not additive; the CLI prints actual
rebundled imports and their incremental costs.

The private package stays at 62 files: 63,985 B tarball and 327,142 B unpacked. The public
manifest stays at 13 files: 29,553 B tarball and 128,945 B unpacked. Against `53e96a2`,
those tarballs shrink by 1,307 B and 1,137 B respectively. These are installation costs;
only selected consumer code contributes to browser transfer. Candidate paths remain
unpublished. Archive measurements exclude this experimental documentation.

### Static frame implementations

One engine owns sequencing, cancellation, events and disposal in every build. Its private
`#engine-profile` binding selects frame operations at build time. Fixed image presets use
a small image-only implementation; composed core retains measured frames and strategy
hooks. Source tests also enable internal custom adapters and legacy options. These are
build bindings, with no runtime profile switch or second lifecycle implementation.

The fixed implementation accepts only the preset's private image loader. Arbitrary
consumer loaders use composed core, whose frames adopt and normalize detached media.
Pure geometry regressions compare both image positioning paths; `typecheck:frames`
checks every implementation against the same engine call sites. Future painted-content
or SVG support belongs in composed frames first, with explicit coverage before changing
the compatibility implementation. This specialization buys size but adds a maintenance
obligation: update both implementations when shared image behavior changes.

The engine exposes a private command cell; session installs/releases its coordinator
there while public instance methods remain stable. Controllers and rendering still own
their separate lifetimes. Transition strategies start only after their cancellation lease
is installed, including synchronous reentrant gallery navigation.

## Architectural review after the boundary passes

Keep the explicit APIs. Controllers, strategies, bindings and content helpers now have
different lifetimes with explicit ownership. Do not add a universal installation API to
make those shapes superficially uniform. The narrow engine contracts are the shared part.

The important proofs are behavioral: a retained zoom survives session disposal without
method replacement; loaded media has no engine mutation access; a frame with distinct
root/content measures and adopts through its own implementation; content can clean up
without leaving a modal behind; authored cancellation and attribute updates survive
bindings; direct collection mutations notify gallery subscribers. Packed consumers prove
the same entry contracts independently of the catalog. The build/report/type catalog and
checkout diagnostics make changes easier for both maintainers and coding agents to verify.

Keep the next increments concrete: add object-fit/position measurements through the frame
measurement boundary, then SVG forms with explicit fixtures for each source/resource
shape. Keep adapters and custom renderer construction internal until those implementations
prove which contracts consumers actually need. User-land gallery transitions are already
an explicit supported experiment. Avoid predicting a large public adapter framework.

Before release, choose canonical subpaths and remove redundant experimental presets.
Leave application controls and React in registry/application source. The standalone compatibility build has only 13 B of gzip headroom. Future capabilities
should remain optional modules and be measured through actual consumers; a size increase
needs an explicit budget decision. Keep this constraint visible when changing the engine.

Geometry equivalence, loading interruption, strategy failure/repeated readiness, template
content lifetime, controller independence, binding cleanup, native/custom controls, focus,
reduced motion and instant gallery navigation have direct regression coverage.
Manual screen-reader checks remain outstanding. Firefox currently cannot launch locally
because its profile directory is unavailable; desktop/mobile Chromium and WebKit provide
the automated browser evidence.
