import type { CoreZoomOptions, Zoom, ZoomOpenOptions, ZoomOptions } from './types'

export interface ZoomSession<Options extends CoreZoomOptions = ZoomOptions> {
  readonly zoom: Zoom<Options>
  open(options?: ZoomOpenOptions): Promise<Zoom<Options>>
  close(): Promise<Zoom<Options>>
  /** Cancel queued work, close, detach, and release document listeners. */
  dispose(): Promise<void>
}

const active = new WeakMap<Document, { owner: object; close: () => Promise<unknown> }>()

/** One cancellable owner per document, shared by vanilla and framework adapters. */
export function createZoomSession<Options extends CoreZoomOptions>(
  zoom: Zoom<Options>
): ZoomSession<Options> {
  // Engine methods capture their state; adapters may replace the public methods afterward.
  // oxlint-disable-next-line typescript/unbound-method
  const { open, close, detach } = zoom
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
          return open(options)
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
      ++revision
      if (closing) {
        return closing
      }
      const request = owned
      const result = close()
      const task = Promise.all([pending, completion || result])
        .then(() => {
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
    async dispose() {
      disposed = true
      const closed = session.close()
      detach()
      await closed
    },
  }
  return session
}
