import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

import { libraryGzipBytes } from '../../website/build/library-size.ts'

const recorded = (record: URL) => JSON.parse(readFileSync(record, 'utf8'))

// Stands in for a runtime whose zlib gives another size for the same file.
function recordOtherSize(record: URL) {
  const previous = recorded(record)
  const gzipBytes = previous.gzipBytes + 1
  writeFileSync(record, JSON.stringify({ ...previous, gzipBytes }))
  return gzipBytes
}

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'library-size-'))
  const library = pathToFileURL(join(directory, 'medium-zoom.min.js'))
  writeFileSync(library, 'export const zoom = () => {}\n'.repeat(200))
  return {
    library,
    record: pathToFileURL(join(directory, 'cache', 'library-size.json')),
    [Symbol.dispose]: () => rmSync(directory, { recursive: true }),
  }
}

void test('a recorded size wins over compressing the same build again', () => {
  using files = fixture()
  const measured = libraryGzipBytes(files.library, files.record)
  assert.equal(recorded(files.record).gzipBytes, measured)
  const other = recordOtherSize(files.record)
  assert.equal(libraryGzipBytes(files.library, files.record), other)
})

void test('a new library build is measured again', () => {
  using files = fixture()
  libraryGzipBytes(files.library, files.record)
  recordOtherSize(files.record)
  writeFileSync(files.library, 'export {}\n')
  const measured = gzipSync('export {}\n', { level: 9 }).length
  assert.equal(libraryGzipBytes(files.library, files.record), measured)
  assert.equal(recorded(files.record).gzipBytes, measured)
})
