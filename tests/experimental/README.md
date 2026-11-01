# Experimental architecture and packaging

These builds and proposed import paths are unpublished prototypes. They are not
included in the release tarball and carry no public API commitment. The examples
below describe the candidate API in this fixture, not imports available from npm.

`package.json` in this directory is a private fixture manifest. `packExperimental()`
merges it with the release metadata in a temporary directory, copies the local
build outputs, and packs that fixture without modifying the release package.

- `bun run build` builds release and experimental artifacts locally.
- `bun run test:package` checks the actual release tarball, then the private fixture.
- `bun run test:size` measures the local release and experimental bundles.
- Browser tests use `/package` for the release tarball and `/experimental` for the
  private fixture. Proposed consumer/type tests live in `types/` here.

The release manifest deliberately has no export map or prototype type mappings.
Its explicit file list contains only the nine existing v1 distribution files.
Keep proposed entries in this fixture until their public surface is agreed.

## Core and optional features

The default import includes every feature and keeps the existing API. For a smaller
bundle, create a factory with only the features your application needs:

```ts
import { createMediumZoom } from 'medium-zoom/core'
import { hdImage, container, template } from 'medium-zoom/features'

import 'medium-zoom/style.css'

const mediumZoom = createMediumZoom({
  features: [hdImage(), container(), template()],
})

const zoom = mediumZoom('.image', {
  margin: 24,
  container: '#gallery',
  template: '#zoom-template',
})

zoom.update({ margin: 48 })
```

Call `createMediumZoom()` without features for basic zooming. Core includes the
instance methods, image positioning, dismissal, reduced
motion, and pinch handling. It preserves the displayed source of `<picture>` images.

| Feature           | Adds                                                                    |
| ----------------- | ----------------------------------------------------------------------- |
| `hdImage()`       | Loading `data-zoom-src` and larger `srcset` candidates when opening     |
| `container()`     | The `container` option, including coordinate options and merged updates |
| `template()`      | The `template` option and its mounting and cleanup                      |
| `accessibility()` | Bare-image keyboard triggers and shared session coordination            |
| `gallery()`       | Persistent modal browsing and position announcements                    |

Core never injects CSS. Import `medium-zoom/style.css` explicitly, or include the
stylesheet in your application's CSS build. The legacy `medium-zoom/dist/style.css`
path remains available. Both `core` and `pure` support ESM and CommonJS.

Features are fixed when the factory is created, and their order does not matter.
Each instance owns its state. `clone()` retains the factory's features; `update()`
changes options without installing or removing features. TypeScript infers the
available options from the installed features (TypeScript 5.0 or later). Importing features alone does not
inject styles, and unused feature exports can be removed by your bundler.

The package export map retains the documented legacy entry points and extensionless
file imports. Directory imports with a trailing slash must use the canonical
`medium-zoom/dist/pure` path instead.

## Browser profiles

In v1, the default and pure entries use the compatibility profile. Modern builds
require ES2020 syntax support and native `Promise`, `CustomEvent`, `scrollX` /
`scrollY`, and media-query `change` listeners. Compatibility is selected at build
time; modern bundles contain no legacy platform fallbacks or global polyfills.

| Entry                     | Profile            | Features                     | Styles          |
| ------------------------- | ------------------ | ---------------------------- | --------------- |
| `medium-zoom`             | Compat, v1 default | All                          | Injected        |
| `medium-zoom/compat`      | Compat, explicit   | All                          | Injected        |
| `medium-zoom/pure`        | Compat, v1 default | All                          | Explicit import |
| `medium-zoom/compat/pure` | Compat, explicit   | All                          | Explicit import |
| `medium-zoom/modern`      | Modern             | All                          | Injected        |
| `medium-zoom/core`        | Modern             | Selected by the factory      | Explicit import |
| `medium-zoom/features`    | Modern             | Individual feature functions | None            |

For explicit compatibility without injected CSS:

```ts
import mediumZoom from 'medium-zoom/compat/pure'

import 'medium-zoom/compat/style.css'
```

Use `medium-zoom/style.css` with core. In v1 it retains the compatibility cursor
fallbacks, as does the legacy `medium-zoom/dist/style.css` path. For CSS without
legacy fallbacks, use `medium-zoom/modern/style.css`. The explicit
`medium-zoom/compat/style.css` stylesheet stays compatible across major versions.
Legacy `dist` JavaScript entries retain v1's compatibility profile and ES5 implementation.

Compat preserves v1's behavior when native `Promise` is missing: zoom interactions
run, but the returned values do not support promise chaining. Supply a real
Promise polyfill when completion promises are needed. No global APIs are patched
by Medium Zoom.

The planned v2 default is the modern profile, including the `pure` entry. Explicit
`compat` and `compat/pure` imports retain their meaning across that switch. Core
stays CSS-free. Reduced motion, cancellation, image loading, responsive sources,
and pinch handling are supported by both profiles.

## Native dialog renderer

Use the opt-in native dialog renderer for modal focus containment, an accessible name,
a visible close button, and focus return. Import the stylesheet explicitly:

```html
<button type="button" id="enlarge" aria-label="Enlarge sunset photograph">
  <img id="sunset" src="sunset.jpg" alt="Sunset over the ocean" />
</button>
```

```js
import { createMediumZoom } from 'medium-zoom/core'
import { hdImage, container, template } from 'medium-zoom/features'
import { dialog } from 'medium-zoom/renderers'

import 'medium-zoom/style.css'

const mediumZoom = createMediumZoom({
  renderer: dialog({ closeLabel: 'Close image' }),
  features: [hdImage(), container(), template()],
})
const image = document.querySelector('#sunset')
const trigger = document.querySelector('#enlarge')
const zoom = mediumZoom(image)
trigger.addEventListener('click', () => {
  void zoom.open({ target: image, trigger })
})
```

The native button activates with Enter, Space, or a pointer. In React, Vue, or Svelte,
render the button in your component and call `zoom.open({ target: imageRef, trigger: buttonRef })`
from its click handler. Keep references to the actual elements and detach the instance
on unmount. Medium Zoom does not wrap, replace, or move your original image or trigger,
and does not add roles or keyboard listeners to framework-owned elements. An image
alone remains a pointer trigger; provide a button for keyboard access.

`dialog({ label, closeLabel })` fixes the renderer at factory creation. `label` defaults
to the image's nonempty alt text, then `"Zoomed image"`; provide a meaningful label for
decorative images and localize both labels as needed. The close button receives initial
focus. The `trigger` passed to `open()` or `toggle()` receives focus after closing;
otherwise the previously focused element is used if it remains connected. `clone()`
retains the renderer and features, with independent opening state.

The dialog uses `showModal()` and the browser's top layer. All zoomed images, HD images,
and cloned template content mount inside it, so they remain interactive while the page
is inert. A custom container controls the image's bounds; it does not become the modal's
DOM parent. The viewport host preserves geometry on scrolled pages and above stacking
contexts. Element containers retain their DOM identity when updated, rather than being
merged as coordinate objects. Avoid overriding `.medium-zoom-dialog` positioning or transforming the host.
Templates can include focusable controls; wire dismissal to `zoom.close()` so the closing
animation completes. Native `method="dialog"` form submissions also use this lifecycle. Escape, the backdrop, the zoomed image, and the
close button use the same close lifecycle. Escape's native `cancel` event is prevented until the animation
finishes, then the renderer calls `dialog.close()`. Reduced-motion styles still apply.

This option requires native `HTMLDialogElement.showModal()` (Chrome 37+, Firefox 98+,
Safari/iOS 15.4+, Chromium Edge 79+). See the [HTML dialog specification](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)
and [MDN showModal documentation](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal).
There is no automatic fallback or polyfill; unsupported browsers reject `open()` without
leaving an active session. To select the legacy renderer there, check for
`typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal === 'function'`
before passing `renderer: dialog()` to the factory. The default renderer retains legacy
browser support. Neither core nor the renderer injects the shared stylesheet. Only the
opt-in renderer creates its own scoped backdrop rule and control styles.

## Accessible gallery composition

```ts
import { createMediumZoom } from 'medium-zoom/core'
import { accessibility, gallery, hdImage, template } from 'medium-zoom/features'
import { dialog } from 'medium-zoom/renderers'

import 'medium-zoom/modern/style.css'

const zoom = createMediumZoom({
  renderer: dialog(),
  features: [accessibility(), gallery(), hdImage(), template()],
})('.gallery img', { margin: 72, template: '#caption' })
```

`accessibility()` adds Enter/Space activation to bare images, preserves authored labels
and tab order, restores attributes on detach, and coordinates independent zoom instances
through the session module below. Native button/link wrappers retain their authored
activation; call `zoom.open({ target: image, trigger: button })` from the button handler.
Prevented clicks do not activate zoom. The modal exposes enlarged content even when a
framework intentionally hides its source image from the accessibility tree.

`gallery()` uses this instance's attached images in attachment order. It adds Previous /
Next buttons, ArrowLeft / ArrowRight navigation, and a localized live position label.
Navigation stops at either end. Boundary buttons use `aria-disabled` and ignore activation
while retaining focus. Arrow keys inside editable controls and native media controls keep
their usual behavior. Both features require a modal renderer when opening.

The dialog, backdrop, close button, and gallery controls stay mounted across images.
The outgoing photograph remains visible during HD loading. Both pointer and keyboard
navigation switch immediately between already-fitted images, without replaying a
thumbnail zoom or fading between selections. Initial opening and final closing keep
the usual zoom transition and respect reduced motion.
Closing removes both incoming and outgoing images and returns focus to the original
trigger once. Each selection emits `open` / `opened` on its source; final dismissal emits
`close` / `closed` on the selected source. Navigation does not emit dismissal events for
each outgoing image. HD replacement still exposes one accessible image.

The CSS-free core still requires the explicit stylesheet. Supply your own visible
`:focus-visible` style for bare triggers; the local demo includes one. Run:

```fish
bun run build
env MEDIUM_ZOOM_TEST_PORT=4385 bun tests/server.ts
```

Then open `http://127.0.0.1:4385/experiments/gallery.html` for the maintained local example.

## Shared adapter session

The proposed `medium-zoom/session` subpath is a framework-independent extraction of the
ownership and cancellation concept in the shadcn component. It is separate from the
engine's internal per-image `Scene`. It has no React dependency and can wrap the existing
compat factory as well as the modern factory:

```ts
import { createZoomSession } from 'medium-zoom/session'

const session = createZoomSession(zoom)
await session.open({ target: image, trigger: button })
await session.close()
await session.dispose() // Cancels pending work, closes, detaches, releases listeners.
```

One active owner is coordinated per document. A later request supersedes an earlier
queued request, repeated opening/closing coalesces, and a session can reopen after an
in-flight close. `close()` waits for an existing native/legacy close lifecycle, including
Escape closes started inside core. `dispose()` makes future openings inert. A framework
adapter should keep a session in a ref and dispose it in effect cleanup; controlled
state, React commit timing, image refs, and theme resolution remain in the component.
The current shipped shadcn component keeps its existing implementation until the new
subpath is deliberately published; it cannot import an unpublished API from npm.

`accessibility()` uses the same session entry automatically. Its built feature module
imports the sibling session module, so directly loaded ESM modules and bundled consumers
share one coordinator instead of embedding separate registries. The private package has
ESM, CommonJS, and matching declarations for this subpath. Consumer tests verify Node,
bundler, legacy TypeScript, and CommonJS resolution. No separate npm package or React
runtime dependency is needed. The release manifest still publishes only the nine legacy
v1 files; all candidate entries remain private in this experiment.

## Architecture result and size

The experiment needed two genuine engine extensions: a persistent renderer host across
image scenes, and a transition hook that commits fitted content. It also exposed that
feature composition previously overwrote mount/closing hooks. Those hooks now compose
in either order, along with option updates and viewport transforms. Image loading and
image transition each have one owner; conflicting owners fail explicitly. Instance setup
lets adapters share session coordination without putting keyboard or React code in core.

Core and compat are not byte-for-byte unchanged: shared host/lifecycle scaffolding costs
some bytes. The session module, native modal implementation, keyboard adapter, gallery
controls, and gallery implementation are excluded from default/compat consumers.
`bun run test:size` measures each selected consumer and asserts this isolation, including
that unused gallery/accessibility exports and legacy fallbacks are removed.

Measurements below are gzip at level 9, with the exact architecture baseline rebuilt
from commit `7344df9` using the same installed toolchain. Raw artifacts include the license
banner; consumer bundles are rebundled/minified to ES2020 and exclude shared CSS. Do not
add the two tables together: gzip compression and tree shaking depend on the composition.

| Raw artifact         | Baseline | Experiment | Change |
| -------------------- | -------: | ---------: | -----: |
| Core ESM             |  2,577 B |    3,222 B | +645 B |
| Compat / default ESM |  3,491 B |    3,626 B | +135 B |
| Modern full ESM      |  3,277 B |    3,522 B | +245 B |

| Consumer selection          |    Gzip |
| --------------------------- | ------: |
| core                        | 3,203 B |
| core + session              | 3,711 B |
| core + dialog               | 3,861 B |
| dialog + accessibility      | 4,883 B |
| dialog + gallery            | 4,609 B |
| dialog + accessible gallery | 5,568 B |
| dialog + gallery + all      | 6,198 B |

The standalone session module is **703 B ESM / 752 B CommonJS gzip**. Its incremental
cost in the rebundled core consumer is **508 B**. The shared modern stylesheet adds
**251 B gzip**; compatibility CSS remains **258 B**. Gallery navigation has no animation and adds no animation-library dependency. Session requires native promises,
even when wrapping the compat factory.

The compat/default ESM increase is **135 B (3.9%)**. This preserves the compatibility
contract but exceeds the architecture branch's earlier 3,500 B budget; the experimental
budgets now record that cost explicitly. Core grows by **646 B** for composable setup,
persistent scenes, interactive-wrapper ownership, interruption cleanup, and the transition seam. The result demonstrates
that the capabilities compose independently, with a measurable shared-engine cost.

Manual screen-reader validation remains outstanding. Automated checks cover native modal
semantics, accessible names, background inertness, focus containment/return, cancellation,
interruption, and instant pointer/keyboard/reduced-motion switching. Native browser/assistive
technology behavior still deserves a manual pass before making this API public.
