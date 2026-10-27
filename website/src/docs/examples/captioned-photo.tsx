import { ImageZoom } from '@/components/ui/image-zoom'

import './captioned-photo.css'

export function CaptionedPhoto() {
  return (
    <figure className="captioned-photo">
      <ImageZoom
        src="/assets/images/ocean-sunset.jpg"
        alt="Ocean sunset"
        width={1_920}
        height={1_280}
        options={{
          margin: 32,
          background: 'var(--photo-zoom-background)',
        }}
      />
      <figcaption>Last light over the ocean.</figcaption>
    </figure>
  )
}
