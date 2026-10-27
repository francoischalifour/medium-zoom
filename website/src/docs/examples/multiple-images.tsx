import { ImageZoom } from '@/components/ui/image-zoom'

import './multiple-images.css'

const photos = [
  {
    src: '/assets/images/ocean-sunset.jpg',
    alt: 'Ocean sunset',
    width: 1_920,
    height: 1_280,
  },
  {
    src: '/assets/images/denali.jpg',
    alt: 'Denali at sunrise',
    width: 2_400,
    height: 1_594,
  },
  {
    src: '/assets/images/yellowstone.jpg',
    alt: 'Yellowstone at sunrise',
    width: 2_400,
    height: 1_600,
  },
  {
    src: '/assets/images/aurora.jpg',
    alt: 'Aurora over Yellowstone',
    width: 2_400,
    height: 1_600,
  },
]

export function MultipleImages() {
  return (
    <div className="photo-gallery">
      {photos.map(photo => (
        <ImageZoom key={photo.src} {...photo} />
      ))}
    </div>
  )
}
