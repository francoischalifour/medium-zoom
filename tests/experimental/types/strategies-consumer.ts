import { templateContent } from 'medium-zoom/content'
import {
  createZoom,
  type CoreZoomOptions,
  type Zoom,
  type ZoomLoader,
  type ZoomViewport,
} from 'medium-zoom/core'
import { createGallery, bindGalleryKeyboard } from 'medium-zoom/gallery'
import { loadHdImage } from 'medium-zoom/loaders'
import { dialog } from 'medium-zoom/renderers'
import { createZoomSession } from 'medium-zoom/session'
import { bindZoomTriggers } from 'medium-zoom/triggers'
import { containerBounds } from 'medium-zoom/viewport'

const basic: Zoom<CoreZoomOptions> = createZoom('img', { margin: 16 })
basic.clone().update({ background: '#000' })
// @ts-expect-error No legacy container option in the composition API.
createZoom('img', { container: '#gallery' })
// @ts-expect-error Construction strategies cannot change via update().
basic.update({ loader: loadHdImage })
// @ts-expect-error No universal feature abstraction.
createZoom('img', { features: [] })
// @ts-expect-error Core options do not include template content.
void basic.getOptions().template
// @ts-expect-error No legacy template option in clone().
basic.clone({ template: '#caption' })
const loader: ZoomLoader = (_context, ready) => {
  ready()
}
const viewport: ZoomViewport = bounds => bounds
const zoom = createZoom('img', {
  loader,
  viewport: containerBounds(document.createElement('div')),
  renderer: dialog({ content: templateContent('#caption') }),
  margin: 24,
})
createZoom('img', { loader: loadHdImage, viewport })
const unbind = bindZoomTriggers(zoom)
const gallery = createGallery(zoom)
const keys = bindGalleryKeyboard(document.createElement('div'), gallery)
const session = createZoomSession(zoom)
void session.open({ trigger: document.createElement('button') })
void gallery.next()
keys()
unbind()
gallery.dispose()
void session.dispose()
// @ts-expect-error Correct target type for viewport helper.
containerBounds(42)
// @ts-expect-error Correct target type for template helper.
templateContent(document.createElement('div'))
// @ts-expect-error Renderer options remain typed.
dialog({ label: 42 })
// @ts-expect-error No automatic close control.
dialog({ closeLabel: 'Close' })
// @ts-expect-error Keyboard binding requires a DOM host.
bindGalleryKeyboard({}, gallery)
