# Medium Zoom SVG Data URL Example

[![Edit SVG Data URL Example](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/github/francoischalifour/medium-zoom/tree/main/examples/svg-data-url?file=/src/index.js)

A checkout flow rendered from SVG markup as an image data URL. Click to zoom; click again or press Escape to close.

See [the SVG guide](https://medium-zoom.francoischalifour.com/docs/guides/generated-svg/) for sizing, image constraints, and React integration.

## Local package development

From the repository root:

```sh
bun install --frozen-lockfile
bun run build
bun run dev:example svg-data-url
```

Run `bun run dev` in another terminal to watch library changes.

## Standalone usage

This folder also runs independently against the published package:

```sh
npm install
npm run dev
```
