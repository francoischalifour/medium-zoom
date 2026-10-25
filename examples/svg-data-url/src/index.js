import mediumZoom from 'medium-zoom'

const svg = `
  <svg xmlns="http://www.w3.org/2000/svg"
       width="1440" height="720" viewBox="0 0 1440 720">
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="8" markerHeight="8" orient="auto-start-reverse">
        <path d="M0 0 10 5 0 10Z" fill="#00ab6c" />
      </marker>
    </defs>
    <rect width="1440" height="720" fill="white" />
    <g fill="#eefaf5" stroke="#00ab6c" stroke-width="4">
      <rect x="80" y="240" width="300" height="140" rx="16" />
      <path d="M720 170 900 310 720 450 540 310Z" />
      <rect x="1060" y="240" width="300" height="140" rx="16" />
    </g>
    <g fill="none" stroke="#00ab6c" stroke-width="4" marker-end="url(#arrow)">
      <path d="M380 310H540" />
      <path d="M900 310H1060" />
      <path d="M720 450V580H230V380" />
    </g>
    <g font-family="sans-serif" font-size="36" text-anchor="middle" fill="#212121">
      <text x="230" y="322">Checkout</text>
      <text x="720" y="300">Payment<tspan x="720" dy="44">approved?</tspan></text>
      <text x="1210" y="322">Ship order</text>
      <text x="980" y="280" font-size="30">Yes</text>
      <text x="475" y="632" font-size="30">No · Try another card</text>
    </g>
  </svg>`

const image = document.querySelector('#diagram')
image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

mediumZoom(image)
