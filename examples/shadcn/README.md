# Medium Zoom for shadcn/ui

Editable React integration for medium-zoom. See the [React quickstart](https://medium-zoom.francoischalifour.com/docs/react/) for usage and the [component reference](https://medium-zoom.francoischalifour.com/docs/reference/react/image-zoom/) for props.

## Install

From a project configured for shadcn/ui:

```sh
npx shadcn@latest add https://medium-zoom.francoischalifour.com/r/image-zoom.json
```

The registry installs the component, stylesheet, and medium-zoom dependency. Use `ImageZoom` for a single image or compose `Root`, `Trigger`, and `Image`.

## Development

From the repository root:

```sh
bun install --frozen-lockfile
bun run build
bun run dev:example shadcn
```

The standalone playground uses shared photos from `assets/images/`. To develop the public React integration page instead, run `bun run dev:website`; its source is `website/src/ReactPage.tsx`.

## Registry and verification

`registry.json` points to the component source in this example. `bun run build:registry` generates the published JSON in `website/public/r/`, with the medium-zoom version derived from the root package manifest.

```sh
bun run test:browser shadcn --project=chromium
bun run test:rsc
```

The browser tests cover interaction, hydration, and lifecycle behavior. The Next.js App Router fixture verifies React Server Component integration.
