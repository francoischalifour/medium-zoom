import { photos, usageCode } from './gallery.ts'

const imageImport = 'import { ImageZoom } from "@/components/ui/image-zoom"'
const assets = 'https://medium-zoom.francoischalifour.com/assets/images/'

export const usageExamples = [
  {
    id: 'basic',
    label: 'Basic',
    description:
      'Pass your source, alt text, and styles. The component handles zoom and keyboard access.',
    code: usageCode(photos.ocean),
  },
  {
    id: 'composed',
    label: 'Composed',
    description: 'Style the trigger and image separately. Add a label inside the button.',
    code: `import * as ImageZoom from "@/components/ui/image-zoom"

export function Photo() {
  return (
    <ImageZoom.Root options={{ margin: 32 }}>
      <ImageZoom.Trigger
        aria-label="View photo: Denali at sunrise"
        className="relative rounded-xl"
      >
        <ImageZoom.Image
          src="${assets}denali.jpg"
          alt="Denali at sunrise"
          className="rounded-xl"
        />
        <span className="absolute bottom-3 right-3">View photo</span>
      </ImageZoom.Trigger>
    </ImageZoom.Root>
  )
}`,
  },
  {
    id: 'controlled',
    label: 'Controlled',
    description: 'Own the open state. Trigger activation and dismissal call onOpenChange.',
    code: `"use client"

import * as React from "react"
import * as ImageZoom from "@/components/ui/image-zoom"

export function Photo() {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <ImageZoom.Root open={open} onOpenChange={setOpen}>
        <ImageZoom.Trigger aria-label="Enlarge Denali at sunrise">
          <ImageZoom.Image
            src="${assets}denali.jpg"
            alt="Denali at sunrise"
            className="rounded-xl"
          />
        </ImageZoom.Trigger>
      </ImageZoom.Root>
      <button onClick={() => setOpen(true)}>Open image</button>
    </>
  )
}`,
  },
  {
    id: 'caption',
    label: 'With caption',
    description: 'Compose with figure and figcaption to keep the caption alongside your image.',
    code: `${imageImport}

export function Photo() {
  return (
    <figure className="space-y-3">
      <ImageZoom
        src="${assets}denali.jpg"
        alt="Denali at sunrise"
        width={2400}
        height={1594}
        className="rounded-lg"
      />
      <figcaption className="text-sm text-muted-foreground">
        First light in Denali National Park.
      </figcaption>
    </figure>
  )
}`,
  },
  {
    id: 'gallery',
    label: 'Gallery',
    description: 'Map your photos into a grid. Each image opens independently.',
    code: `${imageImport}

const photos = [
  { src: "${assets}ocean-sunset.jpg", alt: "Ocean sunset", width: 1920, height: 1280 },
  { src: "${assets}denali.jpg", alt: "Denali at sunrise", width: 2400, height: 1594 },
  { src: "${assets}yellowstone.jpg", alt: "Yellowstone at sunrise", width: 2400, height: 1600 },
]

export function Gallery() {
  return (
    <div className="grid grid-cols-3 items-start gap-3">
      {photos.map(photo => (
        <ImageZoom
          key={photo.src}
          {...photo}
          className="h-auto w-full rounded-lg"
        />
      ))}
    </div>
  )
}`,
  },
  {
    id: 'hd',
    label: 'High resolution',
    description: 'Load a small preview first. Fetch the full-resolution image when zoom opens.',
    code: `${imageImport}

export function Photo() {
  return (
    <ImageZoom
      src="${assets}denali-preview.webp"
      data-zoom-src="${assets}denali.jpg"
      alt="Denali at sunrise"
      width={2400}
      height={1594}
      className="rounded-lg"
    />
  )
}`,
  },
] as const
