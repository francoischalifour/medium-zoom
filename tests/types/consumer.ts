import mediumZoom, { type Zoom, type ZoomOptions } from 'medium-zoom'
import pureZoom from 'medium-zoom/dist/pure'
import pureFileZoom from 'medium-zoom/dist/pure/index.js'

const image = document.createElement('img')
const options: ZoomOptions = { margin: 16, background: '#fff', container: document.body }
const zoom: Zoom = mediumZoom(image, options)
const pure: Zoom = pureZoom('img', options)
const opened: Promise<Zoom> = zoom.open({ target: image })
const images: HTMLElement[] = pure.getImages()
zoom
  .attach(image)
  .on('opened', () => {})
  .detach(image)
mediumZoom(options)
pureFileZoom(options).clone().update(options)

// @ts-expect-error selectors do not accept numbers
mediumZoom(42)
// @ts-expect-error margin must be numeric
mediumZoom({ margin: '16' })

void opened
void images
