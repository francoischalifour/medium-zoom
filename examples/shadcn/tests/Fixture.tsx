import * as React from 'react'
import { createPortal } from 'react-dom'

import { ImageZoom } from '../src/components/ui/image-zoom'
import * as ZoomParts from '../src/components/ui/image-zoom'
import { galleryAssetBase } from '../src/gallery-paths'

const ocean = `${galleryAssetBase}images/ocean-sunset.jpg`
const skateboard = `${galleryAssetBase}images/skateboard.jpg`

export function Fixture() {
  const [dark, setDark] = React.useState(false)
  const [disabled, setDisabled] = React.useState(false)
  const [visible, setVisible] = React.useState(true)
  const [cancel, setCancel] = React.useState(false)
  const [margin, setMargin] = React.useState(24)
  const [source, setSource] = React.useState(ocean)
  const [portal, setPortal] = React.useState(false)
  const [active, setActive] = React.useState(true)
  const [hd, setHd] = React.useState(false)
  const [contained, setContained] = React.useState(false)
  const [emphasized, setEmphasized] = React.useState(false)
  const galleryRef = React.useRef<HTMLDivElement>(null)
  const imageRef = React.useRef<HTMLImageElement>(null)
  const [refStatus, setRefStatus] = React.useState('')

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    return () => document.documentElement.classList.remove('dark')
  }, [dark])

  const image = (
    <ZoomParts.Root
      disabled={disabled}
      options={{ margin, container: contained ? galleryRef.current! : undefined }}
    >
      <ZoomParts.Trigger
        aria-label={disabled ? 'Ocean sunset' : 'Zoom image: Ocean sunset'}
        onClick={event => cancel && event.preventDefault()}
      >
        <ZoomParts.Image
          ref={imageRef}
          src={source}
          alt="Ocean sunset"
          width={640}
          height={427}
          className={emphasized ? 'emphasized' : undefined}
          data-zoom-src={hd ? `${ocean}?hd` : undefined}
        />
      </ZoomParts.Trigger>
    </ZoomParts.Root>
  )

  return (
    <main>
      <header>
        <a href="https://github.com/francoischalifour/medium-zoom">medium-zoom</a>
        <button onClick={() => setDark(value => !value)}>Toggle theme</button>
      </header>
      <h1>A closer look.</h1>
      <p>Image zoom for shadcn/ui. Click an image, or focus it and press Enter or Space.</p>
      <div className="controls">
        <button onClick={() => setDisabled(value => !value)} aria-pressed={disabled}>
          Disable zoom
        </button>
        <button onClick={() => setVisible(value => !value)} aria-pressed={!visible}>
          Hide first image
        </button>
        <button onClick={() => setCancel(value => !value)} aria-pressed={cancel}>
          Cancel clicks
        </button>
        <button onClick={() => setMargin(value => (value === 24 ? 80 : 24))}>Change margin</button>
        <button onClick={() => setSource(value => (value === ocean ? skateboard : ocean))}>
          Change source
        </button>
        <button onClick={() => setPortal(value => !value)} aria-pressed={portal}>
          Render in portal
        </button>
        <button onClick={() => setActive(value => !value)} aria-pressed={!active}>
          Hide with Activity
        </button>
        <button onClick={() => setHd(value => !value)} aria-pressed={hd}>
          Load HD image
        </button>
        <button onClick={() => setContained(value => !value)} aria-pressed={contained}>
          Constrain to gallery
        </button>
        <button onClick={() => setEmphasized(value => !value)} aria-pressed={emphasized}>
          Change image style
        </button>
        <button onClick={() => setRefStatus(imageRef.current?.tagName ?? 'No image')}>
          Inspect ref
        </button>
        <output>{refStatus}</output>
      </div>
      <div className="gallery" ref={galleryRef}>
        <React.Activity mode={active ? 'visible' : 'hidden'}>
          {visible && (portal ? createPortal(image, document.body) : image)}
        </React.Activity>
        <ImageZoom src={skateboard} alt="Floral skateboard" width={640} height={427} />
      </div>
      <p className="caption">Escape, scroll, or click again to return.</p>
    </main>
  )
}
