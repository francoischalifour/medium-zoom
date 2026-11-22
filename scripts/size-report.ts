import { execFileSync } from 'node:child_process'

export const bytes = (value: number) => `${value.toLocaleString('en-US')} B`

export function change(current: number, before: number | undefined) {
  if (before === undefined) {
    return 'new'
  }
  if (current === before) {
    return '—'
  }
  return `${current > before ? '+' : '−'}${bytes(Math.abs(current - before))}`
}

export function table(headers: string[], rows: string[][]) {
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map(row => row[column]!.length))
  )
  const row = (cells: string[]) =>
    cells.map((cell, column) => cell.padEnd(widths[column]!)).join('  ')
  console.log(row(headers))
  console.log(widths.map(width => '─'.repeat(width)).join('  '))
  rows.forEach(cells => console.log(row(cells)))
}

export function markdownTable(headers: string[], rows: string[][]) {
  const row = (cells: string[]) => `| ${cells.join(' | ')} |`
  console.log(row(headers))
  console.log(row(headers.map(() => '---')))
  rows.forEach(cells => console.log(row(cells)))
}

/**
 * The commit that last recorded a baseline file, read from git so it survives squash
 * merges: a revision written into the file would name a commit that never lands.
 */
export function baselineSource(path: string) {
  const git = (...args: string[]) => {
    try {
      return execFileSync('git', args, { encoding: 'utf8' }).trim()
    } catch {
      return ''
    }
  }
  if (git('status', '--porcelain', '--', path)) {
    return `uncommitted ${path}`
  }
  const commit = git('log', '-1', '--format=%h', '--', path)
  return commit ? `${path} from ${commit}` : path
}
