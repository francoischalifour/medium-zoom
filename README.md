<h1 align="center">
  <img src="docs/assets/logo.svg" width="24" height="24" alt="">
  medium-zoom
</h1>

<p align="center">Lightweight image zoom for the web. Zero dependencies, any framework, React via shadcn.</p>

<div align="center">
  <a href="https://www.npmjs.com/package/medium-zoom"><img src="https://img.shields.io/npm/v/medium-zoom.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/medium-zoom"><img src="https://img.shields.io/npm/dm/medium-zoom.svg" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/medium-zoom.svg" alt="MIT license"></a>
</div>

<div align="center">
  <a href="https://medium-zoom.francoischalifour.com">Website</a> ·
  <a href="https://medium-zoom.francoischalifour.com/docs/">Documentation</a> ·
  <a href="https://medium-zoom.francoischalifour.com/react">React</a>
</div>

<br />

<div align="center">

[![An image opening with medium-zoom](https://user-images.githubusercontent.com/6137112/43369906-7623239a-9376-11e8-978b-6e089be499fb.gif)](https://medium-zoom.francoischalifour.com)

</div>

## JavaScript

Install the package:

```sh
npm install medium-zoom
```

Add an image to your page:

```html
<img src="/photo.jpg" alt="A mountain at sunrise" data-zoomable />
```

After the image is in the document, initialize the zoom:

```js
import mediumZoom from 'medium-zoom'

mediumZoom('[data-zoomable]')
```

The standard import includes styles and TypeScript definitions. Click the image to zoom. Click again, press <kbd>esc</kbd>, or scroll to close it.

The [JavaScript quickstart](https://medium-zoom.francoischalifour.com/docs/javascript/) covers script tags, separate stylesheets, and browser support. See the [API reference](https://medium-zoom.francoischalifour.com/docs/reference/javascript/medium-zoom/) for selectors, options, methods, and events.

## React

In a project configured for [shadcn/ui](https://ui.shadcn.com), install the component:

```sh
npx shadcn@latest add https://medium-zoom.francoischalifour.com/r/image-zoom.json
```

```tsx
import { ImageZoom } from '@/components/ui/image-zoom'

export function Photo() {
  return <ImageZoom src="/photo.jpg" alt="A mountain at sunrise" />
}
```

The command copies the component and stylesheet into your project and installs `medium-zoom`. The component provides a keyboard-accessible button and manages zoom state and cleanup.

Follow the [React quickstart](https://medium-zoom.francoischalifour.com/docs/react/) or use the [component reference](https://medium-zoom.francoischalifour.com/docs/reference/react/image-zoom/) to customize it.

## Guides and examples

The [documentation](https://medium-zoom.francoischalifour.com/docs/) covers HD images, galleries, styling, and the JavaScript and React APIs.

Runnable [examples](examples/) include [plain JavaScript](examples/vanilla), [React](examples/react), [Vue](examples/vue), and [Svelte](examples/svelte). The React example demonstrates using the library directly; [shadcn/ui](examples/shadcn) demonstrates the installable component.

## Contributing

See [Contributing](CONTRIBUTING.md) for setup, development commands, verification, and releases. To work on the website, see its [development guide](website/README.md).

## License

[MIT](LICENSE) © [François Chalifour](https://francoischalifour.com)
