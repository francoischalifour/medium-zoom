import { ZoomableDiagram } from './zoomable-diagram'

import './generated-diagram.css'

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="720" viewBox="0 0 1440 720">
  <rect width="1440" height="720" rx="24" fill="#f1f5f2" />
  <g font-family="system-ui, sans-serif">
    <text x="96" y="112" fill="#527361" font-size="24" letter-spacing="4">PUBLISHING WORKFLOW</text>
    <text x="96" y="180" fill="#182d23" font-size="48" font-weight="600">From draft to delivery</text>
    <path d="M448 390h48m-12-12 12 12-12 12M896 390h48m-12-12 12 12-12 12"
          fill="none" stroke="#527361" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    <g fill="#fff" stroke="#cedbd2" stroke-width="2">
      <rect x="96" y="280" width="352" height="220" rx="20" />
      <rect x="496" y="280" width="400" height="220" rx="20" />
      <rect x="944" y="280" width="400" height="220" rx="20" />
    </g>
    <g fill="#527361" font-size="24">
      <text x="128" y="332">01</text><text x="528" y="332">02</text><text x="976" y="332">03</text>
    </g>
    <g fill="#182d23" font-size="36" font-weight="600">
      <text x="128" y="402">Write</text><text x="528" y="402">Review</text><text x="976" y="402">Publish</text>
    </g>
    <g fill="#527361" font-size="24">
      <text x="128" y="454">Create a draft</text><text x="528" y="454">Check the details</text><text x="976" y="454">Share with readers</text>
      <text x="96" y="614">One clear step at a time.</text>
    </g>
  </g>
</svg>`

export function GeneratedDiagram() {
  return (
    <div className="generated-diagram">
      <ZoomableDiagram
        svg={svg}
        alt="Publishing workflow: write a draft, review the details, then publish to readers."
        width={1_440}
        height={720}
        options={{ margin: 32 }}
      />
    </div>
  )
}
