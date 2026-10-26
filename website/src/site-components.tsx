import snippets from './highlighted-snippets.json'
import * as React from 'react'

const iconPaths = {
  chat: (
    <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
  ),
  external: (
    <>
      <path d="M15 3h6v6m0-6L10 14" />
      <path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="7" />
      <path d="m16 16 5 5" />
    </>
  ),
  book: (
    <>
      <path d="M12 7v14" />
      <path d="M3 3h4a5 5 0 0 1 5 5v13a4 4 0 0 0-4-4H3z" />
      <path d="M21 3h-4a5 5 0 0 0-5 5v13a4 4 0 0 1 4-4h5z" />
    </>
  ),
  contrast: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18m0-13 3.4-3.4M12 13l6.7-6.7M12 18l8.7-8.7m-5.2 11 5.1-5.1" />
    </>
  ),
  zoom: (
    <>
      <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
      <path d="M8 12h8m-4-4v8" />
    </>
  ),
  github: (
    <path
      fill="currentColor"
      stroke="none"
      d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03a9.58 9.58 0 0 1 5 0c1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.58 4.94.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
    />
  ),
  layers: <path d="m12 3 10 5-10 5L2 8l10-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />,
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="13" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  code: (
    <>
      <path d="m7 7-5 5 5 5m10-10 5 5-5 5m-4-14-2 18" />
    </>
  ),
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  moon: <path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z" />,
  keyboard: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 15h10" />
    </>
  ),
}

export function Icon({
  name,
  ...props
}: React.SVGProps<SVGSVGElement> & { name: keyof typeof iconPaths }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {iconPaths[name]}
    </svg>
  )
}

export function CopyButton({
  text,
  label,
  onCopied,
}: {
  text: string
  label: string
  onCopied?: () => void
}) {
  const [status, setStatus] = React.useState<'idle' | 'copied' | 'failed'>('idle')
  React.useEffect(() => {
    if (status === 'idle') return
    const timer = window.setTimeout(() => setStatus('idle'), 2_500)
    return () => window.clearTimeout(timer)
  }, [status])
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setStatus('copied')
      onCopied?.()
    } catch {
      setStatus('failed')
    }
  }
  return (
    <span className="copy-control">
      <button className="icon-button" aria-label={label} title={label} onClick={() => void copy()}>
        <Icon name={status === 'copied' ? 'check' : 'copy'} />
      </button>
      <span role="status" className={`copy-status ${status !== 'idle' ? 'is-visible' : ''}`}>
        {status === 'copied'
          ? 'Copied to clipboard'
          : status === 'failed'
            ? 'Select the text to copy.'
            : ''}
      </span>
    </span>
  )
}

export function CodeTokens({ code }: { code: string }) {
  const html = (snippets as Record<string, string>)[code]
  return (
    <span dangerouslySetInnerHTML={html ? { __html: html } : undefined}>
      {html ? undefined : code}
    </span>
  )
}

export function HighlightedCode({ code }: { code: string }) {
  return (
    <pre tabIndex={0}>
      <code>
        <CodeTokens code={code} />
      </code>
    </pre>
  )
}

export function ZoomControls({ descriptionId }: { descriptionId?: string }) {
  return (
    <span className="zoom-controls">
      <span aria-hidden="true">Click to zoom</span>
      <span aria-hidden="true">/</span>
      <span aria-hidden="true">
        Click, <kbd>esc</kbd> or scroll to close
      </span>
      <span id={descriptionId} className="sr-only">
        Press Enter or Space to zoom. Click, press Escape, or scroll to close.
      </span>
    </span>
  )
}
