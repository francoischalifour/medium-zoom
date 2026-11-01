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

| Feature       | Adds                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| `hdImage()`   | Loading `data-zoom-src` and larger `srcset` candidates when opening     |
| `container()` | The `container` option, including coordinate options and merged updates |
| `template()`  | The `template` option and its mounting and cleanup                      |

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
