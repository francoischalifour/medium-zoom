# Medium Zoom Video Example

Zoom a poster image, then play a video in the same bounds using Medium Zoom events.
See [the integration guide](https://medium-zoom.francoischalifour.com/docs/guides/video/) for the lifecycle and limitations.

## Local package development

From the repository root:

```sh
bun install --frozen-lockfile
bun run build
bun run dev:example video
```

Run `bun run dev` in another terminal to watch library changes.

## Standalone usage

This folder also runs independently against the published package:

```sh
npm install
npm run dev
```

## Sample media

[`flower.mp4`](https://mdn.github.io/shared-assets/videos/flower.mp4) is the MDN
video element sample, available under [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
The poster is its opening frame, exported as a JPEG.
