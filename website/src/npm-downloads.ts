export type NpmDownloads = {
  total: number
  weekly: number
  start: string
  end: string
}

async function readNpm(period: string, kind: 'point' | 'range') {
  const response = await fetch(`https://api.npmjs.org/downloads/${kind}/${period}/medium-zoom`, {
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    throw new Error(`npm download statistics: ${response.status}`)
  }
  return response.json()
}

// npm reports completed UTC days. Add only days after the verified snapshot.
export async function fetchNpmDownloads(
  baseline: Pick<NpmDownloads, 'total' | 'end'>
): Promise<NpmDownloads> {
  const endDate = new Date()
  endDate.setUTCHours(0, 0, 0, 0)
  endDate.setUTCDate(endDate.getUTCDate() - 1)
  const end = endDate.toISOString().slice(0, 10)
  endDate.setUTCDate(endDate.getUTCDate() - 6)
  const weekStart = endDate.toISOString().slice(0, 10)
  const weekly = await readNpm(`${weekStart}:${end}`, 'point')
  if (
    weekly.package !== 'medium-zoom' ||
    !Number.isSafeInteger(weekly.downloads) ||
    weekly.downloads < 0 ||
    weekly.end !== end ||
    weekly.start !== weekStart ||
    weekly.end < baseline.end
  ) {
    throw new Error('Invalid npm reporting period')
  }

  const nextDay = new Date(`${baseline.end}T00:00:00Z`)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const start = nextDay.toISOString().slice(0, 10)
  const ranges: Promise<number>[] = []
  for (let year = Number(start.slice(0, 4)); year <= Number(weekly.end.slice(0, 4)); year++) {
    const from = start > `${year}-01-01` ? start : `${year}-01-01`
    const to = weekly.end < `${year}-12-31` ? weekly.end : `${year}-12-31`
    if (from > to) {
      continue
    }
    ranges.push(
      readNpm(`${from}:${to}`, 'range').then(range => {
        const expectedDays = (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1
        if (
          range.start !== from ||
          range.end !== to ||
          range.package !== 'medium-zoom' ||
          !Array.isArray(range.downloads) ||
          range.downloads.length !== expectedDays
        ) {
          throw new Error('Incomplete npm download history')
        }
        return range.downloads.reduce(
          (total: number, day: { day: string; downloads: number }, index: number) => {
            const date = new Date(Date.parse(from) + index * 86_400_000).toISOString().slice(0, 10)
            if (day.day !== date || !Number.isSafeInteger(day.downloads) || day.downloads < 0) {
              throw new Error('Invalid npm daily download count')
            }
            return total + day.downloads
          },
          0
        )
      })
    )
  }
  const additions = await Promise.all(ranges)
  return {
    total: baseline.total + additions.reduce((sum, count) => sum + count, 0),
    weekly: weekly.downloads,
    start: weekly.start,
    end: weekly.end,
  }
}
