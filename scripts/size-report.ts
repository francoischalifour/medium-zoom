export const bytes = (value: number) => `${value.toLocaleString('en-US')} B`

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
