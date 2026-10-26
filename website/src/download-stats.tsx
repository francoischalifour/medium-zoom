import { useEffect, useRef, useState } from 'react'
import snapshot from './npm-downloads.json'
import { fetchNpmDownloads } from './npm-downloads'

let reportedDownloads: ReturnType<typeof fetchNpmDownloads> | undefined
const number = new Intl.NumberFormat('en-US')
const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' })

export function DownloadStats() {
  const [downloads, setDownloads] = useState(snapshot)
  const [entered, setEntered] = useState(false)
  const totalRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let active = true
    reportedDownloads ??= fetchNpmDownloads(snapshot).catch(() => snapshot)
    void reportedDownloads.then(value => {
      if (active) setDownloads(value)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const element = totalRef.current!
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.5)) {
          setEntered(true)
          observer.disconnect()
        }
      },
      { threshold: 0.5, rootMargin: '0px 0px -32px 0px' }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="download-stats" aria-label="npm downloads" data-entered={entered}>
      <noscript>
        <style>{'.download-digits { opacity: 1 !important; transform: none !important; }'}</style>
      </noscript>
      <a href="https://www.npmjs.com/package/medium-zoom" className="download-total">
        <span className="sr-only">{number.format(downloads.total)} total downloads on npm</span>
        <span className="download-digits" aria-hidden="true" ref={totalRef}>
          {number.format(downloads.total)}
        </span>
        <span aria-hidden="true">total downloads</span>
      </a>
      <p className="download-weekly">
        <strong>{number.format(downloads.weekly)}</strong> weekly downloads
      </p>
      <p className="download-date">
        npm · Reported through{' '}
        <time dateTime={downloads.end}>{date.format(new Date(`${downloads.end}T00:00:00Z`))}</time>
      </p>
    </section>
  )
}
