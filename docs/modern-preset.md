# Modern preset contract

This is the v2 candidate contract, not a published release. The v1 root package and its historical distributions retain the optimized artifacts from merged PR #310; this preview setup does not change them. No preview has been published by this setup.

## One package, two presets

The preview manifest selects `modern` once: root JavaScript, CommonJS, declarations, `/pure`, and `/style.css` all follow that choice. Explicit `/modern`, `/modern/pure`, `/compat`, and `/compat/pure` remain available. Compatibility is a preset contract, not a runtime browser test. Normal v1 releases still select the historical root artifacts; they never inherit the preview manifest.

| Contract                       | Modern                                              | Compat                            |
| ------------------------------ | --------------------------------------------------- | --------------------------------- |
| Browser platform               | Native APIs, no legacy fallbacks                    | Historical v1 support             |
| Image zoom and HD loading      | Included                                            | Included                          |
| Presentation                   | Native dialog, keyboard triggers, focus restoration | Historical overlay                |
| Styles                         | Structural CSS; no gallery theme or stock controls  | Historical v1 CSS                 |
| State                          | Immutable snapshot and subscription                 | Historical methods and DOM events |
| Container and template options | Compose using viewport/content modules              | Included                          |

HD loading is part of the main experience: `data-zoom-src` and responsive image sources load automatically. The low-resolution preview opens without waiting for HD. A native dialog provides modal semantics; triggers support clicks, Enter and Space. Escape, backdrop activation and closing restore focus. Accessible image text comes from the source image's `alt`.

The controller is smaller in public surface, not a claim of fewer bytes than v1. On the PR #310 engine split, the injected modern ESM artifact is about 6.5 kB gzip, including HD, modal accessibility and activation bindings; the optimized v1 ESM artifact is about 3.4 kB. The separate modern stylesheet is about 364 bytes gzip. Separately compressed pure JavaScript plus CSS costs slightly more overall than injected CSS; the size guard allows at most 3% overhead. Gallery controls, gestures and theme inference remain optional and are not included in the modern preset.

The modern preset composes the public factories from `/core`, `/loaders`, `/renderers` and `/triggers`. The v1 engine remains independent in `src/preset/`; the removed shared legacy/composed engine and `__PRESET__` switch are not restored. Modern builds omit legacy DOM event dispatch, while independently composed core builds retain their existing event contract. Trigger bindings observe attachment state and skip reconciliation when the attached image list has not changed.

## Small controller

```ts
import mediumZoom from 'medium-zoom'

const zoom = mediumZoom('[data-zoomable]', { margin: 24 })
const unsubscribe = zoom.subscribe(() => {
  console.log(zoom.getSnapshot().status)
})

await zoom.open(document.querySelector<HTMLImageElement>('[data-zoomable]')!)
await zoom.close()
unsubscribe()
zoom.destroy()
```

The controller exposes only `open(target?)`, `close()`, `attach(...images)`, `detach(...images)`, `update(options)`, `getSnapshot()`, `subscribe(listener)` and `destroy()`. Commands do not return chainable instances; opening and closing resolve to `void`. State contains `status`, `image` (nullable) and a readonly `images` collection. Subscriptions return cleanup functions. Destroy is idempotent, unbinds triggers and subscriptions, detaches images and closes any presentation; subsequent attach/open calls do nothing. An optional creation-time `signal` provides the same cleanup.

Options are `margin`, `background`, `scrollOffset` and creation-time `signal`. Unlike v1, the first argument is always the images, not an options-object overload. `open(image)` replaces the v1 `{ target }` argument. There are no `clone`, `toggle`, `getOptions`, `getImages`, `getZoomedImage`, `on` or `off` methods, and this preset dispatches no legacy `medium-zoom:*` DOM events. Use snapshots instead. The advanced `/core` contract remains available for application-owned composition; it is not the default controller's superclass or a cast-only public facade.

## Structural, modern CSS

The modern preset has its own authored stylesheet, not a prefix-stripped v1 stylesheet. It uses the `medium-zoom` cascade layer, low-specificity selectors, `inset`, native zoom cursors and custom properties. Only opacity and transform animate. Promotion is limited to active frames; source images do not get persistent animation hints. The transform transition deliberately overrides transitions copied from source-image inline styles; reduced motion disables every transition, including leaving frames. Focus-visible outlines are preserved.

The default backdrop is the native `Canvas` color, not inferred from page themes. There are no automatic light/dark palettes, themed controls, counters, button radii or decorative shadows. Applications can supply `background`, or define `--medium-zoom-backdrop`, `--medium-zoom-duration` and `--medium-zoom-easing` on the document or dialog host. Normal unlayered application rules override the library's normal layered rules. Do not disable keyboard focus indicators.

```ts
import mediumZoom from 'medium-zoom/pure'
import 'medium-zoom/style.css'
```

Pure entries never inject styles. Explicit pairing works independently of the root preset: `/modern/pure` with `/modern/style.css`, or `/compat/pure` with `/compat/style.css`. Do not mix modern and compat styles on the same page: they share image class names but have different contracts. Gallery controls and their optional `/gallery/style.css` theme remain separate; the combined `/gallery.css` file is for composed gallery examples, not the default preset.

## Browser and release gates

The modern platform target is Chrome/Edge 99, Firefox 98 and Safari/iOS 15.4, including native CSS cascade layers. Native dialog, AbortController, Promises and animation APIs are required. No polyfill is injected. Test the packed preview in current Chromium, Firefox and WebKit, mobile layouts, keyboard focus, reduced motion, HD success/failure, dynamic attachment and teardown. CI on current browsers does not prove historical minimum-browser support.

See [Preview releases](preview-release.md) for the manual publication procedure and [Maintainer triage](maintainer-triage.md) for conditional issue testing. Candidate availability is not a stable fix or permission to close an issue. Publication still requires explicit authorization and registry trusted-publisher/environment setup.
