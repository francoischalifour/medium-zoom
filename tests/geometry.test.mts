import assert from 'node:assert/strict'
import { test } from 'node:test'

import { fitTarget, imageTransform } from '../src/engine/geometry.ts'

test('fit preserves the existing raster positioning across viewport, source, and intrinsic sizes', () => {
  for (const left of [-200, 0, 75]) {
    for (const top of [-100, 0, 250]) {
      for (const width of [80, 160, 800]) {
        for (const height of [50, 120, 600]) {
          const box = { left, top, width, height }
          const viewport = { left: 24, top: 36, width: 960, height: 640 }
          const intrinsic = { width: 1_200, height: 800 }
          const fitted = fitTarget({ layout: box, painted: box, intrinsic }, viewport)!
          const scale = Math.min(
            Math.min(Math.max(width, intrinsic.width), viewport.width) / width,
            Math.min(Math.max(height, intrinsic.height), viewport.height) / height
          )
          assert.equal(fitted.scale, scale)
          assert(
            Math.abs(
              fitted.translateX - (-left + (viewport.width - width) / 2 + viewport.left) / scale
            ) < 1e-9
          )
          assert(
            Math.abs(
              fitted.translateY - (-top + (viewport.height - height) / 2 + viewport.top) / scale
            ) < 1e-9
          )
        }
      }
    }
  }
})

test('painted content is centered independently from the layout box, with local clipping', () => {
  const layout = { left: 50, top: 80, width: 200, height: 200 }
  const painted = { left: 50, top: 130, width: 200, height: 100 }
  const viewport = { left: 0, top: 0, width: 1_000, height: 800 }
  const fitted = fitTarget(
    {
      layout,
      painted,
      intrinsic: { width: 800, height: 400 },
      clip: { left: 70, top: 100, width: 160, height: 160 },
    },
    viewport
  )!
  const transformedX =
    layout.left +
    layout.width / 2 +
    fitted.scale *
      (painted.left + painted.width / 2 - layout.left - layout.width / 2 + fitted.translateX)
  const transformedY =
    layout.top +
    layout.height / 2 +
    fitted.scale *
      (painted.top + painted.height / 2 - layout.top - layout.height / 2 + fitted.translateY)
  assert.equal(transformedX, 500)
  assert.equal(transformedY, 400)
  assert.deepEqual(fitted.clip, { top: 20, left: 20, right: 20, bottom: 20 })
})

test('zero-size layout or painted content has no geometry and missing intrinsic dimensions stay finite', () => {
  const box = { left: 0, top: 0, width: 160, height: 100 },
    viewport = { left: 0, top: 0, width: 800, height: 600 }
  assert.equal(
    fitTarget(
      { layout: { ...box, width: 0 }, painted: box, intrinsic: { width: 0, height: 0 } },
      viewport
    ),
    null
  )
  assert.equal(
    fitTarget(
      { layout: box, painted: { ...box, height: 0 }, intrinsic: { width: 0, height: 0 } },
      viewport
    ),
    null
  )
  const fitted = fitTarget(
    { layout: box, painted: box, intrinsic: { width: 0, height: 0 } },
    viewport
  )!
  assert.equal(fitted.scale, 5)
  assert(Number.isFinite(fitted.translateX) && Number.isFinite(fitted.translateY))
})

test('fixed image transforms match generic geometry, including fallback and fractional bounds', () => {
  for (const size of [0, 80, 160.25, 800]) {
    for (const natural of [0, 400, 1_200]) {
      for (const width of [0, 300, 960]) {
        const layout = { left: -75.125, top: 36.75, width: size, height: size / 1.6 }
        const viewport = { left: 24, top: 36, width, height: 640 }
        const fitted = fitTarget(
          { layout, painted: layout, intrinsic: { width: natural, height: natural / 1.6 } },
          viewport
        )
        const actual = imageTransform(layout, natural, natural / 1.6, viewport)
        if (!fitted) {
          assert.equal(actual, null)
          continue
        }
        const match = actual!.match(/^scale\(([^)]+)\) translate3d\(([^p]+)px, ([^p]+)px, 0\)$/)!
        assert(match)
        const values = match.slice(1).map(Number)
        for (const [index, expected] of [
          fitted.scale,
          fitted.translateX,
          fitted.translateY,
        ].entries()) {
          assert(
            Object.is(values[index], expected) ||
              Math.abs(values[index]! - expected) < (1 + Math.abs(expected)) * 1e-9
          )
        }
      }
    }
  }
})
