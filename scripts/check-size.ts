import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

import budgets from '../size.config.mts'

for (const { path, maxBytes } of budgets) {
  const size = gzipSync(readFileSync(path), { level: 9 }).length
  console.log(`${path}: ${size} B gzip (budget ${maxBytes} B)`)
  assert(size <= maxBytes, `${path} exceeds its existing gzip budget`)
}
