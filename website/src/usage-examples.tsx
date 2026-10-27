import * as React from 'react'

import { ImageZoom } from '../../examples/shadcn/src/components/ui/image-zoom'
import * as ImageZoomParts from '../../examples/shadcn/src/components/ui/image-zoom'
import { photos, getPreviewImageProps } from './gallery'
import { trackSiteEvent } from './site-analytics'
import { CopyButton, HighlightedCode } from './site-components'
import { TabList } from './site-tabs'
import { usageExamples } from './usage-snippets'

type UsageExample = (typeof usageExamples)[number]

export function UsageExamples() {
  const [example, setExample] = React.useState<UsageExample>(usageExamples[0])
  const id = React.useId()

  return (
    <>
      <TabList
        id={id}
        label="React examples"
        className="usage-tabs"
        items={usageExamples.map(item => ({ value: item.id, label: item.label }))}
        value={example.id}
        onValueChange={value => {
          setExample(usageExamples.find(item => item.id === value)!)
        }}
      />
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${example.id}`}>
        <p className="usage-description">{example.description}</p>
        <div className="usage-example">
          <div className="usage-code">
            <div className="code-block">
              <div className="code-caption">
                <span>components/{example.id === 'gallery' ? 'gallery' : 'photo'}.tsx</span>
                <CopyButton
                  text={example.code}
                  label="Copy usage code"
                  onCopied={() =>
                    trackSiteEvent('Code Copied', { snippet: 'usage', example: example.id })
                  }
                />
              </div>
              <HighlightedCode code={example.code} />
            </div>
            <p className="guide-note">
              {example.id === 'controlled'
                ? 'Use a Client Component to manage zoom state.'
                : 'Works with SSR and React Server Components.'}
            </p>
          </div>
          <UsagePreview key={example.id} exampleId={example.id} />
        </div>
      </div>
    </>
  )
}

function UsagePreview({ exampleId }: { exampleId: UsageExample['id'] }) {
  const [open, setOpen] = React.useState(false)
  const ocean = photos.ocean
  const denali = photos.denali
  const image = exampleId === 'basic' ? ocean : denali
  const imageProps = getPreviewImageProps(image, '(max-width: 440px) calc(100vw - 90px), 360px')
  const photo = <ImageZoom {...imageProps} className="usage-photo" loading="lazy" />

  let content = photo
  if (exampleId === 'composed' || exampleId === 'controlled') {
    content = (
      <div className="usage-controlled">
        <ImageZoomParts.Root
          options={exampleId === 'composed' ? { margin: 32 } : undefined}
          open={exampleId === 'controlled' ? open : undefined}
          onOpenChange={exampleId === 'controlled' ? setOpen : undefined}
        >
          <ImageZoomParts.Trigger
            className="usage-trigger"
            aria-label={`${exampleId === 'composed' ? 'View photo:' : 'Enlarge'} ${image.alt}`}
          >
            <ImageZoomParts.Image {...imageProps} className="usage-photo" loading="lazy" />
            {exampleId === 'composed' && <span className="usage-badge">View photo</span>}
          </ImageZoomParts.Trigger>
        </ImageZoomParts.Root>
        {exampleId === 'controlled' && (
          <button className="button button-secondary" onClick={() => setOpen(true)}>
            Open image
          </button>
        )}
      </div>
    )
  } else if (exampleId === 'gallery') {
    content = (
      <div className="usage-gallery">
        {[ocean, denali, photos.yellowstone].map(item => (
          <ImageZoom
            key={item.src}
            {...getPreviewImageProps(item, '120px')}
            className="usage-photo"
            loading="lazy"
          />
        ))}
      </div>
    )
  } else if (exampleId === 'caption') {
    content = (
      <figure>
        {photo}
        <figcaption>First light in Denali National Park.</figcaption>
      </figure>
    )
  }
  return <div className="usage-preview">{content}</div>
}
