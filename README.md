<p align="center">
  <a href="https://medium-zoom.francoischalifour.com"><img src="logo.svg" alt="Demo" width="64"></a>
  <h3 align="center">medium-zoom</h3>
  <p align="center">Medium zoom on your images in vanilla JavaScript 🔎 🖼</p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/medium-zoom">
    <img src="https://img.shields.io/npm/v/medium-zoom.svg?style=flat-square" alt="version">
  </a>
  <a href="http://npmcharts.com/compare/medium-zoom">
    <img src="https://img.shields.io/npm/dm/medium-zoom.svg?style=flat-square" alt="downloads">
  </a>
  <a href="https://github.com/francoischalifour/medium-zoom/blob/master/LICENSE">
    <img src="https://img.shields.io/npm/l/medium-zoom.svg?style=flat-square" alt="MIT license">
  </a>
  <a href="https://github.com/francoischalifour/medium-zoom/blob/master/package.json">
    <img src="https://img.shields.io/badge/dependencies-none-lightgrey.svg?style=flat-square" alt="no dependencies">
  </a>
  <br>
  <a href="https://unpkg.com/medium-zoom/dist/">
    <img src="http://img.badgesize.io/https://unpkg.com/medium-zoom/dist/medium-zoom.min.js?label=size&style=flat-square" alt="size">
  </a>
  <a href="https://unpkg.com/medium-zoom/dist/">
    <img src="http://img.badgesize.io/https://unpkg.com/medium-zoom/dist/medium-zoom.min.js?compression=gzip&label=gzip%20size&style=flat-square" alt="gzip size">
  </a>
  <a href="https://github.com/facebook/jest">
    <img src="https://img.shields.io/badge/tested_with-jest-99424f.svg?style=flat-square" alt="tested with Jest">
  </a>
  <a href="https://github.com/feross/standard">
    <img src="https://img.shields.io/badge/code%20style-standard-yellow.svg?style=flat-square" alt="js-standard-style">
  </a>
</p>

<p align="center">
  <a href="https://medium-zoom.francoischalifour.com">
    <img src="https://user-images.githubusercontent.com/6137112/30665292-87c012c8-9e1e-11e7-9456-3d94ee73ce98.gif" alt="medium-zoom demo">
  </a>
  <br>
  <br>
  <strong>
  <a href="https://codepen.io/francoischalifour/pen/MEPrpX">🔬 Playground</a> ・
  <a href="https://medium-zoom.francoischalifour.com">🔎 Demo</a>
  </strong>
</p>

<details>
  <summary><strong>Table of contents</strong></summary>

* [Features](#features)
* [Installation](#installation)
* [Usage](#usage)
  * [Import the script](#1-import-the-script)
  * [Use the library](#2-use-the-library)
* [API](#api)
  * [Options](#options)
  * [Methods](#methods)
  * [Data attributes](#data-attributes)
  * [Events](#events)
* [Examples](#examples)
* [Demo](#demo)
* [Browser support](#browser-support)
* [Dev](#dev)
* [Contributing](#contributing)
* [License](#license)
  </details>

## Features

* 📱 **Responsive** — _scale on mobile and desktop_
* 🚀 **Performant and lightweight** — _should be able to reach 60 [fps](https://en.wikipedia.org/wiki/Frame_rate)_
* ⚡️ **High definition support** — _load the HD version of your image on zoom_
* 🔎 **Image selection** — _apply the zoom to a selection of images_
* 🖱 **Mouse, keyboard and gesture friendly** — _click anywhere, press a key or scroll away to dismiss the zoom_
* 🎉 **Event handling** — _trigger events when the zoom enters a new state_
* 🔧 **Customization** — _set your own margin, background and scroll offset_
* 💎 **Custom templates** — _extend the default look to match your UI_
* 🔗 **Link support** — _open the link of the image in a new tab when a meta key is held (<kbd>⌘</kbd> or <kbd>Ctrl</kbd>)_
* 🖼 **Image opener** — _when no link, open the image source in a new tab when a meta key is held (<kbd>⌘</kbd> or <kbd>Ctrl</kbd>)_

## Installation

This module is available on the [npm](https://www.npmjs.com) registry, with no dependencies.

```sh
npm install --save medium-zoom
# or
yarn add medium-zoom
```

If you want to use the [CDN](https://en.wikipedia.org/wiki/Content_delivery_network) version:

```html
<script src="https://unpkg.com/medium-zoom@0/dist/medium-zoom.min.js"></script>
```

To use a local version, you can download the [minified version](https://unpkg.com/medium-zoom@0/dist/medium-zoom.min.js) of the module.

## Usage

### 1. Import the script

_You can skip this step if you use the CDN version._

Import the script:

```html
<script src="node_modules/medium-zoom/dist/medium-zoom.min.js"></script>
```

Or, using imports:

```js
import mediumZoom from 'medium-zoom'
```

That's it! You don't need to import any CSS styles.

### 2. Use the library

```js
mediumZoom(<selector>, <options>)
```

By default, the zoom is applied to all scaled images (with HTML or CSS properties). You can specify the zoomable images with a [CSS selector](http://www.w3schools.com/cssref/css_selectors.asp) and add [options](#options).

Additionally, you can pass an [HTML Element](https://developer.mozilla.org/en-US/docs/Web/API/Element), a [NodeList](https://developer.mozilla.org/en-US/docs/Web/API/NodeList), an [HTMLCollection](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCollection) or an array of images to the plugin.

```js
// CSS selector
mediumZoom('#cover')

// HTML Element
mediumZoom(document.getElementById('cover'))

// NodeList
mediumZoom(document.querySelectorAll('[data-action="zoom"]'))

// HTMLCollection
mediumZoom(document.images)

// Array
const imagesToZoom = [
  document.querySelector('#cover'),
  ...document.querySelectorAll('[data-action="zoom"]')
]

mediumZoom(imagesToZoom)
```

## API

### Options

Options can be passed via a JavaScript object through the `mediumZoom` call.

| Property       | Type                          | Default  | Description                                                                                                |
| -------------- | ----------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `margin`       | `number`                      | `0`      | The space outside the zoomed image                                                                         |
| `background`   | `string`                      | `"#fff"` | The color of the overlay                                                                                   |
| `scrollOffset` | `number`                      | `48`     | The number of pixels to scroll to dismiss the zoom                                                         |
| `metaClick`    | `boolean`                     | `true`   | Enables the action on [meta click](https://en.wikipedia.org/wiki/Meta_key) (opens the link / image source) |
| `container`    | `string`\|`Element`\|`object` |          | The element to render the zoom in or a viewport object. [Read more →](#using-a-custom-container)           |
| `template`     | `string`\|`Element`           |          | The template element to show on zoom. [Read more →](#using-a-custom-template)                              |

```js
mediumZoom('[data-action="zoom"]', {
  margin: 24,
  background: '#000',
  scrollOffset: 0,
  metaClick: false,
  container: '#zoom-container',
  template: '#zoom-template'
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
    container: '#zoom-container' // or document.querySelector('#zoom-container')
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
    left: 0
  }
})
```

These properties behave very much like [`Element.getBoundingClientRect()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect). They will get merged with the default ones so you don't need to specify all of them.

The default `width` and `height` are `window.innerWidth` and `window.innerHeight`. Others are set to `0`.

#### Using a custom `template`

You might want to render the zoom in your own template. You could reproduce zooms as seen on [Facebook](examples/facebook-template) or [Dropbox Paper](examples/dropbox-paper-template). This is possible with the `template` option.

1.  Create a [`template`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template) element matching the `template` option value
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
  mediumZoom('[data-action="zoom"]', {
    template: '#zoom-template',
    container: '#zoom-container'
  })
</script>
```

Go to the [`examples/`](examples) folder for more details.

### Methods

#### `.show()`

Triggers the zoom.

```js
const zoom = mediumZoom('#my-image')

zoom.show()
```

_Emits an event [`show`](#events) on animation start and [`shown`](#events) when completed._

#### `.hide()`

Dismisses the zoom.

```js
const zoom = mediumZoom('#my-image')

zoom.hide()
```

_Emits an event [`hide`](#events) on animation start and [`hidden`](#events) when completed._

#### `.toggle()`

Shows the zoom when hidden, hides the zoom when shown.

```js
const zoom = mediumZoom('#my-image')

zoom.toggle()
```

#### `.update(<options>)`

Updates and returns the options.

```js
const zoom = mediumZoom('#my-image')

zoom.update({
  background: '#000'
})
```

#### `.detach()`

Releases the images related to the zoom from the plugin.

```js
const zoom = mediumZoom('#my-image')

zoom.detach()
```

_Emits an event [`detach`](#events)._

#### `.addEventListeners(type, listener)`

Registers the specified listener on each target of the zoom.

```js
const zoom = mediumZoom('[data-action="zoom"]')

zoom.addEventListeners('hidden', () => {
  // do something...
})
```

### Data attributes

#### `data-zoom-target`

Specifies the high definition image to show on zoom. This image is loaded when the user clicks on the source image, only once.

```html
<img
  src="image-thumb.jpg"
  data-zoom-target="image-hd.jpg"
  alt="My image"
>
```

### Events

| Event  | Description                                                 |
| ------ | ----------------------------------------------------------- |
| show   | Fired immediately when the `show` instance method is called |
| shown  | Fired when the zoom has finished being animated             |
| hide   | Fired immediately when the `hide` instance method is called |
| hidden | Fired when the zoom out has finished being animated         |
| detach | Fired when the `detach` instance method is called           |

```js
const zoom = mediumZoom('#image-tracked')

zoom.addEventListeners('show', event => {
  // do something...
})
```

## Examples

<details>
 <summary>Images in post content</summary>

```js
mediumZoom('.post img')
```

</details>

<details>
 <summary>One image by `id`</summary>

```js
mediumZoom('#cover')
```

</details>

<details>
 <summary>Images with `data` attribute</summary>

```js
mediumZoom('[data-action="zoom"]')
```

</details>

<details>
 <summary>External images</summary>

```js
mediumZoom('img[src^="http"]')
```

</details>

<details>
 <summary>Images from a database</summary>

```js
fetch(`https://myapi.com/posts/${postId}`)
  .then(response => response.json())
  .then(post => {
    const imagesToZoom = post.images.map(imgSrc =>
      document.querySelector(`img[src=${imgSrc}]`)
    )

    mediumZoom(imagesToZoom)
  })
```

</details>

<details>
 <summary>Margins, overlay, scroll offset and click</summary>

```js
mediumZoom({
  margin: 16,
  background: '#000',
  scrollOffset: 0,
  metaClick: false
})
```

</details>

<details>
 <summary>Trigger the zoom dynamically</summary>

```js
const button = document.querySelector('#btn-zoom')
const zoom = mediumZoom('#image')

button.addEventListener('click', () => zoom.show())
```

</details>

<details>
 <summary>Zoom counter</summary>

```js
let counter = 0
const zoom = mediumZoom('#image-tracked')

zoom.addEventListeners('show', event => {
  console.log(`"${event.target.alt}" has been zoomed ${++counter} times`)
})
```

</details>

<details>
 <summary>Detach the zoom after a while</summary>

```js
const zoom = mediumZoom('#image-detach')

setTimeout(() => {
  zoom.detach()
}, 5000)
```

</details>

You can see [more examples](examples/) including [vanilla JavaScript](examples/demo), [React ⚛️](examples/react) and [Vue](examples/vue).

## Demo

[View demo 🔎](https://medium-zoom.francoischalifour.com), go to the [examples folder](examples/) or [read the article](https://francoischalifour.com/lab/medium-image-zoom).

## Browser support

| IE              | Edge            | Chrome | Firefox | Safari |
| --------------- | --------------- | ------ | ------- | ------ |
| 10<sup>\*</sup> | 12<sup>\*</sup> | 36     | 34      | 9      |

<sup>\*</sup> _These browsers require a [`<template>` polyfill](https://github.com/webcomponents/template) when using [custom templates](#using-a-custom-template)_.

## Dev

* Run `npm install` to install Node dev dependencies
* Run `npm run dev` to watch changes and rebuild the library
* Open [`examples/demo/development/index.html`](examples/demo/development/index.html) to check your changes (it includes [`dist/medium-zoom.min.js`](dist/medium-zoom.min.js) which is watched with `npm run dev`)

##### More commands

* Lint code: `npm run lint:fix`
* Test: `npm test`

_You can also use [Yarn](https://github.com/yarnpkg/yarn)._

## Contributing

Need more options? Send a pull request!

1.  [Fork the repository](https://help.github.com/articles/fork-a-repo/)
2.  [Create a new branch](https://help.github.com/articles/creating-and-deleting-branches-within-your-repository/#creating-a-branch)
3.  [Send a pull request](https://help.github.com/articles/creating-a-pull-request/) 👌

## License

MIT © [François Chalifour](https://francoischalifour.com)
