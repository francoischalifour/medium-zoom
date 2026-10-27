'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import * as ImageZoom from '@/components/ui/image-zoom'

import './photo-inspector.css'

export function PhotoInspector() {
  const [open, setOpen] = useState(false)
  const inspectButton = useRef<HTMLButtonElement>(null)

  function closePreview() {
    setOpen(false)
    inspectButton.current?.focus({ preventScroll: true })
  }

  return (
    <section className="asset-inspector" aria-label="Photo inspector">
      <header className="asset-inspector-heading">
        <span>Selected asset</span>
        <span role="status">
          {open ? 'Preview open' : 'Ready to inspect'}
        </span>
      </header>
      <div className="asset-preview">
        <ImageZoom.Root open={open} onOpenChange={setOpen}>
          <ImageZoom.Trigger aria-label="Inspect ocean sunset">
            <ImageZoom.Image
              src="/assets/images/ocean-sunset.jpg"
              alt="Ocean sunset"
              width={1_920}
              height={1_280}
            />
          </ImageZoom.Trigger>
        </ImageZoom.Root>
      </div>
      <div className="asset-inspector-details">
        <div>
          <strong>ocean-sunset.jpg</strong>
          <span>1920 × 1280 · JPEG</span>
        </div>
        <button
          ref={inspectButton}
          type="button"
          onClick={() => setOpen(true)}
        >
          Inspect photo
        </button>
      </div>
      {open &&
        createPortal(
          <div
            className="inspection-toolbar"
            role="toolbar"
            aria-label="Photo inspection"
          >
            <span>Ocean sunset</span>
            <button
              type="button"
              onClick={closePreview}
              aria-keyshortcuts="Escape"
            >
              Close preview <kbd aria-hidden="true">Esc</kbd>
            </button>
          </div>,
          document.body
        )}
    </section>
  )
}
