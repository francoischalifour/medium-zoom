import type mediumZoom from 'medium-zoom'

declare global {
  interface Window {
    storyEvents: { type: string; target: string }[]
    mediumZoom: typeof mediumZoom
    zoom: ReturnType<typeof mediumZoom>
  }
}
