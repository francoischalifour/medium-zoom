import * as React from 'react'

import * as ImageZoom from '../src/components/ui/image-zoom'
import { galleryAssetBase } from '../src/gallery-paths'

const ocean = `${galleryAssetBase}images/ocean-sunset.jpg`
const skateboard = `${galleryAssetBase}images/skateboard.jpg`

export function CompoundFixture({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [open, setOpen] = React.useState(initiallyOpen)
  const [accept, setAccept] = React.useState(true)
  const [mounted, setMounted] = React.useState(true)
  const [disabled, setDisabled] = React.useState(false)
  const [cancel, setCancel] = React.useState(false)
  const [source, setSource] = React.useState(ocean)
  const [caption, setCaption] = React.useState('Composed skateboard')
  const [changes, setChanges] = React.useState<boolean[]>([])
  const [uncontrolledChanges, setUncontrolledChanges] = React.useState<boolean[]>([])
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const imageRef = React.useRef<HTMLImageElement>(null)
  const [refs, setRefs] = React.useState('')
  return (
    <main style={{ minHeight: '200vh' }}>
      <h1>Composable image zoom</h1>
      <div className="controls">
        <button onClick={() => setOpen(true)}>Open externally</button>
        <button onClick={() => setOpen(false)}>Close externally</button>
        <button onClick={() => setAccept(value => !value)} aria-pressed={!accept}>
          Decline requests
        </button>
        <button onClick={() => setCaption('Floral skateboard')}>Rename skateboard</button>
        <button onClick={() => setMounted(value => !value)}>Toggle image</button>
        <button onClick={() => setDisabled(value => !value)}>Toggle disabled</button>
        <button onClick={() => setCancel(value => !value)}>Cancel trigger</button>
        <button onClick={() => setSource(value => (value === ocean ? skateboard : ocean))}>
          Replace source
        </button>
        <button
          onClick={() => setRefs(`${triggerRef.current?.tagName} ${imageRef.current?.tagName}`)}
        >
          Inspect part refs
        </button>
      </div>
      <output aria-label="Controlled requests">{JSON.stringify(changes)}</output>
      <output aria-label="Uncontrolled changes">{JSON.stringify(uncontrolledChanges)}</output>
      <output aria-label="Part refs">{refs}</output>
      <div className="gallery">
        <ImageZoom.Root
          open={open}
          disabled={disabled}
          options={{ margin: 48, background: '#eee' }}
          onOpenChange={value => {
            setChanges(previous => [...previous, value])
            if (accept) setOpen(value)
          }}
        >
          {mounted && (
            <ImageZoom.Trigger
              ref={triggerRef}
              aria-label="Open composed ocean"
              onClick={event => cancel && event.preventDefault()}
            >
              <ImageZoom.Image
                ref={imageRef}
                src={source}
                alt="Composed ocean"
                width={640}
                height={427}
              />
              <span>View photo</span>
            </ImageZoom.Trigger>
          )}
        </ImageZoom.Root>
        <ImageZoom.Root
          onOpenChange={value => setUncontrolledChanges(previous => [...previous, value])}
        >
          <ImageZoom.Trigger>
            <ImageZoom.Image src={skateboard} alt={caption} width={640} height={427} />
          </ImageZoom.Trigger>
        </ImageZoom.Root>
      </div>
    </main>
  )
}
