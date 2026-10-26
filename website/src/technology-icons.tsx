import type * as React from 'react'

export function JavaScriptIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M0 0h24v24H0zM6.3 19.1c.5 1 1.4 1.8 3 1.8 1.8 0 3-1 3-3.2v-7.3h-2.2v7.3c0 1.1-.4 1.4-1.1 1.4-.7 0-1-.5-1.3-1zm7.2-.4c.6 1.2 1.8 2.2 3.7 2.2 2 0 3.5-1 3.5-2.9 0-1.7-1-2.4-2.7-3.1l-.5-.2c-.9-.4-1.3-.6-1.3-1.2 0-.5.4-.9 1-.9.7 0 1.1.3 1.5 1l1.7-1.1c-.7-1.2-1.7-1.7-3.2-1.7-2 0-3.2 1.2-3.2 2.8 0 1.8 1.1 2.5 2.6 3.1l.5.2c1 .5 1.5.7 1.5 1.3 0 .5-.5.9-1.4.9-1 0-1.6-.5-2-1.2z"
        fillRule="evenodd"
      />
    </svg>
  )
}

export function ReactIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="11" ry="4.2" />
      <ellipse cx="12" cy="12" rx="11" ry="4.2" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="11" ry="4.2" transform="rotate(120 12 12)" />
    </svg>
  )
}
