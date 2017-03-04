# medium-zoom [![npm](https://img.shields.io/npm/v/medium-zoom.svg)](https://www.npmjs.com/package/medium-zoom) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/feross/standard)

> Medium-like zoom on your pictures in pure JavaScript 🔎🖼

<p align="center">
  <img src="https://cloud.githubusercontent.com/assets/6137112/17153725/3c052454-537e-11e6-9340-b52ef32a5667.gif" alt="medium-zoom demo">
  <br>
  <br>
  <a href="http://francoischalifour.com/files/lab/medium-image-zoom/">View demo 🔎</a>
</p>

## Install

```console
$ npm install --save medium-zoom
```

Or download the [minified version](https://raw.githubusercontent.com/francoischalifour/medium-zoom/master/dist/medium-zoom.min.js).

*No dependencies.*

## Features

* 🔎 **Image selection** — *apply the zoom to a selection of images*
* 🖱 **Mouse, keyboard and gesture friendly** — *click anywhere, press a key or scroll away to dismiss the zoom*
* 🎉 **Event handling** — *triggers events when the zoom enters a new state*
* 🔧 **Customization** — *set your own margin, background and scroll offset*
* 🔗 **Link support** — *opens the link of the image in a new tab when a meta key is held (<kbd>⌘</kbd> or <kbd>Ctrl</kbd>)*
* 🖼 **Image opener** — *when no link, opens the image source in a new tab when a meta key is held (<kbd>⌘</kbd> or <kbd>Ctrl</kbd>)*
* 📱 **Responsive** — *scales on mobile and desktop*
* 🚀 **Performant and lightweight** — *should be able to reach 60 fps*

## Usage

### 1. Import the script

```html
<script src="node_modules/medium-zoom/dist/medium-zoom.min.js"></script>
```

Or:

```js
const mediumZoom = require('medium-zoom')
```

### 2. Run the plugin

```js
mediumZoom(<selector>, <options>)
```

By default, the zoom is applied to all scaled images (with HTML or CSS properties). You can specify the zoomable images with a [CSS selector](http://www.w3schools.com/cssref/css_selectors.asp) and add [options](#options).

Additionally, you can pass an array-like or an array of images to the plugin.

```js
// CSS selector
mediumZoom('#cover')

// array-like
mediumZoom(document.querySelectorAll('[data-action="zoom"]'))

// array
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
fetch('https://myapi.com/posts/{id}', {
  method: 'GET'
})
.then(response => {
  const imagesToZoom = response.images
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

## Demo

[View demo 🔎](http://francoischalifour.com/files/lab/medium-image-zoom/), go to the [demo folder](demo/) or [read the article](http://francoischalifour.com/lab/medium-image-zoom/).

## Dev

* Install the dependencies: `npm install`
* Watch changes: `npm run dev`

## Contributing

Need more options? Send a pull request!

1. [Fork the repository](https://help.github.com/articles/fork-a-repo/)
2. [Create a new branch](https://help.github.com/articles/creating-and-deleting-branches-within-your-repository/#creating-a-branch)
3. [Send a pull request](https://help.github.com/articles/creating-a-pull-request/) 👌

## License

MIT © [François Chalifour](http://francoischalifour.com)
