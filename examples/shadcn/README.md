# Medium Zoom for shadcn/ui

An editable React component powered by `medium-zoom`. The registry installs the component, its stylesheet, and `medium-zoom@^1.1.2` into your project.

## Install

From a project configured for shadcn/ui:

```sh
npx shadcn@latest add https://medium-zoom.francoischalifour.com/r/image-zoom.json
```

```tsx
import { ImageZoom } from '@/components/ui/image-zoom'

export function Photo() {
  return (
    <ImageZoom
      src="/photo.jpg"
      alt="Mountain landscape"
      width={1200}
      height={800}
      className="h-auto max-w-full rounded-lg"
      options={{ margin: 24 }}
    />
  )
}
```

The component has a `"use client"` boundary and can be imported into a Next.js Server Component. Its initial HTML is identical on the server and client. Pass serializable options across that boundary; configure DOM elements and event handlers in a Client Component.

## Composable parts

Use a namespace import for the Base UI-style API. `Root` renders no DOM and owns one image's zoom state. `Trigger` renders a native button; `Image` renders a native image. Each part accepts its own native attributes, styles, and ref.

```tsx
import * as ImageZoom from '@/components/ui/image-zoom'

;<ImageZoom.Root options={{ margin: 32 }}>
  <ImageZoom.Trigger aria-label="View photo: Mountain landscape" className="relative rounded-xl">
    <ImageZoom.Image src="/photo.jpg" alt="Mountain landscape" className="rounded-xl" />
    <span className="absolute bottom-3 right-3">View photo</span>
  </ImageZoom.Trigger>
</ImageZoom.Root>
```

Use one `Image` per `Root`, and keep `Image` inside its `Trigger`. Use a separate root for each photo in a gallery. Set an explicit `aria-label` on the trigger for a descriptive name in the initial server HTML; after mounting, the default name uses the image's alt text. Keep interactive children such as links and buttons outside the trigger.

The existing named `ImageZoom` export is a convenience component built from these same parts. Its `options`, `disabled`, `open`, and `onOpenChange` props belong to `Root`; image attributes and its ref belong to `Image`.

## Controlled zoom

Without `open`, the component manages its own state. Pass `open` and `onOpenChange` to control it from a Client Component:

```tsx
'use client'

import * as React from 'react'
import * as ImageZoom from '@/components/ui/image-zoom'

export function Photo() {
  const [open, setOpen] = React.useState(false)

  return (
    <ImageZoom.Root open={open} onOpenChange={setOpen}>
      <ImageZoom.Trigger aria-label="Enlarge mountain landscape">
        <ImageZoom.Image src="/photo.jpg" alt="Mountain landscape" />
      </ImageZoom.Trigger>
    </ImageZoom.Root>
  )
}
```

`onOpenChange` reports requested state changes, including trigger activation and dismissal by click, Escape, or scrolling. It fires when a change is requested, not when its animation finishes. Changing the `open` prop does not echo the callback. A controlled trigger cannot open until its owner supplies `open={true}`. Disabling the root or changing the image source closes the active zoom. Opening another root closes the previous one. An `open` request made before the image mounts waits for the image.

## Props

| Prop             | Behavior                                                                                                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image attributes | `src`, `srcSet`, `sizes`, `loading`, `onLoad`, `className`, and `style` apply to the underlying `<img>`. `alt` is required.                                                                                                  |
| `ref`            | Forwards to the underlying `HTMLImageElement`. Object and callback refs are supported.                                                                                                                                       |
| `options`        | Accepts [medium-zoom options](../../README.md#options). Defaults to a 24px margin, a 40px scroll offset, and the image's computed `--background` theme token, falling back to white. Updated options apply to the next open. |
| `open`           | Controls whether the image is zoomed. Omit it for internal state.                                                                                                                                                            |
| `onOpenChange`   | Receives requested open state as a boolean. Keep handlers in a Client Component.                                                                                                                                             |
| `disabled`       | Disables the native button and detaches zoom behavior. Disabling while open closes the zoom.                                                                                                                                 |
| `data-zoom-src`  | Loads a separate high-resolution image when opening.                                                                                                                                                                         |

The native button supplies keyboard activation with Enter and Space. Escape, scrolling, or clicking the enlarged image closes the zoom. Keyboard focus remains on the trigger. The cloned image is hidden from assistive technology and has no additional tab stop. Reduced motion follows the library's existing media query.

For a localized accessible name, custom trigger styles, or click cancellation, use `ImageZoom.Trigger` directly. Calling `event.preventDefault()` in its `onClick` handler cancels activation.

## Lifecycle and composition

Zoom instances are created after commit, with no browser APIs or instance mutations during rendering. Cleanup closes and detaches the instance. Repeated effect setup in Strict Mode or Activity waits for the previous close to finish. Changing the image source closes the old clone, and queued image switches wait for earlier zooms to finish closing.

Render the component wherever an image button is valid, including same-document portals and Suspense boundaries. Keep it outside links and other buttons. The forwarded ref gives access to the image. Customize the interactive wrapper directly through `ImageZoom.Trigger`. The component renders a native `<img>`; it does not clone children or wrap `next/image`.

The core library uses its own global `document` and `window`, so portals into another document or iframe are unsupported. Separately initialized vanilla medium-zoom instances do not participate in the component's zoom coordination.

Modern shadcn color tokens and older HSL channel tokens are supported. Scoped themes are resolved from the image when opening. An explicit `options.background` takes precedence. The stylesheet places the overlay at z-index 50 and enlarged images at 51; edit these rules to fit your app's stacking system.

## Local development

From the repository root:

```sh
bun install --frozen-lockfile
bun run build
bun run dev:example shadcn
```

Run `npm install` and `npm run dev` in this directory to develop the example. Photos are shared from the repository’s `assets/images/` folder and served at `/assets/images/`. When copying the example outside this repository, include that folder at `public/assets/images/`; the standalone verification script does this automatically.

The public integration page is owned by the React website at `website/src/ShadcnPage.tsx`. This standalone example renders the component playground at `index.html` and `playground.html`; the component regression suite uses the latter. Run `bun run dev:website` from the repository root to develop both product pages together.

The shared shell, controls, site styles, and theme live in `website/src/`. The registry component does not depend on website code, fonts, or analytics. Its standalone playground needs only React, React DOM, and medium-zoom.

## Registry development

The root `registry.json` points to the same component exercised by this example. `bun run build:registry` embeds those files into static JSON under `website/public/r`. The website build publishes them at `/r/registry.json` and `/r/image-zoom.json` alongside the live example at `/examples/shadcn/`.

To test installation before deploying, start `bun run dev:website` and run this from a separate shadcn project:

```sh
npx shadcn@latest add http://127.0.0.1:5173/r/image-zoom.json
```

The browser suite checks server rendering and hydration, development Strict Mode, keyboard interaction, refs, cancellation, rapid switching, option changes, portals, scoped themes, Activity, reduced motion, and unmounting during an HD image load. Its lifecycle design follows [Building Bulletproof React Components](https://shud.in/thoughts/build-bulletproof-react-components).

## Server rendering

The component supports SSR and can be imported directly into a React Server Component. It declares its own client boundary. Props passed across that boundary must be serializable; keep event handlers, refs, and DOM containers in a Client Component.

Image dimensions are optional. Include `width` and `height` when you know them to reserve the image’s aspect ratio before it loads. `disabled` follows the native button convention and disables zoom while keeping the image visible. The default overlay reads shadcn’s `--background` theme token; set `options.background` to override it.

`bun run test:rsc` builds and starts a real Next.js App Router fixture that imports the component from an async Server Component. It verifies HTML without JavaScript, hydration of a dynamic server response, and zoom after client navigation. The existing browser suite separately verifies conventional SSR, hydration, and lifecycle behavior.
