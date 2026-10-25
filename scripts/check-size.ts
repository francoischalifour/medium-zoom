import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { styleText } from 'node:util'
import { gzipSync } from 'node:zlib'

import budgets from '../size.config.mts'

const formatBytes = (bytes: number) => `${bytes.toLocaleString('en-US')} B`
const pathWidth = Math.max('File'.length, ...budgets.map(({ path }) => path.length))
const sizeWidth = Math.max(
  'Budget'.length,
  ...budgets.map(({ maxBytes }) => formatBytes(maxBytes).length)
)
const remainingWidth = Math.max('Remaining'.length, sizeWidth)
const usedWidth = Math.max('Used'.length, '100.0%'.length)

console.log(
  styleText(
    'bold',
    `${'File'.padEnd(pathWidth)}  ${'Gzip'.padStart(sizeWidth)}  ${'Budget'.padStart(sizeWidth)}  ${'Used'.padStart(usedWidth)}  ${'Remaining'.padStart(remainingWidth)}`
  )
)

for (const { path, maxBytes } of budgets) {
  const size = gzipSync(readFileSync(path), { level: 9 }).length
  const formattedSize = formatBytes(size).padStart(sizeWidth)
  const formattedBudget = formatBytes(maxBytes).padStart(sizeWidth)
  const remaining = maxBytes - size
  const usedPercent = ((size / maxBytes) * 100).toFixed(1)
  const usedColor = size > maxBytes ? 'red' : size >= maxBytes * 0.9 ? 'yellow' : 'green'
  const formattedRemaining = formatBytes(remaining).padStart(remainingWidth)
  const formattedUsed = styleText(usedColor, `${usedPercent}%`.padStart(usedWidth))
  console.log(
    `${path.padEnd(pathWidth)}  ${formattedSize}  ${formattedBudget}  ${formattedUsed}  ${formattedRemaining}`
  )
  assert(size <= maxBytes, `${path} exceeds its existing gzip budget`)
}
