# Medium Zoom website

The product pages and documentation for [medium-zoom.francoischalifour.com](https://medium-zoom.francoischalifour.com), built with React and MDX.

## Develop

From the repository root:

```sh
bun install --frozen-lockfile
bun run dev:website
```

The development server imports the library source directly. `dev:website` builds the package once for the bundle-size metadata displayed on the site; later library edits update the preview without rebuilding.

To preview the complete site, including stories and examples:

```sh
bun run build:website
bunx vite preview website --host 127.0.0.1 --port 5290
```

## Find the source

- `src/` contains the shared UI and product pages.
- `src/docs/` contains MDX guides, API references, and live examples. `pages.ts` defines their routes and metadata.
- `build/` handles prerendering, syntax highlighting, and shared HTML templates.
- `public/_redirects` preserves moved website URLs in production, local development, and preview.
- `build/site-headers.ts` generates `_headers`: each Markdown copy names its HTML page as canonical, and `llms.txt`, examples, and Storybook stay out of search indexes.

The installable React component lives in `examples/shadcn/`. The root `registry.json` defines its registry entry. See the [component development guide](../examples/shadcn/README.md) for its build and verification commands.

Documentation search uses [Docspot](https://github.com/francoischalifour/docspot) for the dialog and MiniSearch for the index. `src/site-search.tsx` configures it: the trigger, actions such as copying install commands and switching the theme, the pages listed before typing, and ChatGPT and Claude handoffs. The index and the preview load once the page is idle or when the trigger is hovered, focused, or used. The preview shows the prerendered page at the matched section, so it falls back to the matched passage in development.

The docs plugin indexes each page introduction and section’s prose, headings, and prop names. Tune aliases, field weights, and typo tolerance in `src/docs-search-index.ts`. Docspot is themed with the site's tokens in `src/site-search.css`.

## Generated files

`bun run build:website` builds the library and regenerates documentation entries, the React registry, and the complete site. Highlighted code snippets, page Markdown, `llms.txt`, `sitemap.xml`, and `robots.txt` are generated from the site's sources during development and builds, with no checked-in copy. Edit the source rather than generated output:

- `website/docs/` contains generated documentation entry pages and is ignored by Git.
- `website/dist/` contains the built site and is ignored by Git.
- `website/public/r/` contains the generated React registry.

Run `bun run update:downloads` to refresh the committed npm download snapshot. The browser adds newer reported days on page load and keeps the snapshot if npm is unavailable.

Run `bun run generate:og` to regenerate the website sharing images and the 1280×640 GitHub social preview at `.github/social-preview.png`. Commit the generated images. To update the repository preview, upload that PNG in the repository's **Settings → General → Social preview → Edit → Upload an image**; GitHub does not pick it up from the repository automatically.

## Add a page

1. Write the MDX page in `src/docs/`. Keep it to one task or reference topic, explain prerequisites before commands, use complete examples, and link to existing explanations instead of repeating them.
2. Add its route and metadata to `src/docs/pages.ts`. The sitemap follows from it.
3. Include it in `tests/browser/website-docs.spec.ts`.
4. Add aliases for the URL without a trailing slash and for `index.html` in `public/_redirects`.
5. Run `bun run generate:og` to create its sharing image.

## Verify changes

Build the site before checking documentation, metadata, and analytics:

```sh
bun run build:website
bun run test:browser website
```

`bun run typecheck` compiles authored JavaScript and TSX snippets against the public API. The website suites check rendered pages, navigation, links, metadata, and live examples in Chromium, Firefox, and WebKit. To add a page, see [Add a page](#add-a-page).

## Deploy

Cloudflare Workers Builds deploys `main` with two commands set in its dashboard:

- Build: `bun install --frozen-lockfile && bun run build:website`
- Deploy: `bun run deploy:website`

Renaming either script breaks deploys until the dashboard is updated.

## Analytics

Set `VITE_ALTERTABLE_API_KEY` in `website/.env.local` (see `website/.env.example`) or the build environment to a public Altertable browser ingestion key. Vite embeds this value in browser code, so never use an admin credential.

Tracking runs only on the production domain and uses Altertable's audience mode, which stores nothing in the browser and sends no visitor identifiers. It records pageviews, searches, successful command and code copies, opened images, and outbound links. The library and installable component contain no tracking. Analytics tests intercept ingestion requests.

The Cloudflare Worker records `Registry Component Downloaded` in audience mode for successful production component downloads. Set its `ALTERTABLE_API_KEY` secret to an ingestion key for the same Altertable environment:

```sh
bunx wrangler secret put ALTERTABLE_API_KEY --config website/wrangler.jsonc
```

These events count downloads, including retries and bots, rather than unique users or confirmed installs. Analytics failures do not block downloads.
