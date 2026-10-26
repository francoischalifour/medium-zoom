import * as React from 'react'
import * as ImageZoom from '../../examples/shadcn/src/components/ui/image-zoom'
import { CopyButton, HighlightedCode } from './site-components'
import { TabList } from './site-tabs'

import { galleryAssetBase, galleryImages, type ExampleImage, usageCode } from './gallery'

function ExampleCard({
  image,
  kind,
  priority,
}: {
  image: ExampleImage
  kind: 'react' | 'javascript'
  priority: boolean
}) {
  const [tab, setTab] = React.useState<'preview' | 'code'>('preview')
  const id = React.useId()
  const code = usageCode(image, kind)
  return (
    <article
      className={`demo example-card example-card--${image.format}`}
      aria-label={`${image.label} example`}
    >
      <div className="demo-toolbar">
        <TabList
          id={id}
          label={`${image.label} view`}
          value={tab}
          onValueChange={setTab}
          items={[
            { value: 'preview', label: 'Preview' },
            { value: 'code', label: 'Code' },
          ]}
        />
        {image.credit ? (
          <a
            className="example-kind"
            href={image.credit.url}
            aria-label={`Source: ${image.credit.name}, ${image.credit.author}`}
            title={image.credit.author}
          >
            Source: {image.credit.name} <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span className="example-kind">{image.label}</span>
        )}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`} tabIndex={0}>
        {tab === 'preview' ? (
          <div className="demo-stage">
            <ImageZoom.Root>
              <ImageZoom.Trigger
                className="preview-trigger"
                aria-describedby={`${id}-hint`}
                aria-label={`Zoom image: ${image.alt}`}
              >
                <ImageZoom.Image
                  src={`${galleryAssetBase}${image.preview}`}
                  data-zoom-src={`${galleryAssetBase}${image.src}`}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  id={
                    kind === 'javascript' && image.id === 'landscape' ? 'zoom-default' : undefined
                  }
                  data-zoomable={image.id}
                  className="preview-photo"
                  loading={priority ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </ImageZoom.Trigger>
            </ImageZoom.Root>
          </div>
        ) : (
          <div className="demo-code">
            <div className="code-caption">
              <span>{kind === 'react' ? 'photo.tsx' : 'photo.html'}</span>
              <CopyButton text={code} label={`Copy ${image.id} code`} />
            </div>
            <HighlightedCode code={code} />
          </div>
        )}
      </div>
      <div className="demo-caption">
        <span>{image.alt}</span>
        {tab === 'preview' && (
          <span className="zoom-controls">
            <span aria-hidden="true">Click to zoom</span>
            <span aria-hidden="true">
              Click, <kbd>esc</kbd> or scroll to close
            </span>
            <span id={`${id}-hint`} className="sr-only">
              Press Enter or Space to zoom. Click, press Escape, or scroll to close.
            </span>
          </span>
        )}
      </div>
    </article>
  )
}

export function ExampleRail({ kind = 'react' }: { kind?: 'react' | 'javascript' }) {
  const railRef = React.useRef<HTMLDivElement>(null)
  const [edges, setEdges] = React.useState({ start: true, end: false })
  const [scrolling, setScrolling] = React.useState(false)

  React.useEffect(() => {
    const rail = railRef.current!
    const supportsScrollEnd = 'onscrollend' in rail
    let idleTimer: number | undefined
    function update() {
      setEdges({
        start: rail.scrollLeft < 2,
        end: rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2,
      })
    }
    function endScroll() {
      setScrolling(false)
    }
    function onScroll() {
      update()
      setScrolling(true)
      if (!supportsScrollEnd) {
        window.clearTimeout(idleTimer)
        idleTimer = window.setTimeout(endScroll, 150)
      }
    }
    const observer = new ResizeObserver(update)
    observer.observe(rail)
    rail.addEventListener('scroll', onScroll, { passive: true })
    rail.addEventListener('scrollend', endScroll)
    update()
    return () => {
      observer.disconnect()
      rail.removeEventListener('scroll', onScroll)
      rail.removeEventListener('scrollend', endScroll)
      window.clearTimeout(idleTimer)
    }
  }, [])

  function navigate(direction: number) {
    const rail = railRef.current!
    const cards = Array.from(rail.children) as HTMLElement[]
    const position = rail.scrollLeft
    const stops = cards.map(card => card.offsetLeft - cards[0].offsetLeft)
    const target =
      direction > 0
        ? (stops.find(stop => stop > position + 2) ?? rail.scrollWidth)
        : (stops
            .slice()
            .reverse()
            .find(stop => stop < position - 2) ?? 0)
    rail.scrollLeft = target
  }

  return (
    <section
      className="examples-section"
      data-example-rail="primary"
      aria-label="Image zoom examples"
    >
      <div className="rail-heading">
        <h2>Try the zoom.</h2>
        <div>
          <span className="rail-hint">Scroll to explore</span>
          <button
            className="icon-button"
            aria-label="Previous example"
            aria-disabled={edges.start}
            onClick={() => {
              if (!edges.start) navigate(-1)
            }}
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            className="icon-button"
            aria-label="Next example"
            aria-disabled={edges.end}
            onClick={() => {
              if (!edges.end) navigate(1)
            }}
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
      <div
        className="rail-window"
        data-start={edges.start}
        data-end={edges.end}
        data-scrolling={scrolling}
      >
        <div
          className="example-rail"
          ref={railRef}
          tabIndex={0}
          aria-label="Scrollable examples"
          onKeyDown={event => {
            if (
              event.target !== event.currentTarget ||
              !['ArrowLeft', 'ArrowRight'].includes(event.key)
            )
              return
            event.preventDefault()
            navigate(event.key === 'ArrowRight' ? 1 : -1)
          }}
        >
          {galleryImages.map((image, index) => (
            <ExampleCard key={image.id} image={image} kind={kind} priority={index === 0} />
          ))}
        </div>
      </div>
    </section>
  )
}
