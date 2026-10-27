import Link from 'next/link'

import photo from '../../../../../assets/images/ocean-sunset.jpg'
import * as ImageZoom from '../../../../../examples/shadcn/src/components/ui/image-zoom'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const caption = await Promise.resolve('Rendered by a Server Component')
  return (
    <main>
      <h1>{caption}</h1>
      <ImageZoom.Root options={{ margin: 32, background: '#fff' }}>
        <ImageZoom.Trigger
          className="server-image"
          aria-label="Zoom image: Ocean sunset from a Server Component"
        >
          <ImageZoom.Image
            src={photo.src}
            alt="Ocean sunset from a Server Component"
            width={photo.width}
            height={photo.height}
            style={{ width: 360, height: 'auto', borderRadius: 8 }}
          />
        </ImageZoom.Trigger>
      </ImageZoom.Root>
      <p>
        <Link href="/">Back to fixture home</Link>
      </p>
    </main>
  )
}
