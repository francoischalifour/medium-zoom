export const bytes = (value: number) => `${value.toLocaleString('en-US')} B`

/** A size compared with its baseline: `new` without one, `—` when unchanged. */
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
