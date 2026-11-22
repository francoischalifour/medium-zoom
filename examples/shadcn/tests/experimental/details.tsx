import * as React from 'react'
import { createRoot } from 'react-dom/client'

import * as ImageZoom from './image-zoom'

// Exercises what only the composable component offers: why the zoom opens or closes,
// defaultOpen, and the warnings for switching between controlled and uncontrolled.
function Details() {
  const search = new URLSearchParams(location.search)
  const [changes, setChanges] = React.useState<string[]>([])
  const [controlled, setControlled] = React.useState(false)
  const [source, setSource] = React.useState('/images/image-1.jpg')
  return (
    <main>
      <button onClick={() => setControlled(value => !value)}>
        Switch control
      </button>
      <button onClick={() => setSource('/images/image-2.jpg')}>
        Replace source
      </button>
      <output aria-label="Changes">{changes.join(' | ')}</output>
      <ImageZoom.ImageZoom
        src={source}
        alt="Ocean sunset"
        width={320}
        defaultOpen={search.has('open') || undefined}
        open={controlled ? false : undefined}
        onOpenChange={(open, { reason, event }) =>
          setChanges(previous => [
            ...previous,
            `${open} ${reason} ${event?.type ?? 'none'}`,
          ])
        }
      />
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Details />
  </React.StrictMode>
)
