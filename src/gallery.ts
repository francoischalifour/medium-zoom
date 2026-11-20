// Branded types must come from the core entry itself, not a copy bundled into this one.
import type { ModalZoom } from 'medium-zoom/core'

import type { CoreZoomOptions, Zoom, ZoomCommander, ZoomSelector } from './engine/create-zoom'
import type { ZoomOptions } from './medium-zoom'

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

/**
 * Headless traversal over a rendered zoom's attached images. No UI. Pass a session as
 * `commander` to coordinate the gallery's requests with other zooms.
 */
export function createGallery<Options extends CoreZoomOptions>(
  zoom: ModalZoom<Options>,
  commander: ZoomCommander<Options> = zoom
): GalleryController<Options> {
  const existing = galleries.get(zoom) as GalleryController<Options> | undefined
  if (existing) {
    return existing
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
    return !disposed && target ? commander.open({ target }) : Promise.resolve(zoom)
  }
  let queued = false
  const collectionChanged = () => {
    if (queued) {
      return
    }
    queued = true
    // detach notifications precede legacy collection mutation. Observe the settled batch.
    queueMicrotask(() => {
      queued = false
      if (!disposed) {
        notify()
      }
    })
  }
  zoom
    .on('open', notify)
    .on('closed', notify)
    .on('attach', collectionChanged)
    .on('detach', collectionChanged)
  const controller: GalleryController<Options> = {
    getSnapshot,
    subscribe(listener) {
      if (disposed) {
        return () => {}
      }
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
      }
    },
    detach(...selectors) {
      if (!disposed) {
        zoom.detach(...selectors)
      }
    },
    dispose() {
      if (disposed) {
        return
      }
      disposed = true
      zoom
        .off('open', notify)
        .off('closed', notify)
        .off('attach', collectionChanged)
        .off('detach', collectionChanged)
      listeners.clear()
      galleries.delete(zoom)
    },
  }
  galleries.set(zoom, controller)
  return controller
}

export { bindGalleryKeyboard } from './gallery/keyboard'
