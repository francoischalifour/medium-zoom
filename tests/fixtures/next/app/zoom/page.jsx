import Link from 'next/link'

import photo from '../../../../../assets/images/ocean-sunset.jpg'
import { ImageZoom } from '../../../../../examples/shadcn/src/components/ui/image-zoom'

export const dynamic = 'force-dynamic'

// An async Server Component imports the real client boundary. All props cross the
// RSC transport; no fixture wrapper, copied implementation, or browser globals.
export default async function Page() {
  const caption = await Promise.resolve('Rendered by a Server Component')
  return (
    <main>
      <h1>{caption}</h1>
      <ImageZoom
        src={photo.src}
        alt="Ocean sunset from a Server Component"
        width={photo.width}
        height={photo.height}
        options={{ margin: 32, background: '#fff' }}
        className="server-image"
        style={{ width: 360, height: 'auto', borderRadius: 8 }}
      />
      <p>
        <Link href="/">Back to fixture home</Link>
      </p>
    </main>
  )
}
