# Medium Zoom website

The product pages and documentation for [medium-zoom.francoischalifour.com](https://medium-zoom.francoischalifour.com), built with React and MDX.

## Develop

From the repository root:

```sh
bun install --frozen-lockfile
bun run build
bun run dev:website
```

The development server imports the library source directly. The initial package build supplies the bundle-size metadata displayed on the site; subsequent library edits update the preview without rebuilding.

To preview the complete site, including stories and examples:

```sh
bun run build:website
bunx vite preview --config config/vite.website.config.mts --host 127.0.0.1 --port 5290
```

## Find the source

- `src/` contains the shared UI and product pages.
- `src/docs/` contains MDX guides, API references, and live examples. `pages.ts` defines their routes and metadata.
- `build/` handles prerendering, syntax highlighting, and shared HTML templates.
- `public/_redirects` preserves moved website URLs in production, local development, and preview.

The installable React component lives in `examples/shadcn/`. The root `registry.json` defines its registry entry. See the [component development guide](../examples/shadcn/README.md) for its build and verification commands.

Documentation search uses MiniSearch, loaded when the command palette opens. The docs plugin indexes each page introduction and section’s prose, headings, and prop names. Tune aliases, field weights, and typo tolerance in `src/docs-search-index.ts`.

## Generated files

`bun run build:website` builds the library and regenerates documentation entries, highlighted snippets, the React registry, and the complete site. Edit the source rather than generated output:

- `website/docs/` contains generated documentation entry pages and is ignored by Git.
- `website/dist/` contains the built site and is ignored by Git.
- `website/src/highlighted-snippets.json` contains generated syntax highlighting for product-page and documentation code samples.
- `website/public/r/` contains the generated React registry.

Run `bun run update:downloads` to refresh the committed npm download snapshot. The browser adds newer reported days on page load and keeps the snapshot if npm is unavailable.

## Verify changes

Build the site before checking documentation, metadata, and analytics:

```sh
bun run build:website
bun run test:docs
bun run test:seo
bun run test:analytics
```

The documentation checks compile authored JavaScript and TSX snippets against the public API, then check rendered pages, navigation, links, and live examples in Chromium, Firefox, and WebKit. See [Write documentation](../CONTRIBUTING.md#write-documentation) for page registration and editorial guidance.

## Analytics

Set `VITE_ALTERTABLE_API_KEY` in the root `.env.local` or build environment to a public Altertable browser ingestion key. Vite embeds this value in browser code, so never use an admin credential.

Anonymous tracking runs only on the production domain. It records pageviews, successful command and code copies, opened images, and outbound links. The library and installable component contain no tracking. Analytics tests intercept ingestion requests.
