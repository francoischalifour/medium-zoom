import { createMediumZoom, type CoreZoomOptions, type Zoom } from 'medium-zoom/core'
import { hdImage, container, template } from 'medium-zoom/features'

const core = createMediumZoom()
const basic: Zoom<CoreZoomOptions> = core('img', { margin: 16 })
const annotated: Zoom = basic
// @ts-expect-error the core Zoom type defaults to core options
void annotated.getOptions().container
basic.clone().update({ background: '#000' })
// @ts-expect-error core has no container capability
core('img', { container: '#gallery' })
// @ts-expect-error core update has no template capability
basic.update({ template: '#template' })
// @ts-expect-error clone preserves core capabilities
basic.clone({ container: '#gallery' })
// @ts-expect-error core options have no template property
void basic.getOptions().template

const hd = createMediumZoom({ features: [hdImage()] })
hd('img', { margin: 8 })
// @ts-expect-error HD does not enable container options
hd({ container: '#gallery' })

const contained = createMediumZoom({ features: [container()] })
contained({ container: { top: 20 } }).clone({ container: '#gallery' })
// @ts-expect-error container does not enable template options
contained().update({ template: '#template' })

const templated = createMediumZoom({ features: [template()] })
templated({ template: '#template' }).update({ template: null })
// @ts-expect-error template does not enable container options
templated({ container: '#gallery' })

const full = createMediumZoom({ features: [hdImage(), container(), template()] })
const zoom = full('img', { container: '#gallery', template: '#template', margin: 8 })
zoom.clone().update({ container: { left: 12 }, template: document.createElement('template') })
void zoom.getOptions().container
const reversed = createMediumZoom({ features: [template(), container(), hdImage()] })
reversed({ container: '#gallery', template: '#template' })
// @ts-expect-error feature option values remain checked
full().update({ container: 42 })

import { createMediumZoom as createPure } from 'medium-zoom/core/pure'
const pureCore = createPure({ features: [container(), template()] })
pureCore('img', { container: '#gallery', template: '#template' })
// @ts-expect-error pure core still rejects unsupported options
createPure()({ template: '#template' })
