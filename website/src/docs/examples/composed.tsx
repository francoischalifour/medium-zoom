import * as ImageZoom from '@/components/ui/image-zoom'

export function ComposedPhoto() {
  return (
    <ImageZoom.Root options={{ margin: 32 }}>
      <ImageZoom.Trigger
        aria-label="View photo: ocean sunset"
        className="photo-trigger"
      >
        <ImageZoom.Image
          src="/assets/images/ocean-sunset.jpg"
          alt="Ocean sunset"
          width={1_920}
          height={1_280}
        />
        <span>View photo</span>
      </ImageZoom.Trigger>
    </ImageZoom.Root>
  )
}
