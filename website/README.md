# Medium Zoom website

> Source code for the [Medium Zoom website](https://medium-zoom.francoischalifour.com).

Both product pages are React + TypeScript: `/` introduces the library and `/examples/shadcn/` documents the installable React integration. Vite builds them together; the same app is prerendered into each HTML response and hydrated by one shared browser entry.

## API stories

📚 The API catalogue is available at [medium-zoom.francoischalifour.com/storybook](https://medium-zoom.francoischalifour.com/storybook).

## Development

From the repository root:

```sh
bun install --frozen-lockfile
bun run build
bun run dev:website
```

To preview both pages and their navigation together, build the complete site and serve it from one local origin:

```sh
bun run build:website
bunx vite preview --config config/vite.website.config.mts --host 127.0.0.1 --port 5290
```

The website owns its UI in `website/src/`. `App.tsx` composes the shared header, hero, installation controls, footer, and page content. Theme and package-manager preferences have one implementation each. Both pages share locally bundled Geist fonts, styles, and browser code.

`website/index.html` and `website/examples/shadcn/index.html` retain their page-specific search and sharing metadata. `website/build/prerender.ts` renders both through the same React app used by the browser. The small theme initializer in each head runs before paint to prevent a theme flash.

The component source and independently runnable playground remain in `examples/shadcn/`. Building examples adds its playground without replacing the website-owned integration page.

## Code samples and site details

`website/src/gallery.ts` owns the image metadata and copyable code samples. Vanilla cards show HTML image markup; the usage section initializes all images with `[data-zoomable]`. The Vite `website/build/site-highlights.ts` plugin generates `highlighted-snippets.json` with Pierre Highlights during builds. Both prerendering and hydration consume that same markup, with no highlighter or WebAssembly runtime shipped to the browser. Regenerate it with `bun run build:demo` after editing snippets.

The header’s star count is an API-verified snapshot in `site-data.ts`, rendered by the shared React header. The shadcn mark comes from the [official icon source](https://github.com/shadcn-ui/ui/blob/main/apps/v4/components/icons.tsx). Native CSS squircles enhance supported browsers; rounded corners remain the fallback.

## Analytics

The library and shadcn pages share one deferred Altertable JavaScript client. Tracking runs only in a production build served from `https://medium-zoom.francoischalifour.com` with `VITE_ALTERTABLE_API_KEY` configured. Localhost, preview hosts, and builds without a key do not initialize analytics. The distributed library and installable `ImageZoom` component contain no tracking.

Copy the root `.env.example` to `.env.local` and set a dedicated **public browser ingestion key** for the desired Altertable environment. The website build reads that root environment file. For CI builds, supply the same variable through the build environment. Vite embeds this value in browser code: never use an admin, personal, or lakehouse credential. The key selects the environment in SDK 1.4; there is no environment-name override.

Visitors remain anonymous. The SDK owns anonymous identity, sessions, batching, retries, and automatic pageviews. As on francoischalifour.com, the client initializes with tracking consent granted. Every event includes `site: medium-zoom`, `page: library | shadcn`, `path`, and `title`. Hash-only navigation does not create additional pageviews.

| Event                    | When it fires                             | Properties                                    |
| ------------------------ | ----------------------------------------- | --------------------------------------------- |
| `$pageview`              | Once per page load                        | Shared context                                |
| `Install Command Copied` | Clipboard write succeeds                  | `package_manager`                             |
| `Code Copied`            | Usage or example clipboard write succeeds | `snippet`, and for examples `example`, `rail` |
| `Image Zoomed`           | The library emits `medium-zoom:opened`    | `image`, `rail`                               |
| `Outbound Click`         | An external HTTP(S) link is activated     | `destination` (origin and path), `placement`  |

Copied commands measure intent, not completed installs. Analytics errors must not affect copy feedback or zoom. No theme, scroll-depth, or rail-navigation events are collected.

Run `bun run test:analytics`. These tests build an isolated site with a dummy ingestion key, exercise the real SDK and browser clipboard permissions, and intercept the external ingestion endpoint. They do not send events to Altertable. The same suite runs in CI.

## Search and sharing

Both product pages ship prerendered content, their own canonical URL, title and description, Open Graph and Twitter metadata, and JSON-LD describing the actual project. The public sitemap lists both pages. The component playground is marked `noindex`. Large image previews are allowed.

Run `bun run test:seo` to check the built responses with JavaScript disabled, including metadata, crawler access, and internal links. Lighthouse SEO audits on 2026-10-26 scored 100/100 on both local product pages. This verifies the build, not production indexing; indexing can be checked in Search Console after deployment.

## License

MIT © [François Chalifour](https://francoischalifour.com)
