import * as ImageZoom from '@/components/ui/image-zoom'

import './custom-trigger-photo.css'

export function CustomTriggerPhoto() {
  return (
    <ImageZoom.Root options={{ margin: 32 }}>
      <figure className="custom-trigger-example">
        <ImageZoom.Image
          src="/assets/images/ocean-sunset.jpg"
          alt="Ocean sunset"
          width={1_920}
          height={1_280}
        />
        <figcaption>
          <span>Ocean sunset</span>
          <ImageZoom.Trigger
            aria-label="View photo: ocean sunset"
            className="photo-action"
          >
            View photo
          </ImageZoom.Trigger>
        </figcaption>
      </figure>
    </ImageZoom.Root>
  )
}
