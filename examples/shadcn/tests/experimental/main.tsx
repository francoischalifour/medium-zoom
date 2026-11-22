import { createZoom, type ModalZoom } from 'medium-zoom/core'
import { bindGalleryKeyboard, createGallery } from 'medium-zoom/gallery'
import { loadHdImage } from 'medium-zoom/loaders'
import { dialog } from 'medium-zoom/renderers'
import * as React from 'react'
import { createRoot } from 'react-dom/client'

import * as GalleryControls from './gallery-controls'

import './style.css'

function Example() {
  const images = React.useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = React.useState<ModalZoom | null>(null)
  React.useEffect(() => {
    // One signal releases the zoom and everything bound to it. Under Strict Mode the next
    // zoom shares the document's group, so it waits for this one to finish closing.
    const lifetime = new AbortController()
    setZoom(
      createZoom(images.current!.querySelectorAll('img'), {
        signal: lifetime.signal,
        loader: loadHdImage,
        renderer: dialog({
          content: ({ element, zoom, close, signal }) => {
            const node = document.createElement('div')
            element.append(node)
            const root = createRoot(node)
            // The content's signal releases its gallery handle and keyboard on close.
            const gallery = createGallery(zoom, { signal })
            bindGalleryKeyboard(element, gallery, { signal })
            root.render(
              <>
                <button
                  className="photo-close"
                  autoFocus
                  onClick={event => close({ event: event.nativeEvent })}
                >
                  Close image
                </button>
                <GalleryControls.Root
                  gallery={gallery}
                  className="photo-toolbar"
                >
                  <GalleryControls.Previous aria-label="Previous photograph">
                    ← Back
                  </GalleryControls.Previous>
                  <GalleryControls.Position />
                  <GalleryControls.Next aria-label="Next photograph">
                    Forward →
                  </GalleryControls.Next>
                </GalleryControls.Root>
              </>
            )
            return () => {
              root.unmount()
              node.remove()
            }
          },
        }),
        margin: 72,
      })
    )
    return () => lifetime.abort()
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
          disabled={!zoom}
          onClick={event => {
            const trigger = event.currentTarget
            void zoom?.open({
              target: trigger.querySelector('img')!,
              trigger,
            })
          }}
        >
          <img
            src={`/images/${source}`}
            alt={alt}
            aria-hidden="true"
            width={640}
          />
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
        React owns this toolbar. The zoom's group keeps one image open at a
        time, and the modal renderer owns focus and image replacement.
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
