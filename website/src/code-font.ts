import regularUrl from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2?url'
import mediumUrl from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2?url'

const faces = { 400: regularUrl, 500: mediumUrl }

// Code renders in the fallback monospace first, so the font never delays the first paint.
export function loadCodeFont() {
  for (const [weight, url] of Object.entries(faces)) {
    const face = new FontFace('IBM Plex Mono', `url(${url}) format('woff2')`, {
      weight,
      display: 'swap',
    })
    document.fonts.add(face)
    void face.load().catch(() => {})
  }
}
