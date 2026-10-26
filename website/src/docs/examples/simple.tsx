import { ImageZoom } from '@/components/ui/image-zoom'

export function Photo() {
  return (
    <ImageZoom
      src="/assets/images/ocean-sunset.jpg"
      alt="Ocean sunset"
      width={1_920}
      height={1_280}
    />
  )
}
