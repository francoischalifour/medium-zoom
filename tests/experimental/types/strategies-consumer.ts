import { templateContent } from 'medium-zoom/content'
import {
  type CoreZoomOptions,
  createZoom,
  createZoomGroup,
  type Zoom,
  type ZoomCloseReason,
  type ZoomLoader,
  type ZoomState,
  type ZoomStatus,
  type ZoomViewport,
} from 'medium-zoom/core'
import {
  bindGalleryGestures,
  bindGalleryKeyboard,
  createGallery,
  galleryControls,
} from 'medium-zoom/gallery'
import { loadHdImage } from 'medium-zoom/loaders'
import { dialog } from 'medium-zoom/renderers'
import { slide } from 'medium-zoom/transitions'
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
// Zooms share the document's group by default: no coordinator to pass around.
const unbind = bindZoomTriggers(zoom)
const gallery = createGallery(zoom)
const group = createZoomGroup()
createZoom('img', { renderer: dialog(), group })
createZoom('img', { group: null })
// @ts-expect-error Groups are made by createZoomGroup().
createZoom('img', { group: {} })
// @ts-expect-error Coordination belongs to the zoom, not to its bindings.
bindZoomTriggers(zoom, { commander: zoom })
const keys = bindGalleryKeyboard(document.createElement('div'), gallery)
const gestures = createZoom('img', {
  renderer: dialog({ content: view => bindGalleryGestures(view) }),
})
void gallery.select(1, { instant: true })
// @ts-expect-error The gallery chooses the target.
void gallery.select(1, { target: document.body })
createZoom('img', {
  renderer: dialog({
    content: galleryControls({
      closeLabel: 'Fermer',
      positionLabel: (position, total) => `${position} sur ${total}`,
    }),
    transition: slide({ duration: 200 }),
  }),
})
// @ts-expect-error Labels are strings.
galleryControls({ closeLabel: 42 })
void zoom.toggle()
void zoom.open({ trigger: document.createElement('button') })
void gallery.next()
keys()
void gestures
unbind()
gallery.dispose()
// @ts-expect-error A gallery replaces the open image, which needs a renderer.
createGallery(createZoom('img'))
// @ts-expect-error Trigger bindings announce a dialog, which needs a renderer.
bindZoomTriggers(createZoom('img', { loader: loadHdImage }))
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
const state: ZoomState = zoom.getSnapshot()
const status: ZoomStatus = state.status
void status
// @ts-expect-error Snapshots are read-only.
state.images.push(document.createElement('img'))
const stopObserving: () => void = zoom.subscribe(() => {})
stopObserving()
zoom.on('closed', event => {
  const reason: ZoomCloseReason = event.detail.reason
  void reason
})
void zoom.close('control')
// @ts-expect-error Close reasons are a closed set.
void zoom.close('swipe')
const lifetime = new AbortController()
const { signal } = lifetime
const owned = createZoom('img', { renderer: dialog(), signal })
const handle = createGallery(owned, { signal })
bindZoomTriggers(owned, { signal })
bindGalleryKeyboard(document.body, handle, { signal })
dialog({
  content: view => {
    createGallery(view.zoom, { signal: view.signal })
  },
})
// @ts-expect-error The gallery navigates; the zoom manages its images.
handle.attach('img')
lifetime.abort()
