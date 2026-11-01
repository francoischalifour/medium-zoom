# Packaging and release proposal

Keep **one npm package**, `medium-zoom`, with opt-in subpath exports. Give each capability
an API matching its responsibility. Separate npm packages would add version coordination
without reducing the selected browser bundle.

This remains a **private candidate fixture**. The public release manifest still ships
only the existing v1 distributions/types, with no new exports or type mappings. The code
and measurement work does not publish a release or migrate the public shadcn registry.

## Proposed export menu

| Export                  | Responsibility                              | API                                                            | CSS                                   |
| ----------------------- | ------------------------------------------- | -------------------------------------------------------------- | ------------------------------------- |
| `medium-zoom`           | Compatibility preset                        | Existing `mediumZoom(images, options)`                         | Injected, unchanged delivery          |
| `medium-zoom/core`      | Direct instance API and lifecycle contracts | `createZoom(images, config)`                                   | Explicit candidate `modern/style.css` |
| `medium-zoom/loaders`   | Loading strategy                            | `loadHdImage`                                                  | None                                  |
| `medium-zoom/viewport`  | Measurement strategy                        | `containerBounds(target)`                                      | None                                  |
| `medium-zoom/content`   | Renderer content helper                     | `templateContent(template)`                                    | Application styles                    |
| `medium-zoom/triggers`  | Bare-image DOM binding                      | `bindZoomTriggers(zoom)` returns unbind                        | Application focus indication          |
| `medium-zoom/renderers` | Modal rendering/focus lifecycle             | `dialog({ content, transition })`                              | Internal modal/backdrop mechanics     |
| `medium-zoom/session`   | Ownership/request coordinator               | `createZoomSession(zoom)`                                      | None                                  |
| `medium-zoom/gallery`   | Navigation controller and keyboard binding  | `createGallery(zoom)`, `bindGalleryKeyboard(element, gallery)` | None                                  |

These are module exports, not a universal feature-installation system. The `/features`
barrel and `createMediumZoom` factory are removed from the private experiment. No entry
creates close/navigation buttons, live-position UI or control styles. The renderer exposes
host/close actions through its content slot; applications supply visible close controls,
initial focus and their own markup. Native `method="dialog"` forms can close normally.

Strategies are fixed at construction. `zoom.update()` handles core options; it does not
replace strategies or turn helpers into mutable options. Gallery/session own ongoing
state; bindings own subscriptions/listeners and return cleanup. Cloning retains strategies
and options but requires new application-owned bindings/controllers.

Target adapters, pure geometry, frame creation and mutable scene state remain internal.
Loader/frame-transfer and transition surfaces are still private candidate contracts.

## Compatibility and migration

Keep root and historical `dist/*` paths stable. Their legacy container/template updates,
body templates and close fade, module resolution and browser fallbacks remain supported
by private adapters over the shared engine. New composition consumers use explicit
viewport strategies and renderer-owned content instead of legacy options.

`templateContent` preserves authored presentation and removes content on renderer disposal;
it supplies no automatic close fade. This is a deliberate modern ownership change. The
compatibility preset retains its former fade. Native/framework controls can omit trigger
binding; authored interactive images and wrappers retain their own activation.

The fixture also builds `compat`, `compat/pure`, `modern` and `pure` for platform/CSS
comparisons. They are presets/aliases, not extensions. Modern means platform syntax/APIs,
not automatic dialog/gallery. Resolve redundant aliases before a public release: keep
one canonical pure path and a modern preset only where a real consumer needs it, preserving
historical compatibility aliases. Do not switch an existing root path's browser contract
in a minor release. Evaluate the new API through a v2 prerelease while keeping v1 supported.

## Measure three separate costs

- **npm download/install:** all physical distributions, declarations, CSS and docs in
  `files`. `bun run test:package` measures actual packed release/candidate archives.
- **Raw entry gzip:** ESM/CJS/UMD artifact budgets. Enforce 3,800 B for both core formats;
  explicit CSS remains separate.
- **Selected browser transfer:** real imports rebundled/minified together, with required
  CSS counted once. `bun run test:size` prints capabilities, marginal costs and comparisons
  against `bundle-baseline.json` at `53e96a2`. The rebundled core also has a 3,800 B ceiling.

Do not sum independent module gzip values. Injected CSS is already in JS; explicit CSS
is a separate asset. App UI/styles and React are excluded; the custom-transition example
includes its application strategy. Template-bearing rows whose ownership changed are not
presented as equivalent before/after savings. The report also shows the legacy preset
increase from stronger shared lifecycle guards instead of hiding that cost.

## React / shadcn and release sequence

Keep React components as registry/application source importing the same session/gallery
and strategy modules. The runtime has no React dependency or control styling. The private
composition proof verifies Strict Mode, unmount/remount, navigation, focus and shared
ownership; the published registry has not yet been changed.

1. Stabilize the private strategy, binding and controller contracts with packed ESM/CJS,
   TypeScript and real browser consumers. Keep the comparison baseline reproducible.
2. Agree on canonical exports, browser baseline and prerelease compatibility. Remove
   redundant experimental presets from the proposed public manifest.
3. Prepare the real manifest, migration docs, registry adaptation and changelog together.
   Review npm archive growth and selected browser costs independently.
4. Publish only with explicit release authorization, then verify the prerelease from npm
   before promoting it. Measurement/build commands never publish.
