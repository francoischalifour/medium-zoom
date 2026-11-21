// Branded types must come from the core entry itself, not a copy bundled into this one.
import type {
  CoreZoomOptions,
  ModalZoom,
  Zoom,
  ZoomCommander,
  ZoomSelector,
} from 'medium-zoom/core'

/** An immutable view of the gallery; a new object whenever anything in it changes. */
export interface GallerySnapshot {
  /** The zoom's images, in attach order. */
  readonly images: readonly HTMLElement[]
  /** The open image, or `null` while the zoom is closed. */
  readonly current: HTMLElement | null
  /** The index of `current` in `images`, or `-1` while the zoom is closed. */
  readonly index: number
  /** Whether `previous()` would open an image. */
  readonly canPrevious: boolean
  /** Whether `next()` would open an image. */
  readonly canNext: boolean
}

/**
 * Headless traversal state and commands; compatible with React's `useSyncExternalStore`.
 * Navigation resolves without opening when there is nothing to open.
 */
export interface GalleryController<
  Options extends CoreZoomOptions = CoreZoomOptions,
> {
  /** Returns the current snapshot; the same object until something changes. */
  getSnapshot(this: void): GallerySnapshot
  /** Calls `listener` after every change. Returns the unsubscribe function. */
  subscribe(this: void, listener: () => void): () => void
  /** Opens the previous image. */
  previous(): Promise<Zoom<Options>>
  /** Opens the next image. */
  next(): Promise<Zoom<Options>>
  /** Opens the image at `index`; an index out of range resolves without opening. */
  select(index: number): Promise<Zoom<Options>>
  /** Attaches images to the zoom, after the current ones. */
  attach(...selectors: ZoomSelector[]): void
  /** Releases images from the zoom. */
  detach(...selectors: ZoomSelector[]): void
  /** Removes listeners and subscriptions. Does not close or detach the zoom. */
  dispose(): void
}

const galleries = new WeakMap<object, unknown>()

/**
 * Headless traversal over a rendered zoom's attached images, in attach order. Creates no UI.
 * Returns the zoom's existing gallery when it has one. Pass a session as `commander` to
 * coordinate the gallery's requests with other zooms.
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
    return !disposed && target
      ? commander.open({ target })
      : Promise.resolve(zoom)
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
      return getSnapshot().canPrevious
        ? choose(snapshot.index - 1)
        : Promise.resolve(zoom)
    },
    next() {
      return getSnapshot().canNext
        ? choose(snapshot.index + 1)
        : Promise.resolve(zoom)
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
