import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

// The gzipped size of the published browser bundle, as the product pages advertise it.
export function libraryGzipBytes() {
  return gzipSync(readFileSync(new URL('../../dist/medium-zoom.min.js', import.meta.url)), {
    level: 9,
  }).length
}
