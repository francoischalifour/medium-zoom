import type { GallerySource } from './engine/types'
import type { CoreZoomOptions, Zoom, ZoomOptions, ZoomSelector } from './types'

export interface GallerySnapshot {
  readonly images: readonly HTMLElement[]
  readonly current: HTMLElement | null
  readonly index: number
  readonly canPrevious: boolean
  readonly canNext: boolean
}

export interface GalleryController<Options extends CoreZoomOptions = ZoomOptions> {
  getSnapshot(this: void): GallerySnapshot
  subscribe(this: void, listener: () => void): () => void
  previous(): Promise<Zoom<Options>>
  next(): Promise<Zoom<Options>>
  select(index: number): Promise<Zoom<Options>>
  attach(...selectors: ZoomSelector[]): void
  detach(...selectors: ZoomSelector[]): void
  /** Release subscriptions. The caller retains ownership of the zoom/session. */
  dispose(): void
}

const galleries = new WeakMap<object, unknown>()

/** Headless traversal over an instance's attached images. No UI or session ownership. */
export function createGallery<Options extends CoreZoomOptions>(
  zoom: Zoom<Options>
): GalleryController<Options> {
  const existing = galleries.get(zoom) as GalleryController<Options> | undefined
  if (existing) {
    return existing
  }
  const source = zoom as unknown as GallerySource
  const select = source.__mz_select
  if (!select) {
    throw new Error('Medium Zoom gallery requires a modal renderer')
  }
  const listeners = new Set<() => void>()
  let disposed = false
  let snapshot: GallerySnapshot = {
    images: [],
    current: null,
    index: -1,
    canPrevious: false,
    canNext: false,
  }
  const getSnapshot = () => {
    const images = zoom.getImages()
    const current = zoom.getZoomedImage() || null
    if (
      current !== snapshot.current ||
      images.length !== snapshot.images.length ||
      images.some((image, index) => image !== snapshot.images[index])
    ) {
      const index = images.indexOf(current!)
      snapshot = {
        images: images.slice(),
        current,
        index,
        canPrevious: index > 0,
        canNext: index >= 0 && index < images.length - 1,
      }
    }
    return snapshot
  }
  const notify = () => {
    getSnapshot()
    listeners.forEach(listener => listener())
  }
  const choose = (index: number) => {
    const target = getSnapshot().images[index]
    return !disposed && target ? (select(target) as Promise<Zoom<Options>>) : Promise.resolve(zoom)
  }
  zoom.on('open', notify).on('closed', notify)
  const controller: GalleryController<Options> = {
    getSnapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    previous() {
      return getSnapshot().canPrevious ? choose(snapshot.index - 1) : Promise.resolve(zoom)
    },
    next() {
      return getSnapshot().canNext ? choose(snapshot.index + 1) : Promise.resolve(zoom)
    },
    select: choose,
    attach(...selectors) {
      if (!disposed) {
        zoom.attach(...selectors)
        notify()
      }
    },
    detach(...selectors) {
      if (!disposed) {
        zoom.detach(...selectors)
        notify()
      }
    },
    dispose() {
      disposed = true
      zoom.off('open', notify).off('closed', notify)
      listeners.clear()
      galleries.delete(zoom)
    },
  }
  galleries.set(zoom, controller)
  return controller
}
