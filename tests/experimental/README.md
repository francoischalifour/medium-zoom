# Experimental architecture and packaging

All imports below describe a private fixture, not the published npm API. The release
manifest still publishes the nine existing v1 distribution files, without new export
maps or type mappings. `packExperimental()` stages candidate entries in a temporary
package. Keep these contracts private until their behavior and cost are agreed.

See [the packaging proposal](PACKAGING.md) for the export map, release sequence,
React delivery and the distinction between npm package size and browser transfer.

## Ownership boundaries

| Layer              | Owns                                                                                   | Does not own                                                  |
| ------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Target adapter     | Detection, source resolution, DOM measurements, intrinsic dimensions, frame creation   | Engine lifecycle or gallery UI                                |
| Pure geometry      | Fitting layout/painted content into a viewport, local clipping insets                  | DOM reads or writes                                           |
| Rendered frame     | Content/root nodes, geometry application, clipping, visibility, idempotent disposal    | Gallery selection or session ownership                        |
| Engine             | Loading, opening/replacement/closing, interruption, completion, frame retirement       | Application controls or target-specific source logic          |
| Modal renderer     | Persistent host, modal naming/inertness, loading semantics, focus return, content slot | Collection order or traversal                                 |
| Session            | Per-document ownership, queued requests, cancellation, coalescing, disposal            | Keyboard augmentation or gallery state                        |
| Gallery controller | Attached-image order, selection, bounds, subscriptions                                 | DOM creation, styles, keyboard listeners, session arbitration |
| Controls adapter   | Buttons, live position, keyboard bindings, optional stylesheet                         | Image loading, positioning, transitions, frame cleanup        |

Features receive a narrow content context: the original target, a read-only frame
surface (`element` and `content`), and append operations that transfer ownership to the
engine. They cannot inspect or mutate the engine's scene state. Mount callbacks return
closing cleanup; the factory composes those callbacks in either feature order. Option
updates and viewport transforms compose as well. One image loader is allowed per factory;
conflicts and modal-only feature requirements fail at factory creation.

The gallery controller validates its private selection capability at creation. It never
adds methods to the public v1 `Zoom` type. The engine's private capability is absent from
compat/default instances and declarations.

## Factory and selected features

```ts
import { mountGalleryControls } from 'medium-zoom/controls'
import { createMediumZoom } from 'medium-zoom/core'
import { hdImage, container, template, accessibility } from 'medium-zoom/features'
import { createGallery } from 'medium-zoom/gallery'
import { dialog } from 'medium-zoom/renderers'
import { createZoomSession } from 'medium-zoom/session'

import 'medium-zoom/modern/style.css'
import 'medium-zoom/controls/style.css'

const mediumZoom = createMediumZoom({
  renderer: dialog({
    content: ({ element, zoom }) => mountGalleryControls(element, createGallery(zoom)),
  }),
  features: [accessibility(), hdImage(), container(), template()],
})
const zoom = mediumZoom('.gallery img', { margin: 72, template: '#caption' })
const session = createZoomSession(zoom)
const gallery = createGallery(zoom)

await session.open({ target: image, trigger: button })
await gallery.next()
await gallery.previous()
const unsubscribe = gallery.subscribe(() => console.log(gallery.getSnapshot()))

// The application owns the controller and session lifetime.
unsubscribe()
gallery.dispose()
await session.dispose()
```

Core is CSS-free. `hdImage()` adds `data-zoom-src` / larger srcset loading; `container()`
adds element/coordinate bounds; `template()` adds cloned template content. TypeScript
infers the options installed by the factory. Features are fixed at factory creation;
`clone()` retains the renderer/features and owns a fresh instance.

`accessibility()` only enhances bare-image triggers and strips activation semantics from
content clones. It preserves authored labels/tab order and restores attributes/listeners
on detach. Native and ARIA interactive wrappers keep their authored activation. Provide
your own visible `:focus-visible` style. Session installation is explicit and independent:
`createZoomSession(zoom)` makes pointer, keyboard and framework calls to that instance use
the same coordinator. Calling it again for the same instance returns the same session.

The modal uses `showModal()` and the native top layer. All target frames, HD replacements,
template content, and application controls stay inside it. A visible Close image button
receives initial focus; closing restores the explicit trigger or previous focus if still
connected. `dialog({ content })` mounts application-owned DOM inside the host and accepts
a cleanup callback. React can own a root there without exposing its implementation to
core. Native `method="dialog"` submissions and Escape use the normal close lifecycle.
Unsupported native dialog environments reject opening without leaving an active scene.

## Headless gallery and optional controls

`createGallery(zoom)` returns one controller per instance. `getSnapshot()` has stable
identity until its state changes and exposes `images`, `current`, `index`, `canPrevious`,
and `canNext`. It supports `subscribe`, `select(index)`, `previous`, `next`, `attach`,
`detach`, and `dispose`. Use controller attachment methods when changing the collection
so subscribers update immediately. Bounds stop at either end. Selection emits normal
`open` / `opened` events; final dismissal emits `close` / `closed` on the selected source.

Gallery creation and traversal produce no controls or styles. `mountGalleryControls()`
is the optional stock DOM adapter. Labels and live-position formatting belong to that
adapter. Its appearance is in `controls/style.css`, with overridable classes rather than
inline presentation. Boundary buttons remain focusable via `aria-disabled` and ignore
activation. `bindGalleryKeyboard()` is independently reusable; it leaves editing/media
and protected ARIA input controls alone.

Both pointer and keyboard navigation switch fitted frames instantly by default. The
host, overlay, close control, and application content persist between selections. The
outgoing frame remains visible while a new HD source loads. Initial opening and final
closing retain the normal reduced-motion-aware zoom.

The shadcn composition proof lives in
`examples/shadcn/tests/experimental/gallery-controls.tsx`. Its `Root`, `Previous`, `Next`,
and `Position` components render from the same controller through `useSyncExternalStore`.
React owns all navigation markup and styling; no stock gallery controls are created.
The proof uses independent sessions, native button triggers, framework-hidden source
images, Strict Mode cleanup, and unmount/remount. It is excluded from the released shadcn
example's typecheck because candidate package paths are unpublished; the root typecheck
and browser harness explicitly build and verify it against the private entries. The
current published ImageZoom implementation and registry remain unchanged.

## Target adapters, measurements and frames

`src/targets/` is internal. There is intentionally no adapter, geometry, or frame-creation
package entry. The registry starts with the existing `<img>` adapter. It preserves selected
`<picture>` sources, normal srcset/sizes attributes, clone attributes except the id,
document-scroll positioning for body rendering, and viewport positioning for native
modal rendering. Intrinsic zero-dimension fallback and the existing SVG-file sizing policy
are retained.

A target adapter supplies layout bounds, painted-content bounds, intrinsic dimensions,
and optional clipping bounds to the pure fitting function. The current image measurement
uses the same rectangle for layout and painted content. Object-fit/object-position DOM
calculations are deliberately deferred. Geometry tests cover differing painted bounds and
clipping insets so that later measurement changes have an established numerical contract.
Frames apply those results; the engine does not discover frames by testing tag names.

Resolved sources are passed explicitly into both measurement and frame creation.
Adapters have their own source type, which can later describe an SVG resource graph
instead of a URL. A frame may own a wrapper and a different content element. Future SVG
adapters can handle viewBox, preserveAspectRatio, identifier remapping and referenced
resources inside frame creation without changing the engine lifecycle. Existing SVG
files and SVG data URLs in `<img>` have explicit regression coverage. Inline `<svg>` and
SVG `<use>` support remain separate increments; this change does not attach them.

## Optional user-land gallery transitions

```ts
const renderer = dialog({
  transition: ({ incoming, outgoing, direction, signal }) => {
    const animations = incoming.map(frame =>
      frame.element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 })
    )
    signal.addEventListener(
      'abort',
      () => {
        animations.forEach(animation => animation.cancel())
      },
      { once: true }
    )
    return Promise.all(animations.map(animation => animation.finished)).then(() => undefined)
  },
})
```

The optional strategy receives only already-fitted frame surfaces, their geometry,
relative selection direction, and an abort signal. It receives no frame disposal or
geometry-mutation methods. Frame references are leased until the strategy settles or is
aborted; consumers must release their own external resources then. The engine owns
retirement of outgoing frames and completion of the opening promise. No animation
library is bundled.

Rapid selection, close, detach and session disposal cancel obsolete strategies. Late
promise settlement cannot complete an old scene. Associated Web Animations are canceled
on completion/interruption so they cannot override later closing geometry. Reduced motion
bypasses strategies and aborts a running one. A thrown/rejected strategy rejects selection
and uses normal close cleanup; a subsequent opening remains possible. Strategies run only
between selections, not during initial opening or final closing.

## Browser profiles and private packaging

V1 root, legacy dist, and pure entries retain the compat profile and ES5 implementation.
Compatibility keeps Promise, CustomEvent, scroll and keyboard fallbacks without patching
globals. The legacy no-Promise mode still runs interactions without chainable completion;
provide native promises/a polyfill when using the modern session entry. Modern modules
use ES2020 and native platform APIs. Native dialog is an additional requirement for the
modal renderer. The intended v2 default can change separately from explicit compat.

| Candidate entry              | Contents                                                        |
| ---------------------------- | --------------------------------------------------------------- |
| `core`                       | Factory, adapter/frame/geometry engine, no CSS injection        |
| `features`                   | HD, container, template, keyboard trigger adapter               |
| `session`                    | Framework-independent instance ownership and cancellation       |
| `gallery`                    | Headless state and traversal                                    |
| `controls`                   | Optional stock controls and keyboard binding                    |
| `controls/style.css`         | Optional stock gallery presentation                             |
| `renderers`                  | Native modal and optional consumer transition execution         |
| `modern` / `compat` / `pure` | Full selected profiles, retaining earlier experiment boundaries |

Every JS candidate has ESM/CommonJS and matching declarations. Packed consumer tests
cover the actual release boundary, the private fixture, Node/bundler resolution and
legacy TypeScript consumers. Adapter/geometry/frame internals are not independently
exported. Importing unused optional entries does not make their controls appear in a
rebundled consumer; size assertions check those boundaries.

## Verification, examples and measured cost

```fish
bun run build
bun run check:library
env MEDIUM_ZOOM_TEST_PORT=4390 bun tests/server.ts
```

Open `/experiments/gallery.html` for stock controls and `/composition/` for the React /
shadcn proof. The harness builds the private React page into `.cache/gallery-composition`.
Browser regressions cover both UIs, default instant switching, lifecycle races, HD source
cancellation, custom transition completion/abort/failure, focus, and accessible content.
Pure geometry tests compare current raster fitting over a range of source/viewport bounds
and test painted-content/clipping separation and zero-size cases.

Measurements use Bun’s gzip level 9 and the same installed toolchain. The exact pre-refactor
commit `c58b314` was rebuilt separately. Raw artifacts include their license banner;
consumer JS is rebundled/minified ES2020 and excludes React. CSS is shown separately;
total transfer sums the independently compressed assets. Compression
and tree shaking depend on the composition, so do not add raw module sizes to these
consumer totals.

| Raw artifact       |  Before |   After | Change |
| ------------------ | ------: | ------: | -----: |
| Core ESM           | 3,225 B | 4,052 B | +827 B |
| Compat/default ESM | 3,631 B | 4,351 B | +720 B |
| Modern full ESM    | 3,525 B | 4,339 B | +814 B |

| Selected library consumer   | JS gzip | CSS gzip | Total transfer |
| --------------------------- | ------: | -------: | -------------: |
| core                        | 4,017 B |    251 B |        4,268 B |
| core + session              | 4,623 B |    251 B |        4,874 B |
| core + dialog               | 4,857 B |    251 B |        5,108 B |
| dialog + headless gallery   | 5,233 B |    251 B |        5,484 B |
| gallery + session           | 5,783 B |    251 B |        6,034 B |
| gallery + default controls  | 6,183 B |    544 B |        6,727 B |
| accessible gallery          | 6,574 B |    544 B |        7,118 B |
| gallery + all features      | 7,229 B |    544 B |        7,773 B |
| gallery + custom transition | 5,864 B |    251 B |        6,115 B |

The headless gallery entry is **607 B gzip**, stock controls are
**724 B**, and the session entry is **788 B**.
Shared modern zoom CSS adds **251 B**; stock control CSS adds
**293 B** only when selected. Custom React controls use application
styles and an existing React runtime; those are outside this library comparison.

These boundaries have a measurable fixed cost: compat/default grows by
**720 B** despite preserving its behavior. The preparation does not retain the old
3,500 B target. Per-entry budgets and selected-consumer isolation assertions record
this explicitly. No public release manifest or browser support contract was expanded.

Manual screen-reader testing remains outstanding. Firefox cannot currently start locally
(`Could not find profile folder`); Chromium/WebKit desktop and mobile provide the automated
browser evidence. Broader SVG support is deliberately not claimed by this preparation.
