# Medium Zoom VitePress Example

This example extends the default VitePress theme to zoom every image in the page content, including after client-side navigation.

[![Edit VitePress Example](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/github/francoischalifour/medium-zoom/tree/main/examples/vitepress?file=/docs/.vitepress/theme/index.ts)

## Local package development

From the repository root, build the website and its examples against the local package:

```sh
bun install --frozen-lockfile
bun run examples
```

Then open <http://127.0.0.1:4173/examples/vitepress/>.

## Standalone usage

This folder also runs independently against the published package:

```sh
npm install
npm run dev
```
