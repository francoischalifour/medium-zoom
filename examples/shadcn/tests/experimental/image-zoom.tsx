'use client'

import {
  type CoreZoomOptions,
  createZoom,
  type ModalZoom,
  type ZoomCloseEventMap,
  type ZoomCloseReason,
  type ZoomEvent,
  type ZoomState,
} from 'medium-zoom/core'
import { loadHdImage } from 'medium-zoom/loaders'
import { dialog } from 'medium-zoom/renderers'
import { containerBounds } from 'medium-zoom/viewport'
import * as React from 'react'

import '../../src/components/ui/image-zoom.css'

/** Core options, plus the bounds to zoom into: an element is measured at each opening. */
export type ZoomOptions = CoreZoomOptions & {
  container?: Parameters<typeof containerBounds>[0]
}

/**
 * Why the zoom asks to open or close: `trigger-press` for the trigger, `disabled` and
 * `source-change` when the component closes it, or the zoom's own close reason.
 */
export type OpenChangeReason =
  'trigger-press' | 'disabled' | 'source-change' | ZoomCloseReason

type OpenChangeEventMap = ZoomCloseEventMap & {
  'trigger-press': MouseEvent
  disabled: never
  'source-change': never
}

/** What `onOpenChange` receives with the next value. Checking `reason` narrows `event`. */
export type OpenChangeDetails<
  Reason extends OpenChangeReason = OpenChangeReason,
> = Reason extends unknown
  ? {
      readonly reason: Reason
      /** The DOM event behind the change; undefined when none caused it. */
      readonly event?: OpenChangeEventMap[Reason]
    }
  : never

export type RootProps = {
  children: React.ReactNode
  disabled?: boolean
  options?: ZoomOptions
  /** Supply this value to control zoom state from the parent. */
  open?: boolean
  /** Whether an uncontrolled zoom opens once mounted. */
  defaultOpen?: boolean
  /** Receives the requested next value and why. Update `open` here when controlled. */
  onOpenChange?: (open: boolean, details: OpenChangeDetails) => void
}

export type TriggerProps = Omit<
  React.ComponentPropsWithoutRef<'button'>,
  'type'
>
export type ImageProps = Omit<
  React.ComponentPropsWithoutRef<'img'>,
  'alt' | 'onClick' | 'onKeyDown' | 'onKeyUp' | 'tabIndex' | 'role'
> & { alt: string; 'data-zoom-src'?: string }

export type ImageZoomProps = ImageProps & Omit<RootProps, 'children'>

const ZoomContext = React.createContext<{
  setImage: React.Dispatch<React.SetStateAction<HTMLImageElement | null>>
  alt: string
  setAlt: React.Dispatch<React.SetStateAction<string>>
  disabled: boolean
  zoomed: boolean
  close: (details: OpenChangeDetails) => void
  toggle: (event: MouseEvent) => void
} | null>(null)

function useZoomContext() {
  const context = React.useContext(ZoomContext)
  if (!context) {
    throw new Error(
      'ImageZoom.Trigger and ImageZoom.Image require ImageZoom.Root.'
    )
  }
  return context
}

const closedState: ZoomState = Object.freeze({
  status: 'closed',
  image: null,
  images: [],
})
const subscribeToNothing = () => () => {}
const getClosedState = () => closedState

/** Warns once when `open` switches between controlled and uncontrolled, as React inputs do. */
function useControlWarnings(open: boolean | undefined, defaultOpen?: boolean) {
  const controlled = React.useRef(open !== undefined)
  const warned = React.useRef(false)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'production' || warned.current) {
      return
    }
    const message =
      open !== undefined && defaultOpen !== undefined
        ? 'ImageZoom.Root received both `open` and `defaultOpen`: `defaultOpen` is ignored while `open` controls the zoom.'
        : controlled.current !== (open !== undefined)
          ? `ImageZoom.Root changed from ${controlled.current ? 'controlled' : 'uncontrolled'} to ${controlled.current ? 'uncontrolled' : 'controlled'}. Decide between \`open\` and \`defaultOpen\` for the lifetime of the component.`
          : ''
    if (message) {
      warned.current = true
      console.error(message)
    }
  })
}

export function Root({
  children,
  disabled = false,
  options,
  open,
  defaultOpen,
  onOpenChange,
}: RootProps) {
  useControlWarnings(open, defaultOpen)
  const [image, setImage] = React.useState<HTMLImageElement | null>(null)
  const [alt, setAlt] = React.useState('')
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    defaultOpen ?? false
  )
  const wantedOpen = !disabled && (open ?? uncontrolledOpen)
  const wantedRef = React.useRef(wantedOpen)
  const changeRef = React.useRef(onOpenChange)
  const requestedRef = React.useRef(wantedOpen)
  const optionsRef = React.useRef(options)
  // The zoom lives in an effect; until it exists, the component reads as closed.
  const [zoom, setZoom] = React.useState<ModalZoom | null>(null)
  const zoomRef = React.useRef<ModalZoom | null>(null)
  const state = React.useSyncExternalStore(
    zoom ? zoom.subscribe : subscribeToNothing,
    zoom ? zoom.getSnapshot : getClosedState,
    getClosedState
  )
  // React must preserve the library's classes when consumers change className while zoomed.
  const zoomed = state.status !== 'closed'

  const requestOpen = React.useCallback(
    (next: boolean, details: OpenChangeDetails) => {
      if (requestedRef.current === next) {
        return
      }
      requestedRef.current = next
      setUncontrolledOpen(next)
      changeRef.current?.(next, details)
    },
    []
  )

  const close = React.useCallback(
    (details: OpenChangeDetails) => {
      requestOpen(false, details)
      void zoomRef.current?.close()
    },
    [requestOpen]
  )

  React.useEffect(() => {
    changeRef.current = onOpenChange
    if (disabled) {
      requestOpen(false, { reason: 'disabled' })
    }
    wantedRef.current = wantedOpen
    requestedRef.current = wantedOpen
  })

  // Update the zoom after commit so an abandoned React render cannot change its options.
  React.useEffect(() => {
    optionsRef.current = options
  }, [options])

  React.useEffect(() => {
    if (disabled || !image) {
      return
    }
    // Strict Mode and Activity can restart this effect while the previous zoom is still
    // closing: the new zoom shares its group, so it opens only once that close ends.
    const lifetime = new AbortController()
    const zoom = createZoom(image, {
      signal: lifetime.signal,
      renderer: dialog(),
      loader: loadHdImage,
      viewport: (bounds, core) =>
        containerBounds(optionsRef.current?.container ?? null)(bounds, core),
    })
    zoomRef.current = zoom
    // The snapshot follows this zoom until the next one replaces it, so a zoom still closing
    // after this effect ends keeps the image hidden until it is gone.
    setZoom(zoom)
    // Listeners from on() hear this zoom only, even once a new zoom takes the image.
    const onClose = ({ detail }: ZoomEvent<'close'>) => {
      if (!lifetime.signal.aborted) {
        requestOpen(false, {
          reason: detail.reason,
          event: detail.event,
        } as OpenChangeDetails)
      }
    }
    zoom.on('close', onClose)
    if (wantedRef.current) {
      openZoom()
    }
    return () => {
      zoomRef.current = null
      setUncontrolledOpen(false)
      zoom.off('close', onClose)
      lifetime.abort()
    }
  }, [disabled, image, requestOpen])

  function openZoom() {
    const zoom = zoomRef.current
    if (!zoom || !image || zoom.getSnapshot().status !== 'closed') {
      return
    }
    zoom.update(resolveOptions(image, optionsRef.current))
    void zoom.open({ trigger: image.closest('button') ?? undefined })
  }

  React.useEffect(() => {
    if (wantedOpen) {
      openZoom()
    } else {
      void zoomRef.current?.close()
    }
  })

  return (
    <ZoomContext.Provider
      value={{
        setImage,
        alt,
        setAlt,
        disabled,
        zoomed,
        close,
        toggle: event => {
          // A controlled owner may decline a request; each new activation can ask again.
          requestedRef.current = wantedRef.current
          requestOpen(!wantedRef.current, { reason: 'trigger-press', event })
        },
      }}
    >
      {children}
    </ZoomContext.Provider>
  )
}

export const Trigger = React.forwardRef<HTMLButtonElement, TriggerProps>(
  function Trigger({ className, onClick, disabled, ...props }, ref) {
    const context = useZoomContext()
    return (
      <button
        {...props}
        ref={ref}
        type="button"
        data-slot="image-zoom-trigger"
        disabled={context.disabled || disabled}
        aria-label={
          props['aria-label'] ??
          (context.alt ? `Zoom image: ${context.alt}` : 'Zoom image')
        }
        className={['image-zoom-trigger', className].filter(Boolean).join(' ')}
        onClick={event => {
          onClick?.(event)
          if (!event.defaultPrevented) {
            context.toggle(event.nativeEvent)
          }
        }}
      />
    )
  }
)

export const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  function Image({ alt, className, style, ...props }, forwardedRef) {
    const { setImage, setAlt, disabled, zoomed, close } = useZoomContext()
    const imageRef = React.useRef<HTMLImageElement>(null)
    const source = [
      props.src,
      props.srcSet,
      props.sizes,
      props['data-zoom-src'],
    ]
    const previousSource = React.useRef(source)
    React.useEffect(() => setAlt(alt), [alt, setAlt])
    React.useImperativeHandle(forwardedRef, () => imageRef.current!, [])
    const attachImage = React.useCallback(
      (image: HTMLImageElement | null) => {
        imageRef.current = image
        setImage(image)
      },
      [setImage]
    )

    React.useEffect(() => {
      if (
        source.some((value, index) => value !== previousSource.current[index])
      ) {
        close({ reason: 'source-change' })
      }
      previousSource.current = source
    }, [props.src, props.srcSet, props.sizes, props['data-zoom-src'], close])

    return (
      <img
        {...props}
        alt={alt}
        ref={attachImage}
        data-slot="image-zoom"
        aria-hidden="true"
        className={[
          className,
          !disabled && 'medium-zoom-image',
          zoomed && 'medium-zoom-image--hidden',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ ...style, pointerEvents: 'none' }}
      />
    )
  }
)

export const ImageZoom = React.forwardRef<HTMLImageElement, ImageZoomProps>(
  function ImageZoom(
    { disabled, options, open, defaultOpen, onOpenChange, ...props },
    ref
  ) {
    return (
      <Root
        disabled={disabled}
        options={options}
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
      >
        <Trigger
          aria-label={
            disabled
              ? props.alt || 'Image'
              : props.alt
                ? `Zoom image: ${props.alt}`
                : 'Zoom image'
          }
        >
          <Image {...props} ref={ref} />
        </Trigger>
      </Root>
    )
  }
)

function resolveOptions(
  image: HTMLImageElement,
  options?: ZoomOptions
): CoreZoomOptions {
  // The overlay lives in document.body, outside themes scoped to the trigger's ancestors.
  const background = image.ownerDocument
    .defaultView!.getComputedStyle(image)
    .getPropertyValue('--background')
    .trim()
  return {
    margin: options?.margin ?? 24,
    scrollOffset: options?.scrollOffset ?? 40,
    background:
      options?.background ??
      (!background
        ? '#fff'
        : CSS.supports('color', background)
          ? background
          : `hsl(${background})`),
  }
}
