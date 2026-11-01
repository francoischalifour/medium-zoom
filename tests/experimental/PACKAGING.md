# Packaging proposal

Ship one npm package, `medium-zoom`, with opt-in subpath exports. Treat session,
gallery and renderers as separately importable modules of that package.
Do not create separate npm packages for them: they share the zoom lifecycle and versioned
contracts, and a separate package would not reduce the selected browser bundle.

This is a proposal exercised by a **private package fixture**, not a published API or
release authorization. The current release manifest still contains only the existing v1
files. `modern` currently describes browser syntax/platform assumptions, not a preset
that turns on dialog, accessibility or gallery.

## Three different costs

- **npm tarball / installed bytes:** every distribution, declaration and stylesheet
  included in `files`. Adding exports can grow this download without growing an app bundle.
- **Raw entry gzip:** one independently compiled ESM/CJS/UMD artifact. Useful for budgets;
  adding these numbers does not predict a consumer bundle.
- **Selected consumer JS + CSS:** imports rebundled and tree-shaken together, with each
  required stylesheet counted once. This is the relevant browser transfer comparison.
  React, application CSS and app-owned transition code are extra; the transition example
  row explicitly includes its own strategy.

`bun run test:size` prints an export inventory, then complete consumer compositions with
JS, separate CSS, combined transfer and a named comparison row. `bun scripts/check-size.ts
--artifacts` adds physical-file budgets. `bun run test:package` reports actual tarball and
installed sizes for both manifests and verifies their packed consumers.

## Export responsibilities

| Proposed export         | Category                      | What a consumer gets                                                      | Requirements / CSS                                                            |
| ----------------------- | ----------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `medium-zoom`           | compatibility preset          | engine + HD, container, template; CSS injected                            | preserve v1 imports and behavior                                              |
| `medium-zoom/core`      | engine and factory            | lifecycle, target frames and positioning                                  | explicit `modern/style.css`; no optional features                             |
| `medium-zoom/features`  | tree-shaken feature factories | `hdImage`, `container`, `template`, `accessibility`                       | select factories in `createMediumZoom`; accessibility requires modal renderer |
| `medium-zoom/renderers` | modal renderer                | `dialog`, focus/inertness, optional transition strategy                   | install through factory; native dialog support                                |
| `medium-zoom/session`   | headless coordinator          | `createZoomSession`, document ownership and cancellation                  | install on an existing zoom; no CSS or renderer dependency                    |
| `medium-zoom/gallery`   | headless controller           | `createGallery`, selection/subscriptions and opt-in `bindGalleryKeyboard` | existing zoom with modal selection capability; no CSS                         |

The session is shipped as `medium-zoom/session`; consumers do not need accessibility or
application controls to use it. Gallery can work without session for one instance. Installing
session routes pointer, keyboard and framework calls through the same coordinator and
arbitrates multiple instances.

The feature barrel is not a monolithic installed plugin. Unselected factories tree-shake
out; the matrix verifies their absence. More per-feature entry points are unnecessary
unless a supported bundler cannot achieve this isolation.

Target adapters, pure geometry, rendered-frame creation and mutable scene state remain
internal, with no export contract. Consumer transitions receive leased prepared-frame
surfaces and cancellation, not engine disposal methods. No animation dependency ships.

## Headless UI and the core ceiling

There is no `controls` export or stylesheet and no automatic dialog close button.
`dialog({ content })` exposes the host, zoom instance and close action; applications
supply a visible close control, initial focus and navigation/announcement UI. Vanilla
and React examples demonstrate that ownership outside the packed runtime. Keep focus
containment, inertness, Escape and focus return with the renderer.

`bindGalleryKeyboard` lives alongside the gallery controller and tree-shakes independently.
The size matrix measures it as a separate capability. Do not include it in core or add
framework presentation dependencies to the package.

Enforce **3,800 B gzip** for each raw core module format and the rebundled ESM core
consumer, with CSS separate. Raw ESM is **3,754 B**, CommonJS **3,791 B**; the ESM consumer
is **3,729 B**. New features must preserve that ceiling. Modal activation rules, replacement
transition styling and application transition descriptors belong to the optional renderer;
the engine retains loading, interruption, completion and frame disposal.

## Compatibility and preset policy

Keep the root and historical `dist/*` paths stable. Preserve their existing module
resolution and browser support contract while the new subpaths target the documented
modern platform. New exports have explicit ESM/CJS declaration mappings and CSS side-effect
metadata; core/controller modules remain free of CSS injection.

The fixture currently also builds `compat`, `compat/pure`, `modern` and `pure` to compare
platform and CSS delivery choices. These are **presets or aliases**, not extensions.
`compat` duplicates the root preset; `pure` currently duplicates `compat/pure`. Do not
turn all experimental aliases into a permanent public menu. Before release, retain one
canonical pure path and one documented modern preset only if there is a real consumer;
keep existing historical paths as compatibility aliases. The matrix deliberately labels
these paths private rather than implying they are published today.

Do not change the root default to the modern profile in a minor release. Evaluate a v2
prerelease for the new composition surface and browser requirements, keeping v1 supported.
Changing what an existing path means requires its own compatibility decision.

## React / shadcn delivery

Keep the React compound components as registry/application source that imports the same
session and gallery subpaths. The runtime package does not depend on React and does not
bundle those components. Applications own their controls, styles and transition strategy;
the runtime creates no control markup or control styles. The private composition proof exercises this split, but
this change does not yet migrate the published shadcn registry component.

## Release sequence

1. Keep the candidate manifest private while adapter, session and transition contracts
   stabilize. Test packed ESM/CJS/TypeScript consumers and selected-feature isolation.
2. Agree on the canonical export list, browser baseline and v2 prerelease contract.
   Remove redundant experimental presets from the proposed public manifest.
3. Prepare the actual release manifest, migration docs, registry adaptation and changelog
   together. Compare tarball growth and browser compositions against this baseline.
4. Publish only after explicit release authorization. Test the prerelease from npm before
   promoting it to stable. No publication is performed by these build or measurement scripts.
