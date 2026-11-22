import mediumZoom, { type Zoom, type ZoomOptions } from 'medium-zoom'
import compat from 'medium-zoom/compat'
import modern from 'medium-zoom/modern'
import modernPure from 'medium-zoom/modern/pure'
import pure from 'medium-zoom/pure'

const options: ZoomOptions = {
  margin: 24,
  signal: new AbortController().signal,
}
const zoom: Zoom = mediumZoom('img', options)
const opening: Promise<void> = zoom.open(document.createElement('img'))
const snapshot = zoom.getSnapshot()
const unsubscribe = zoom.subscribe(() => {})
zoom.attach('img')
zoom.update({ background: 'Canvas' })
zoom.detach('img')
zoom.destroy()
for (const factory of [modern, pure, modernPure]) {
  const instance: Zoom = factory('img', options)
  instance.destroy()
}
compat('img', { template: '#caption', container: document.body })
  .clone()
  .toggle()
// @ts-expect-error Legacy options are not part of the modern preset.
mediumZoom('img', { template: '#caption' })
// @ts-expect-error Legacy method removed from the runtime and declaration.
zoom.clone()
// @ts-expect-error State observation replaces string-based event registration.
zoom.on('opened', () => {})
void opening
void snapshot
unsubscribe()
