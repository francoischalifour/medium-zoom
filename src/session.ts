import type { CoordinatedZoom, ZoomCommands } from './engine/bridge'
import type { CoreZoomOptions, Zoom, ZoomOpenOptions, ZoomOptions } from './types'

export interface ZoomSession<Options extends CoreZoomOptions = ZoomOptions> {
  readonly zoom: Zoom<Options>
  open(options?: ZoomOpenOptions): Promise<Zoom<Options>>
  close(): Promise<Zoom<Options>>
  /** Close/detach and release coordination. The zoom can be reattached and coordinated again. */
  dispose(): Promise<void>
}

const sessions = new WeakMap<object, unknown>()
const active = new WeakMap<Document, { owner: object; close: () => Promise<unknown> }>()

/** One cancellable owner per document, shared by vanilla and framework adapters. */
export function createZoomSession<Options extends CoreZoomOptions>(
  zoom: Zoom<Options>
): ZoomSession<Options> {
  const existing = sessions.get(zoom) as ZoomSession<Options> | undefined
  if (existing) {
    return existing
  }
  const source = zoom as CoordinatedZoom<Options>
  if (!source.__mz$coordinate) {
    throw new Error('Medium Zoom session requires a compatible engine')
  }
  let engine!: ZoomCommands<Options>
  let released = false
  let disposal: Promise<void> | undefined
  const documents = new Set<Document>()
  let revision = 0
  let disposed = false
  let owned: { owner: object; close: () => Promise<unknown> } | undefined
  let mounted: typeof owned
  let pending: Promise<Zoom<Options>> | undefined
  let closing: Promise<Zoom<Options>> | undefined
  let completion: Promise<void> | undefined
  let complete: (() => void) | undefined
  const onClose = (event: Event) => {
    if ((event as CustomEvent).detail.zoom !== zoom || completion) {
      return
    }
    completion = new Promise(resolve => {
      complete = resolve
    })
  }
  const onClosed = (event: Event) => {
    if ((event as CustomEvent).detail.zoom !== zoom) {
      return
    }
    const document = event.currentTarget as Document
    if (active.get(document) === mounted) {
      active.delete(document)
    }
    document.removeEventListener('medium-zoom:close', onClose, true)
    document.removeEventListener('medium-zoom:closed', onClosed, true)
    documents.delete(document)
    complete?.()
    completion = undefined
    complete = undefined
  }
  const session: ZoomSession<Options> = {
    zoom,
    open(options) {
      const image = options?.target || zoom.getImages()[0]
      if (disposed || !image || !zoom.getImages().includes(image)) {
        return Promise.resolve(zoom)
      }
      const document = image.ownerDocument
      const previous = active.get(document)
      if (
        previous?.owner === session &&
        !closing &&
        zoom.getZoomedImage() &&
        image !== zoom.getZoomedImage()
      ) {
        return engine.open(options)
      }
      if (previous?.owner === session && pending) {
        return pending
      }
      if (previous?.owner === session && zoom.getZoomedImage() && !closing) {
        return Promise.resolve(zoom)
      }
      const request = { owner: session, close: () => session.close() }
      active.set(document, request)
      owned = request
      const waiting = previous?.owner === session ? closing : previous?.close()
      const ticket = ++revision
      const opening = Promise.resolve(waiting)
        .then(() => {
          if (disposed || ticket !== revision || active.get(document) !== request) {
            return zoom
          }
          if (!documents.has(document)) {
            documents.add(document)
            document.addEventListener('medium-zoom:close', onClose, true)
            document.addEventListener('medium-zoom:closed', onClosed, true)
          }
          mounted = request
          return engine.open(options)
        })
        .finally(() => {
          if (pending === opening) {
            pending = undefined
          }
          if (!zoom.getZoomedImage() && active.get(document) === request) {
            active.delete(document)
          }
        })
      pending = opening
      return opening
    },
    close() {
      if (released) {
        return Promise.resolve(zoom)
      }
      ++revision
      if (closing) {
        return closing
      }
      const request = owned
      const result = engine.close()
      const task = Promise.allSettled([pending, result, completion])
        .then(results => {
          for (const document of documents) {
            if (active.get(document) === request) {
              active.delete(document)
            }
          }
          for (const document of documents) {
            document.removeEventListener('medium-zoom:close', onClose, true)
            document.removeEventListener('medium-zoom:closed', onClosed, true)
          }
          documents.clear()
          const physical = results[1]!
          if (physical.status === 'rejected') {
            throw physical.reason
          }
          return zoom
        })
        .finally(() => {
          if (closing === task) {
            closing = undefined
          }
        })
      closing = task
      return task
    },
    dispose() {
      if (disposal) {
        return disposal
      }
      disposed = true
      const closed = session.close()
      engine.detach()
      disposal = closed
        .then(() => undefined)
        .finally(() => {
          release()
          released = true
          if (sessions.get(zoom) === session) {
            sessions.delete(zoom)
          }
        })
      return disposal
    },
  }
  const release = source.__mz$coordinate(physical => {
    engine = physical
    return {
      open: options => session.open(options),
      close: () => session.close(),
      toggle: options =>
        pending || zoom.getZoomedImage() ? session.close() : session.open(options),
      detach(...selectors) {
        void session.close()
        return physical.detach(...selectors)
      },
    }
  })
  sessions.set(zoom, session)
  return session
}
