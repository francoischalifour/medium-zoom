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

const current: HTMLElement = zoom.getZoomedImage()
void current

import pureAlias, { type Zoom as PureZoom, type ZoomOptions as PureOptions } from 'medium-zoom/pure'
const aliased: PureZoom = pureAlias('img', options as PureOptions)
void aliased

import compat from 'medium-zoom/compat'
import compatPure from 'medium-zoom/compat/pure'
import modern from 'medium-zoom/modern'
const profiles: Zoom[] = [
  compat(image, options),
  compatPure(image, options),
  modern(image, options),
]
void profiles
