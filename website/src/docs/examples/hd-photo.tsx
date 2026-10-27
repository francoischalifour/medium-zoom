import { ImageZoom } from '@/components/ui/image-zoom'

export function HDPhoto() {
  return (
    <ImageZoom
      src="/assets/images/ocean-sunset-preview.webp"
      data-zoom-src="/assets/images/ocean-sunset.jpg"
      alt="Ocean sunset"
      width={1_920}
      height={1_280}
    />
  )
}
