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
| Renderer        | `renderer: dialog({ content })`         | Modal host, activation policy, inertness, focus, content and transition presentation    |
| Content helper  | `templateContent(template)`             | Cloning authored markup into the renderer slot and removing it on disposal              |
| Trigger binding | `bindZoomTriggers(zoom)`                | Bare-image activation semantics, keyboard events and restoration                        |
| Gallery         | `createGallery(zoom)`                   | Selection, attached-image order, bounds and subscriptions                               |
| Session         | `createZoomSession(zoom)`               | Per-document ownership, queued requests and cancellation                                |
| Gallery keys    | `bindGalleryKeyboard(element, gallery)` | Optional interaction on an application-owned surface                                    |
| Engine          | shared internal engine                  | Sequencing, loading completion, interruption, frame cleanup and outgoing-frame disposal |

A `ZoomLoader` receives the original target, a read-only frame surface, append operations,
and `ready(frame?)`. It starts work, returns cleanup synchronously, and calls `ready` when
content is prepared, including when no replacement is needed. The engine calls cleanup
on completion/interruption and ignores repeated or obsolete readiness. Frame transfer
through `appendFrame` gives disposal ownership to the engine; late transfers are disposed.
Thrown loader/viewport errors reject the request and use normal close cleanup. The loader
frame-transfer contract remains experimental along with the other candidate exports.

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
methods. It follows generic attach/detach notifications, restores authored attributes and
listeners, skips interactive wrappers/contenteditable surfaces and already-authored
interactive images, and does not handle protected/repeated activation. Clone content keeps
the authored accessible name and has no trigger-only role/tabindex/popup semantics.
The binding requires a modal renderer. Native/framework buttons keep their own activation.

Gallery and session remain independent controllers. `createGallery` exposes stable
snapshots, subscription, previous/next/select, attachment and disposal; bounds stop at
either end. Session installation routes pointer, binding and framework requests through
the same coordinator. Calling either constructor again for the same instance returns the
same controller. Both keyboard binding helpers return cleanup.

## Frames and gallery transitions

Target adapters remain internal. The current image adapter owns detection, resolved
sources, intrinsic measurements and frame creation; existing picture sources, SVG files
and SVG data URLs inside images retain regression coverage. Pure geometry consumes layout,
painted content, intrinsic dimensions and optional clipping. Frames own content/root nodes,
geometry application, clipping, visibility and idempotent disposal.

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
explicit core CSS is 251 B and counted separately. The example custom transition includes
its strategy code. Template-bearing before/after rows are omitted where ownership/fade
changed; preset comparisons retain the same legacy behavior.

Both raw core module formats and the rebundled ESM core consumer have enforced 3,800 B
gzip ceilings. See the measured comparison below and the CLI for the complete matrix.

Raw core is **3,638 B ESM** and **3,676 B CommonJS**, below the 3,800 B ceiling.
Compared with `53e96a2`, raw core ESM decreases **116 B**. Gallery and session raw modules
are unchanged. The stronger loading/cleanup contracts add **147 B** to the compat/default
raw artifact (4,225 → 4,372 B); this cost is explicit in the report and budgets.

| Selected consumer                  | Before JS | After JS | Change |
| ---------------------------------- | --------: | -------: | -----: |
| core                               |   3,729 B |  3,619 B | −110 B |
| core + HD                          |   4,047 B |  3,927 B | −120 B |
| core + container                   |   3,959 B |  3,824 B | −135 B |
| core + dialog                      |   4,741 B |  4,690 B |  −51 B |
| gallery + session                  |   5,665 B |  5,619 B |  −46 B |
| accessible gallery                 |   6,220 B |  6,167 B |  −53 B |
| Compatibility preset, CSS included |   4,172 B |  4,296 B | +124 B |

Composed rows above require the same additional 251 B CSS before and after. The
new non-modal HD + container composition is 4,132 B JS plus 251 B CSS. Template-bearing
compositions have intentionally changed lifetime/presentation and are not included in
the savings table. The full modern gallery composition is measured separately by the CLI.

Actual package archives also grow because the private fixture replaces one feature
barrel with four purpose-specific entries and matching declarations: 50 → 62 files,
65,292 → 68,068 B tarball, 332,155 → 356,921 B unpacked. The public-manifest archive
remains 13 files, 30,690 → 31,808 B tarball. These are install/download costs, not app
runtime transfer; no new candidate path is added to the public manifest.

Geometry equivalence, loading interruption, strategy failure/repeated readiness, template
content lifetime, controller independence, binding cleanup, native/custom controls, focus,
reduced motion and instant gallery navigation have direct regression coverage.
Manual screen-reader checks remain outstanding. Firefox currently cannot launch locally
because its profile directory is unavailable; desktop/mobile Chromium and WebKit provide
the automated browser evidence.
