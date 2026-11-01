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

Run `bun run generate:og` to regenerate the website sharing images and the 1280×640 GitHub social preview at `.github/social-preview.png`. Commit the generated images. To update the repository preview, upload that PNG in the repository's **Settings → General → Social preview → Edit → Upload an image**; GitHub does not pick it up from the repository automatically.

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

The Cloudflare Worker also records `Registry Component Downloaded` for successful production `GET` requests to component JSON endpoints. Configure its `ALTERTABLE_API_KEY` secret with an ingestion key for the same Altertable environment:

```sh
bunx wrangler secret put ALTERTABLE_API_KEY --config config/wrangler.jsonc
```

The Worker uses the direct HTTP ingestion API because the installed SDK manages browser identity and lifecycle. The API key selects the target environment. Events include the component, package version, path, and response status. They use the fixed source identity `medium-zoom-registry` and contain no visitor identifiers, IP addresses, user agents, or query strings. Compare weekly event counts with `Install Command Copied`; unique-user and session metrics do not apply to these downloads. Fetches may include retries, bots, and dependency resolution, so they do not prove successful installation or ongoing use.

Registry requests run through the Worker before static asset serving, including cached assets. Analytics delivery runs in the background with a two-second timeout. Delivery failures are logged without blocking downloads. Missing keys disable tracking. Preview and local domains, registry indexes, unknown component paths, non-GET requests, and responses other than 200 are excluded. Preview deployments continue to serve only static assets.

Run `bun run typecheck:registry` and `bun run test:registry` to verify the Worker types and download behavior without sending real analytics events.
