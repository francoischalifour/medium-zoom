import { bindGalleryKeyboard } from 'medium-zoom/controls'
import { createMediumZoom } from 'medium-zoom/core'
import { hdImage } from 'medium-zoom/features'
import { createGallery, type GalleryController } from 'medium-zoom/gallery'
import { dialog } from 'medium-zoom/renderers'
import { createZoomSession, type ZoomSession } from 'medium-zoom/session'
import * as React from 'react'
import { createRoot } from 'react-dom/client'

import * as GalleryControls from './gallery-controls'

import './style.css'

type Owner = { session: ZoomSession; gallery: GalleryController }
function Example() {
  const images = React.useRef<HTMLDivElement>(null)
  const closing = React.useRef<Promise<void> | null>(null)
  const [owner, setOwner] = React.useState<Owner | null>(null)
  React.useEffect(() => {
    let disposed = false
    let current: Owner | undefined
    const attach = () => {
      if (disposed) {
        return
      }
      const factory = createMediumZoom({
        features: [hdImage()],
        renderer: dialog({
          content: ({ element, zoom }) => {
            const node = document.createElement('div')
            element.append(node)
            const root = createRoot(node)
            const gallery = createGallery(zoom)
            const unbind = bindGalleryKeyboard(element, gallery)
            root.render(
              <GalleryControls.Root gallery={gallery} className="photo-toolbar">
                <GalleryControls.Previous aria-label="Previous photograph">
                  ← Back
                </GalleryControls.Previous>
                <GalleryControls.Position />
                <GalleryControls.Next aria-label="Next photograph">Forward →</GalleryControls.Next>
              </GalleryControls.Root>
            )
            return () => {
              unbind()
              root.unmount()
              node.remove()
            }
          },
        }),
      })
      const zoom = factory(images.current!.querySelectorAll('img'), { margin: 72 })
      current = { session: createZoomSession(zoom), gallery: createGallery(zoom) }
      setOwner(current)
    }
    if (closing.current) {
      void closing.current.then(attach)
    } else {
      attach()
    }
    return () => {
      disposed = true
      if (current) {
        current.gallery.dispose()
        closing.current = current.session.dispose()
      }
    }
  }, [])
  return (
    <div className="photos" ref={images}>
      {[
        ['image-1.jpg', 'Ocean sunset'],
        ['image-2.jpg', 'Floral skateboard'],
        ['image-1.jpg', 'Evening waves'],
      ].map(([source, alt]) => (
        <button
          key={alt}
          className="photo-trigger"
          aria-label={`Open ${alt}`}
          disabled={!owner}
          onClick={event => {
            const trigger = event.currentTarget
            void owner?.session.open({ target: trigger.querySelector('img')!, trigger })
          }}
        >
          <img src={`/images/${source}`} alt={alt} aria-hidden="true" width={640} />
          <span>{alt}</span>
        </button>
      ))}
    </div>
  )
}
function App() {
  const [mounted, setMounted] = React.useState(true)
  return (
    <main>
      <p className="eyebrow">Medium Zoom · Shadcn composition</p>
      <h1>
        One gallery controller.
        <br />
        Your own controls.
      </h1>
      <p className="intro">
        React owns this toolbar. Sessions coordinate ownership, and the modal renderer owns focus
        and image replacement.
      </p>
      <button className="toggle" onClick={() => setMounted(value => !value)}>
        {mounted ? 'Unmount gallery' : 'Mount gallery'}
      </button>
      {mounted && <Example />}
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
