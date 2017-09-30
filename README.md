<p align="center">
  <a href="https://medium-zoom.francoischalifour.com"><img src="logo.svg" width="64"></a>
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
  <a href="https://medium-zoom.francoischalifour.com">View demo 🔎</a>
</p>

## Features

* 📱 **Responsive** — *scale on mobile and desktop*
* 🚀 **Performant and lightweight** — *should be able to reach 60 [fps](https://en.wikipedia.org/wiki/Frame_rate)*
* ⚡️ **High definition support** — *load the HD version of your image on zoom*
* 🔎 **Image selection** — *apply the zoom to a selection of images*
* 🖱 **Mouse, keyboard and gesture friendly** — *click anywhere, press a key or scroll away to dismiss the zoom*
* 🎉 **Event handling** — *trigger events when the zoom enters a new state*
* 🔧 **Customization** — *set your own margin, background and scroll offset*
* 🔗 **Link support** — *open the link of the image in a new tab when a meta key is held (<kbd>⌘</kbd> or <kbd>Ctrl</kbd>)*
* 🖼 **Image opener** — *when no link, open the image source in a new tab when a meta key is held (<kbd>⌘</kbd> or <kbd>Ctrl</kbd>)*

## Install

This module is available on the [npm](https://www.npmjs.com) registry, with no dependencies.

```sh
npm install --save medium-zoom
# yarn add medium-zoom
```

If you want to use the [CDN](https://en.wikipedia.org/wiki/Content_delivery_network) version:

```html
<script src="https://unpkg.com/medium-zoom@0/dist/medium-zoom.min.js"></script>
```

To use a local version, you can download the [minified version](https://unpkg.com/medium-zoom@0/dist/medium-zoom.min.js) of the module.

## Usage

### 1. Import the script

*You can skip this step if you use the CDN version.*

Import the script:

```html
<script src="node_modules/medium-zoom/dist/medium-zoom.min.js"></script>
```

Or, using the module syntax:

```js
const mediumZoom = require('medium-zoom')
// import mediumZoom from 'medium-zoom'
```

That's it! You don't need to import any CSS styles.

### 2. Use the library

```js
mediumZoom(<selector>, <options>)
```

By default, the zoom is applied to all scaled images (with HTML or CSS properties). You can specify the zoomable images with a [CSS selector](http://www.w3schools.com/cssref/css_selectors.asp) and add [options](#options).

Additionally, you can pass an [Element](https://developer.mozilla.org/en-US/docs/Web/API/Element), a [NodeList](https://developer.mozilla.org/en-US/docs/Web/API/NodeList), an [HTMLCollection](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCollection) or an array of images to the plugin.

```js
// CSS selector
mediumZoom('#cover')

// Element
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

| Properties   | Type    | Default  | Description                                                         |
|--------------|---------|----------|---------------------------------------------------------------------|
| margin       | integer | `0`      | Space outside the zoomed image                                      |
| background   | string  | `"#fff"` | Color of the overlay                                                |
| scrollOffset | integer | `48`     | Number of pixels to scroll to dismiss the zoom                      |
| metaClick    | boolean | `true`   | Enables the action on meta click (opens the link / image source)    |

```js
mediumZoom('[data-action="zoom"]', {
  margin: 24,
  background: '#000',
  scrollOffset: 0,
  metaClick: false
})
```

### Methods

#### `.show()`

Triggers the zoom.

```js
const zoom = mediumZoom('#my-image')

zoom.show()
```

*Emits an event [`show`](#events) on animation start and [`shown`](#events) when completed.*

#### `.hide()`

Dismisses the zoom.

```js
const zoom = mediumZoom('#my-image')

zoom.hide()
```

*Emits an event [`hide`](#events) on animation start and [`hidden`](#events) when completed.*

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

*Emits an event [`detach`](#events).*

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

| Event            | Description                                                         |
|------------------|---------------------------------------------------------------------|
| show             | Fired immediately when the `show` instance method is called         |
| shown            | Fired when the zoom has finished being animated                     |
| hide             | Fired immediately when the `hide` instance method is called         |
| hidden           | Fired when the zoom out has finished being animated                 |
| detach           | Fired when the `detach` instance method is called                   |

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
    const imagesToZoom = post.images
      .map(imgSrc => document.querySelector(`img[src=${imgSrc}]`))

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

You can see [more examples](examples/) including [vanilla JavaScript](examples/javascript) and [React ⚛️](examples/react).

## Demo

[View demo 🔎](https://medium-zoom.francoischalifour.com), go to the [examples folder](examples/) or [read the article](https://francoischalifour.com/lab/medium-image-zoom).

## Dev

* Run `npm install` to install Node dev dependencies
* Run `npm run dev` to watch changes and rebuild the library
* Open [`examples/javascript/development/index.html`](examples/javascript/development/index.html) to check your changes (it includes [`dist/medium-zoom.min.js`](dist/medium-zoom.min.js) which is watched with `npm run dev`)

##### More commands

* Lint code: `npm run lint:fix`
* Test: `npm test`

*You can also use [Yarn](https://github.com/yarnpkg/yarn).*

## Contributing

Need more options? Send a pull request!

1. [Fork the repository](https://help.github.com/articles/fork-a-repo/)
2. [Create a new branch](https://help.github.com/articles/creating-and-deleting-branches-within-your-repository/#creating-a-branch)
3. [Send a pull request](https://help.github.com/articles/creating-a-pull-request/) 👌

## License

MIT © [François Chalifour](https://francoischalifour.com)
