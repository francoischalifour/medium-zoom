import { createMediumZoom, type CoreZoomOptions, type Zoom } from 'medium-zoom/core'
import { hdImage, container, template, accessibility } from 'medium-zoom/features'

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

import { dialog } from 'medium-zoom/renderers'
const modal = createMediumZoom({
  renderer: dialog({ label: 'Photo' }),
  features: [template(), hdImage()],
})
const modalZoom = modal('img', { template: '#template' })
void modalZoom.open({ trigger: document.createElement('button') })
modalZoom.clone().update({ template: null })
// @ts-expect-error renderer does not enable the container feature
modalZoom.update({ container: '#gallery' })
// @ts-expect-error renderers are fixed at creation
modalZoom.update({ renderer: dialog() })
// @ts-expect-error renderer configuration remains typed
dialog({ label: 42 })

const accessibleGallery = createMediumZoom({
  renderer: dialog(),
  features: [accessibility(), hdImage(), template()],
})
accessibleGallery('img', { template: '#caption' }).clone().attach('img')
// @ts-expect-error accessibility and gallery do not implicitly enable container options
accessibleGallery('img', { container: '#gallery' })
import { bindGalleryKeyboard, createGallery } from 'medium-zoom/gallery'
const controller = createGallery(accessibleGallery('img'))
const unbind = bindGalleryKeyboard(document.createElement('div'), controller)
unbind()
// @ts-expect-error keyboard binding requires a DOM event host
bindGalleryKeyboard({}, controller)
// @ts-expect-error renderer provides no default close-control options
dialog({ closeLabel: 'Close' })

import { createZoomSession, type ZoomSession } from 'medium-zoom/session'
const session: ZoomSession<CoreZoomOptions> = createZoomSession(core('img'))
void session.open({ trigger: document.createElement('button') })
void session.close()
void session.dispose()
