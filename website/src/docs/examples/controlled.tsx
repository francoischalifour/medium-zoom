'use client'

import { useState } from 'react'

import * as ImageZoom from '@/components/ui/image-zoom'

export function ControlledPhoto() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <ImageZoom.Root open={open} onOpenChange={setOpen}>
        <ImageZoom.Trigger>
          <ImageZoom.Image
            src="/assets/images/ocean-sunset.jpg"
            alt="Ocean sunset"
            width={1_920}
            height={1_280}
          />
        </ImageZoom.Trigger>
      </ImageZoom.Root>
      <button type="button" onClick={() => setOpen(true)}>
        Open image
      </button>
      <p role="status">{open ? 'Image is open' : 'Image is closed'}</p>
    </div>
  )
}
