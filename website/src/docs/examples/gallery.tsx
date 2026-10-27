import { ImageZoom } from '@/components/ui/image-zoom'

import './gallery.css'

export function Gallery() {
  return (
    <div className="photo-gallery">
      <ImageZoom
        src="/assets/images/ocean-sunset.jpg"
        alt="Ocean sunset"
        width={1_920}
        height={1_280}
      />
      <ImageZoom
        src="/assets/images/denali.jpg"
        alt="Denali at sunrise"
        width={2_400}
        height={1_594}
      />
      <ImageZoom
        src="/assets/images/yellowstone.jpg"
        alt="Yellowstone at sunrise"
        width={2_400}
        height={1_600}
      />
      <ImageZoom
        src="/assets/images/aurora.jpg"
        alt="Aurora over Yellowstone"
        width={2_400}
        height={1_600}
      />
    </div>
  )
}
