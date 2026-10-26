# Medium Zoom website

React product pages and MDX documentation for [medium-zoom.francoischalifour.com](https://medium-zoom.francoischalifour.com).

## Development

From the repository root:

```sh
bun install --frozen-lockfile
bun run build
bun run dev:website
```

Build and preview the complete site:

```sh
bun run build:website
bunx vite preview --config config/vite.website.config.mts --host 127.0.0.1 --port 5290
```

## Source

- `src/` owns the shared UI and product pages.
- `src/docs/` contains authored MDX and live examples; `pages.ts` defines routes and metadata.
- `build/` handles prerendering, syntax highlighting, and shared HTML templates.
- `public/_redirects` defines moved routes for Cloudflare, local development, and preview.

Generated documentation entries in `website/docs/` and build output in `website/dist/` are ignored. Run `bun run build:demo` to regenerate highlighted snippets after changing code samples.

The installable React component and registry source live in `examples/shadcn/` and `registry.json`.

## Verification

```sh
bun run build:website
bun run test:docs
bun run test:seo
bun run test:analytics
```

## Analytics

Set `VITE_ALTERTABLE_API_KEY` in the root `.env.local` or build environment to a public Altertable browser ingestion key. Never use an admin credential: Vite embeds this value in browser code.

Anonymous tracking runs only on the production domain. It records pageviews, successful command/code copies, opened images, and outbound links. The library and installable component contain no tracking. Analytics tests intercept ingestion requests.
