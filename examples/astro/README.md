# Medium Zoom Astro Example

This example creates a `<ZoomableImage>` component that optimizes the image with Astro and attaches the zoom in the browser.

[![Edit Astro Example](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/github/francoischalifour/medium-zoom/tree/main/examples/astro?file=/src/components/ZoomableImage.astro)

## Local package development

From the repository root, build the website and its examples against the local package:

```sh
bun install --frozen-lockfile
bun run examples
```

Then open <http://127.0.0.1:4173/examples/astro/>.

## Standalone usage

This folder also runs independently against the published package:

```sh
npm install
npm run dev
```
