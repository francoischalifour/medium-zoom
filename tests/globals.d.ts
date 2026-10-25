import type mediumZoom from '../src/medium-zoom'

declare global {
  interface Window {
    storyEvents: { type: string; target: string }[]
    mediumZoom: typeof mediumZoom
    zoom: ReturnType<typeof mediumZoom>
  }
}
