export const galleryAssetBase = '/assets/'

export type ExampleImage = {
  id: string
  label: string
  src: string
  preview: string
  alt: string
  width: number
  height: number
  format: 'landscape' | 'portrait' | 'square'
  credit?: { name: string; author: string; url: string }
}
export const photos = {
  ocean: {
    id: 'landscape',
    label: 'Landscape',
    src: 'images/ocean-sunset.jpg',
    preview: 'images/ocean-sunset-preview.webp',
    alt: 'Ocean sunset',
    width: 1_920,
    height: 1_280,
    format: 'landscape',
  },
  denali: {
    id: 'denali',
    label: 'Mountains',
    src: 'images/denali.jpg',
    preview: 'images/denali-preview.webp',
    alt: 'Denali at sunrise',
    width: 2_400,
    height: 1_594,
    format: 'landscape',
    credit: {
      name: 'NPS',
      author: 'NPS / Tim Rains',
      url: 'https://commons.wikimedia.org/wiki/File:Sunrise_alpenglow_on_Denali_(2d132bc3-1dd8-b71c-070a-c85787da1af2).jpg',
    },
  },
  gardenCat: {
    id: 'portrait',
    label: 'Portrait',
    src: 'images/portrait.jpg',
    preview: 'images/portrait-preview.webp',
    alt: 'Cat in the garden',
    width: 1_280,
    height: 1_920,
    format: 'portrait',
  },
  earth: {
    id: 'earth',
    label: 'Earth',
    src: 'images/earth.webp',
    preview: 'images/earth.webp',
    alt: 'Earth from space',
    width: 1_041,
    height: 1_041,
    format: 'square',
    credit: {
      name: 'NASA',
      author: 'NASA / DSCOVR EPIC',
      url: 'https://www.nasa.gov/image-article/nasa-captures-epic-earth-image/',
    },
  },
  arch: {
    id: 'roosevelt',
    label: 'Architecture',
    src: 'images/roosevelt.jpg',
    preview: 'images/roosevelt-preview.webp',
    alt: 'Roosevelt Arch',
    width: 1_600,
    height: 2_400,
    format: 'portrait',
    credit: {
      name: 'NPS',
      author: 'NPS / Jacob W. Frank',
      url: 'https://commons.wikimedia.org/wiki/File:Fall_sunrise_at_Roosevelt_Arch_(portrait)_(48959634466).jpg',
    },
  },
  aurora: {
    id: 'aurora',
    label: 'Aurora',
    src: 'images/aurora.jpg',
    preview: 'images/aurora-preview.webp',
    alt: 'Aurora over Yellowstone',
    width: 2_400,
    height: 1_600,
    format: 'landscape',
    credit: {
      name: 'NPS',
      author: 'NPS / A. Falgoust',
      url: 'https://commons.wikimedia.org/wiki/File:Polarlicht_(Aurora_borealis)_%C3%BCber_dem_Yellowstone_River.jpg',
    },
  },
  yellowstone: {
    id: 'yellowstone',
    label: 'Sunrise',
    src: 'images/yellowstone.jpg',
    preview: 'images/yellowstone-preview.webp',
    alt: 'Yellowstone at sunrise',
    width: 2_400,
    height: 1_600,
    format: 'landscape',
    credit: {
      name: 'NPS',
      author: 'NPS / Jacob W. Frank',
      url: 'https://commons.wikimedia.org/wiki/File:Sunrise_near_Terrace_Spring_(46559944424).jpg',
    },
  },
} satisfies Record<string, ExampleImage>

export const galleryImages: ExampleImage[] = [
  photos.ocean,
  photos.gardenCat,
  photos.denali,
  photos.earth,
  photos.arch,
  photos.aurora,
]

export function usageCode(image: ExampleImage, kind: 'react' | 'javascript' = 'react') {
  if (kind === 'javascript')
    return `<img
  src="https://medium-zoom.francoischalifour.com/assets/${image.src}"
  alt="${image.alt}"
  width="${image.width}"
  height="${image.height}"
  data-zoomable
>`
  return `import { ImageZoom } from "@/components/ui/image-zoom"

export function Photo() {
  return (
    <ImageZoom
      src="https://medium-zoom.francoischalifour.com/assets/${image.src}"
      alt="${image.alt}"
      width={${image.width}}
      height={${image.height}}
      className="rounded-lg"
    />
  )
}`
}

export const javascriptUsageCode = `import mediumZoom from 'medium-zoom'

mediumZoom('[data-zoomable]', {
  margin: 24,
  background: 'var(--background, #fff)',
})`
