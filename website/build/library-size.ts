import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

export function libraryGzipBytes() {
  return gzipSync(
    readFileSync(new URL('../../dist/medium-zoom.min.js', import.meta.url)),
    {
      level: 9,
    }
  ).length
}
