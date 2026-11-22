import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const defaultLibrary = new URL('../../dist/medium-zoom.min.js', import.meta.url)
const defaultRecord = new URL('../../.cache/library-size.json', import.meta.url)

type SizeRecord = { sha256: string; gzipBytes: number }

/**
 * The gzip size the website shows. Bun's and Node's zlib can differ by a few bytes at
 * level 9, and the site build runs under both, so the first step to measure a library
 * build records its size under the file's hash and every later step reads that record.
 * The website tests read the same record.
 */
export function libraryGzipBytes(
  library = defaultLibrary,
  record = defaultRecord
): number {
  const code = readFileSync(library)
  const sha256 = hash(code)
  const recorded = readRecord(record)
  if (recorded?.sha256 === sha256) {
    return recorded.gzipBytes
  }
  const gzipBytes = gzipSync(code, { level: 9 }).length
  mkdirSync(new URL('.', record), { recursive: true })
  // Rename so that a concurrent reader never sees a partial record.
  const partial = new URL(`${record.href}.${process.pid}`)
  writeFileSync(partial, JSON.stringify({ sha256, gzipBytes }))
  renameSync(partial, record)
  return gzipBytes
}

function hash(code: Uint8Array) {
  return createHash('sha256').update(code).digest('hex')
}

function readRecord(record: URL): SizeRecord | undefined {
  try {
    return JSON.parse(readFileSync(record, 'utf8'))
  } catch {
    return undefined
  }
}
