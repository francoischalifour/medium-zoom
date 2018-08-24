<p align="center">
  <a href="https://medium-zoom.francoischalifour.com"><img src="logo.svg" alt="Demo" width="64"></a>
  <h3 align="center">medium-zoom</h3>
  <p align="center">A JavaScript library for zooming images like Medium</p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/medium-zoom">
    <img src="https://img.shields.io/npm/v/medium-zoom.svg?style=flat-square" alt="version">
  </a>
  <a href="https://github.com/francoischalifour/medium-zoom/blob/master/LICENSE">
    <img src="https://img.shields.io/npm/l/medium-zoom.svg?style=flat-square" alt="MIT license">
  </a>
  <a href="http://npmcharts.com/compare/medium-zoom">
    <img src="https://img.shields.io/npm/dm/medium-zoom.svg?style=flat-square" alt="downloads">
  </a>
  <br>
  <a href="https://unpkg.com/medium-zoom/dist/">
    <img src="http://img.badgesize.io/https://unpkg.com/medium-zoom/dist/medium-zoom.min.js?compression=gzip&label=gzip%20size&style=flat-square" alt="gzip size">
  </a>
  <a href="https://travis-ci.org/francoischalifour/medium-zoom">
    <img src="https://img.shields.io/travis/francoischalifour/medium-zoom.svg?style=flat-square" alt="travis">
  </a>
  <a href="https://github.com/francoischalifour/medium-zoom/blob/master/package.json">
    <img src="https://img.shields.io/badge/dependencies-none-lightgrey.svg?style=flat-square" alt="no dependencies">
  </a>
</p>

<p align="center">
  <a href="https://medium-zoom.francoischalifour.com">
    <img src="https://user-images.githubusercontent.com/6137112/43369906-7623239a-9376-11e8-978b-6e089be499fb.gif" alt="Medium Zoom Demo">
  </a>
  <br>
  <br>
  <strong>
  <a href="https://codesandbox.io/s/github/francoischalifour/medium-zoom/tree/master/website">🔬 Playground</a> ・
  <a href="https://medium-zoom.francoischalifour.com">🔎 Demo</a> ・
  <a href="https://medium-zoom.francoischalifour.com/storybook">📚 Storybook</a>
  </strong>
</p>

<details>
  <summary><strong>Contents</strong></summary>

<!--
Generate the table of contents using:

```
npx doctoc README.md --maxlevel 3
```
-->

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Import the library](#import-the-library)
  - [Use the library](#use-the-library)
- [API](#api)
  - [Selectors](#selectors)
  - [Options](#options)
  - [Methods](#methods)
  - [Attributes](#attributes)
  - [Events](#events)
- [Examples](#examples)
- [Browser support](#browser-support)
- [Contributing](#contributing)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

</details>

## Features

- 📱 **Responsive** — _scale on mobile and desktop_
- 🚀 **Performant and lightweight** — _should be able to reach 60 [fps](https://en.wikipedia.org/wiki/Frame_rate)_
- ⚡️ **High definition support** — _load the HD version of your image on zoom_
- 🔎 **Flexibility** — _apply the zoom to a selection of images_
- 🖱 **Mouse, keyboard and gesture friendly** — _click anywhere, press a key or scroll away to close the zoom_
- 🎂 **Event handling** — _trigger events when the zoom enters a new state_
- 📦 **Customization** — _set your own margin, background and scroll offset_
- 🔧 **Pluggable** — _add your own features to the zoom_
- 💎 **Custom templates** — _extend the default look to match your app UI_

## Installation

This module is available on the [npm](https://www.npmjs.com) registry, with no dependencies.

```sh
npm install medium-zoom
# or
yarn add medium-zoom
```

###### Download

- [Normal](https://cdn.jsdelivr.net/npm/medium-zoom/dist/medium-zoom.js)
- [Minified](https://cdn.jsdelivr.net/npm/medium-zoom/dist/medium-zoom.min.js)

###### CDN

- [jsDelivr](https://www.jsdelivr.com/package/npm/medium-zoom)
- [unpkg](https://unpkg.com/medium-zoom/)

## Usage

> [Try it out in the browser](https://codesandbox.io/s/github/francoischalifour/medium-zoom/tree/master/website)

### Import the library

Using imports:

```js
import mediumZoom from 'medium-zoom'
```

Using script tags:

```html
<script src="node_modules/medium-zoom/dist/medium-zoom.min.js"></script>
```

That's it! You don't need to import any CSS styles.

### Use the library

```js
mediumZoom(selector?, options?)
```

The [selector](#selectors) allows attaching the zoom to selected images. The [options](#options) enable the customization of the zoom.

## API

### Selectors

The selector can be of the following types:

- [CSS selectors](https://developer.mozilla.org/docs/Web/CSS/CSS_Selectors)
- [`Element`](https://developer.mozilla.org/docs/Web/API/Element)
- [`NodeList`](https://developer.mozilla.org/docs/Web/API/NodeList)
- [`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)

```js
// CSS selector
mediumZoom('[data-zoom]')

// Element
mediumZoom(document.querySelector('#cover'))

// NodeList
mediumZoom(document.querySelectorAll('[data-zoom]'))

// Array
const images = [
  document.querySelector('#cover'),
  ...document.querySelectorAll('[data-zoom]'),
]

mediumZoom(images)
```

### Options

The options are defined as an object with the following properties:

| Property       | Type                          | Default  | Description                                                                                      |
| -------------- | ----------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `margin`       | `number`                      | `0`      | The space outside the zoomed image                                                               |
| `background`   | `string`                      | `"#fff"` | The color of the overlay                                                                         |
| `scrollOffset` | `number`                      | `48`     | The number of pixels to scroll to close the zoom                                                 |
| `container`    | `string`\|`Element`\|`object` | `null`   | The element to render the zoom in or a viewport object. [Read more →](#using-a-custom-container) |
| `template`     | `string`\|`Element`           | `null`   | The template element to show on zoom. [Read more →](#using-a-custom-template)                    |

```js
mediumZoom('[data-zoom]', {
  margin: 24,
  background: '#BADA55',
  scrollOffset: 0,
  container: '#zoom-container',
  template: '#zoom-template',
})
```

#### Using a custom `container`

The zoom is by default rendered in the window viewport. You can also render your image in any element of the DOM, or any custom coordinates with the `container` option.

##### Rendering in a DOM Element

```html
<article>
  <p>My article...</p>
  <img src="image.jpg" alt="My image">
  <div id="zoom-container"></div>
</article>

<script>
  mediumZoom('img', {
    container: '#zoom-container'
  })
</script>
```

##### Rendering with coordinates

If you don't already have an element in your DOM to specify the position of the zoom, you can pass an object with the following `number` properties:

```js
mediumZoom('img', {
  container: {
    width: 720,
    height: 480,
    top: 64,
    bottom: 64,
    right: 0,
    left: 0,
  },
})
```

These properties behave very much like [`Element.getBoundingClientRect()`](https://developer.mozilla.org/docs/Web/API/Element/getBoundingClientRect). They will get merged with the default ones so you don't need to specify all of them.

The default `width` and `height` are `window.innerWidth` and `window.innerHeight`. Others are set to `0`.

#### Using a custom `template`

You might want to render the zoom in your own template. You could reproduce zooms as seen on [Facebook](examples/facebook-template) or [Dropbox Paper](examples/dropbox-paper-template). This is possible with the `template` option.

1.  Create a [`template`](https://developer.mozilla.org/docs/Web/HTML/Element/template) element matching the `template` option value
2.  If you'd like your image to appear at a specific position in your template, specify the `container` option and add it in your template (`#zoom-container` here)

```html
<template id="zoom-template">
  <div>
    <header>My image zoom template</header>
    <div id="zoom-container"></div>
    <aside>Comment on my image</aside>
  </div>
</template>

<script>
  mediumZoom('[data-zoom]', {
    template: '#zoom-template',
    container: '#zoom-container'
  })
</script>
```

Go to the [`examples/`](examples) folder for more details.

### Methods

#### `open({ target? })`

Opens the zoom and returns a promise resolving the zoom.

```js
const zoom = mediumZoom('#my-image')

zoom.open()
```

_Emits an event [`open`](#events) on animation start and [`opened`](#events) when completed._

#### `close()`

Closes the zoom and returns a promise resolving the zoom.

```js
const zoom = mediumZoom('#my-image')

zoom.close()
```

_Emits an event [`close`](#events) on animation start and [`closed`](#events) when completed._

#### `toggle({ target? })`

Opens the zoom when closed / dismisses the zoom when opened, and returns a promise resolving the zoom.

```js
const zoom = mediumZoom('#my-image')

zoom.toggle()
```

#### `attach(...selectors)`

Attaches the images to the zoom and returns the zoom.

```js
const zoom = mediumZoom()

zoom.attach('#image-1', '#image-2')
zoom.attach(
  document.querySelector('#image-3'),
  document.querySelectorAll('aside img')
)
```

#### `detach(...selectors)`

Releases the images attached to the zoom and returns the zoom.

```js
const zoom = mediumZoom('.content img')

zoom.detach('#image-1', document.querySelector('#image-2')) // detach two images
zoom.detach() // detach all images
```

_Emits an event [`detach`](#events) on the image._

#### `update(options)`

Updates the options and returns the zoom.

```js
const zoom = mediumZoom('#my-image')

zoom.update({
  background: '#BADA55',
})
```

_Emits an event [`update`](#events) on each image of the zoom._

#### `extend(options?)`

Clones the zoom with new options merged with the current ones and returns the zoom.

```js
const zoom = mediumZoom('#my-image', { background: '#BADA55' })

const clonedZoom = zoom.extend({
  margin: 48,
})

clonedZoom.getOptions() // → { background: '#BADA55', margin: 48, ... }
```

#### `on(type, listener, options?)`

Registers the specified listener on each target of the zoom.

You can use the same `options` as the [`addEventListener`](https://developer.mozilla.org/docs/Web/API/EventTarget/addEventListener#Parameters) method.

```js
const zoom = mediumZoom('[data-zoom]')

zoom.on('closed', event => {
  // the image has been closed
})

zoom.on(
  'open',
  event => {
    // the image has been opened (tracked only once)
  },
  { once: true }
)
```

The zoom object is accessible in `event.detail.zoom`.

#### `off(type, listener, options?)`

Removes the previously registered listener on each target of the zoom.

You can use the same `options` as the [`removeEventListener`](https://developer.mozilla.org/docs/Web/API/EventTarget/removeEventListener#Parameters) method.

```js
const zoom = mediumZoom('[data-zoom]')

const listener = event => {
  // ...
}

zoom.on('open', listener)
// ...
zoom.off('open', listener)
```

The zoom object is accessible in `event.detail.zoom`.

#### `getOptions()`

Returns the zoom options as an object.

```js
const zoom = mediumZoom({ background: '#BADA55' })

zoom.getOptions() // → { background: '#BADA55', ... }
```

#### `getImages()`

Returns the images attached to the zoom as an array of [HTML Elements](https://developer.mozilla.org/docs/Web/API/Element).

```js
const zoom = mediumZoom('img')

zoom.getImages() // → [HTML Element, HTML Element]
```

#### `getZoomedTarget()`

Returns the current zoomed target as an [HTML Element](https://developer.mozilla.org/docs/Web/API/Element).

```js
const zoom = mediumZoom('img')

zoom.getZoomedTarget() // → HTML Element
```

### Attributes

#### `data-zoom-target`

Specifies the high definition image to show on zoom. This image loads the first time the user clicks on the source image.

```html
<img
  src="image-thumb.jpg"
  data-zoom-target="image-hd.jpg"
  alt="My image"
>
```

### Events

| Event  | Description                                         |
| ------ | --------------------------------------------------- |
| open   | Fired immediately when the `open` method is called  |
| opened | Fired when the zoom has finished being animated     |
| close  | Fired immediately when the `close` method is called |
| closed | Fired when the zoom out has finished being animated |
| detach | Fired when the `detach` method is called            |
| update | Fired when the `update` method is called            |

```js
const zoom = mediumZoom('#image-tracked')

zoom.on('open', event => {
  // track when the image is zoomed
})
```

The zoom object is accessible in `event.detail.zoom`.

## Examples

<details>
 <summary>Trigger a zoom from another element</summary>

```js
const button = document.querySelector('[data-action="zoom"]')
const zoom = mediumZoom('#image')

button.addEventListener('click', () => zoom.open())
```

</details>

<details>
 <summary>Track an event (for analytics)</summary>

You can use the `open` event to keep track of how many times a user interacts with your image. This can be useful if you want to gather some analytics on user engagement.

```js
let counter = 0
const zoom = mediumZoom('#image-tracked')

zoom.on('open', event => {
  console.log(`"${event.target.alt}" has been zoomed ${++counter} times`)
})
```

</details>

<details>
 <summary>Detach a zoom once closed</summary>

```js
const zoom = mediumZoom('#image-detach')

zoom.on('closed', () => zoom.detach(), { once: true })
```

</details>

<details>
 <summary>Create a zoomable React component</summary>

```js
import React, { Component } from 'react'
import mediumZoom from 'medium-zoom'

class ImageZoom extends Component {
  zoom = this.props.zoom.extend({
    background: this.props.color,
  })

  attachZoom = image => {
    this.zoom.attach(image)
  }

  render() {
    return (
      <img src={this.props.src} alt={this.props.alt} ref={this.attachZoom} />
    )
  }
}

class App extends Component {
  zoom = mediumZoom({ background: '#000', margin: 48 })

  render() {
    return (
      <ImageZoom src="image.jpg" alt="Image" zoom={this.zoom} color="#BADA55" />
    )
  }
}
```

</details>
<br>

You can see [more examples](examples/) including [React](examples/react) and [Vue](examples/vue), or check out the [storybook](https://medium-zoom.francoischalifour.com/storybook).

## Browser support

| IE              | Edge            | Chrome | Firefox | Safari |
| --------------- | --------------- | ------ | ------- | ------ |
| 10<sup>\*</sup> | 12<sup>\*</sup> | 36     | 34      | 9      |

<sup>\*</sup> _These browsers require a [`template` polyfill](https://github.com/webcomponents/template) when using [custom templates](#using-a-custom-template)_.

<blockquote>
  <p align="center">
    Cross-browser testing is sponsored by
  </p>
  <p align="center">
    <a href="https://www.browserstack.com">
      <img src="https://user-images.githubusercontent.com/6137112/44587083-35987000-a7b2-11e8-8e0d-8ba15de83802.png" alt="BrowserStack" height="35">
    </a>
  </p>
</blockquote>

## Contributing

- Run `yarn` to install Node dev dependencies
- Run `yarn start` to build the library in watch mode
- Run `yarn run storybook` to see your changes at http://localhost:9001

Please read the [contributing guidelines](CONTRIBUTING.md) for more detailed explanations.

_You can also use [npm](https://www.npmjs.com)._

## License

MIT © [François Chalifour](https://francoischalifour.com)
