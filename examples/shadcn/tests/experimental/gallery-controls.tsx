'use client'

import type { GalleryController, GallerySnapshot } from 'medium-zoom/gallery'
import * as React from 'react'

const Context = React.createContext<{ gallery: GalleryController; state: GallerySnapshot } | null>(
  null
)
function useGallery() {
  const value = React.useContext(Context)
  if (!value) {
    throw new Error('Gallery controls require GalleryControls.Root')
  }
  return value
}

export function Root({
  gallery,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'div'> & { gallery: GalleryController }) {
  const state = React.useSyncExternalStore(
    gallery.subscribe,
    gallery.getSnapshot,
    gallery.getSnapshot
  )
  return (
    <Context.Provider value={{ gallery, state }}>
      <div {...props} role="group" aria-label="Photo navigation" data-slot="gallery-controls">
        {children}
      </div>
    </Context.Provider>
  )
}

export const Previous = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<'button'>
>(function Previous({ onClick, disabled, ...props }, ref) {
  const { gallery, state } = useGallery()
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      disabled={disabled}
      aria-disabled={!state.canPrevious}
      data-slot="gallery-previous"
      onClick={event => {
        onClick?.(event)
        if (!event.defaultPrevented && state.canPrevious) {
          void gallery.previous()
        }
      }}
    />
  )
})
export const Next = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<'button'>>(
  function Next({ onClick, disabled, ...props }, ref) {
    const { gallery, state } = useGallery()
    return (
      <button
        {...props}
        ref={ref}
        type="button"
        disabled={disabled}
        aria-disabled={!state.canNext}
        data-slot="gallery-next"
        onClick={event => {
          onClick?.(event)
          if (!event.defaultPrevented && state.canNext) {
            void gallery.next()
          }
        }}
      />
    )
  }
)
export function Position(props: React.ComponentPropsWithoutRef<'span'>) {
  const { state } = useGallery()
  return (
    <span
      {...props}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-slot="gallery-position"
    >
      {state.index + 1} / {state.images.length}
    </span>
  )
}
