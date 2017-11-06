# Demo

> Source code for the [Medium Zoom Demo](https://medium-zoom.francoischalifour.com).

![Preview](https://user-images.githubusercontent.com/6137112/32421106-dddf0566-c262-11e7-9917-a164d992384c.png)

## Production

The root [`index.html`](index.html) is the demo file. It contains the [production version](https://unpkg.com/medium-zoom@0/dist/medium-zoom.min.js) of library. The *medium-zoom* code is in [`demo.js`](demo.js).

## Development

If you're developing, you want to open [`development/index.html`](development/index.html), which contains the [development version](../../dist/medium-zoom.min.js) of *medium-zoom* (which is watched with `npm run dev`).

To learn more about how to contribute, please [see the dev instructions](../../README.md#dev).

## Preview

The preview folder gets the [library](preview/medium-zoom.min.js) overriden with a build version on deploy. This process is automated with [Netlify](https://www.netlify.com/) to check if pull requests work as expected. You shouldn't need to access to the [preview version](preview/index.html) of the demo yourself.
