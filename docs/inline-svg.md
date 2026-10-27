# Zooming generated SVG diagrams

To zoom generated SVG markup, encode it as a data URL and render it in an `<img>`. Medium Zoom attaches to images; inline `<svg>` elements are unsupported.

[Run the SVG data URL example](../examples/svg-data-url).

## JavaScript

Start with a container such as `<div id="diagram"></div>`:

```js
import mediumZoom from 'medium-zoom'

const svg = `
  <svg xmlns="http://www.w3.org/2000/svg"
       width="1440" height="720" viewBox="0 0 1440 720">
    <rect width="1440" height="720" fill="#edf2e9" />
    <text x="72" y="180" font-family="sans-serif" font-size="64">
      A zoomable diagram
    </text>
  </svg>`

const image = document.createElement('img')
image.alt = 'A zoomable diagram'
image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
image.style.width = '100%'
image.style.maxWidth = '560px'
image.style.height = 'auto'
document.querySelector('#diagram').appendChild(image)

const zoom = mediumZoom(image)

// When removing the diagram, detach it from the zoom instance.
// zoom.detach(image)
```

For an existing SVG element, serialize its markup with `new XMLSerializer().serializeToString(svgElement)`. Keep the `xmlns` declaration.

## React

In React 19 and later, use a callback ref to attach the image and return a cleanup function:

```tsx
import mediumZoom from 'medium-zoom'
import type { ComponentProps, ComponentRef } from 'react'

type ZoomableDiagramProps = Omit<ComponentProps<'img'>, 'src'> & { svg: string }

export function ZoomableDiagram({ svg, style, ...props }: ZoomableDiagramProps) {
  const ref = (image: ComponentRef<'img'> | null) => {
    if (!image) return
    const zoom = mediumZoom(image)
    return () => {
      zoom.detach(image)
    }
  }

  return (
    <img
      {...props}
      ref={ref}
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      style={{ width: '100%', maxWidth: 560, height: 'auto', ...style }}
    />
  )
}
```

For Mermaid, pass the `svg` string returned by `await mermaid.render(...)` to this component. If rendering in an effect, ignore results that arrive after the source changes or the component unmounts.

## Sizing and image constraints

Set explicit SVG `width` and `height` values with a matching `viewBox`, then display a smaller thumbnail. The example uses a 1440 × 720 SVG displayed at 560 × 280 or smaller.

Data URLs do not match Medium Zoom’s `.svg` filename check, so zooming uses the image’s natural dimensions, capped by the viewport. A `viewBox` alone may produce a small natural size.

- Include styles in the SVG. The image cannot inherit the page’s CSS; avoid external fonts and HTML labels. For Mermaid, use SVG text labels (`htmlLabels: false`).
- Provide meaningful `alt` text. Text inside the image is not selectable, and links and event handlers are inactive.
- If your site uses Content Security Policy, allow `data:` in `img-src` or its `default-src` fallback. For example, `img-src 'self' data:` permits local images and data URLs.
