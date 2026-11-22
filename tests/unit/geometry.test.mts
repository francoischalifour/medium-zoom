import assert from 'node:assert/strict'
import { test } from 'node:test'

import { fitBox as fit } from '../../src/zoom/geometry.ts'

const readGeometry = (transform: string) => {
  const [scale, translateX, translateY] = transform
    .match(/[-\d.e+]+(?=px|\))/g)!
    .map(Number)
  return { scale, translateX, translateY }
}

const fitBox = (...args: Parameters<typeof fit>) => {
  const transform = fit(...args)
  return transform === null ? null : { ...readGeometry(transform), transform }
}

void test('fit preserves v1 raster positioning across viewport, source, and intrinsic sizes', () => {
  for (const left of [-200, 0, 75]) {
    for (const top of [-100, 0, 250]) {
      for (const width of [80, 160, 800]) {
        for (const height of [50, 120, 600]) {
          const box = { left, top, width, height }
          const viewport = { left: 24, top: 36, width: 960, height: 640 }
          const intrinsic = { width: 1_200, height: 800 }
          const fitted = fitBox(
            box,
            intrinsic.width,
            intrinsic.height,
            viewport
          )!
          const scale = Math.min(
            Math.min(Math.max(width, intrinsic.width), viewport.width) / width,
            Math.min(Math.max(height, intrinsic.height), viewport.height) /
              height
          )
          assert(Math.abs(fitted.scale - scale) < 1e-9)
          assert(
            Math.abs(
              fitted.translateX -
                (-left + (viewport.width - width) / 2 + viewport.left) / scale
            ) < 1e-9
          )
          assert(
            Math.abs(
              fitted.translateY -
                (-top + (viewport.height - height) / 2 + viewport.top) / scale
            ) < 1e-9
          )
        }
      }
    }
  }
})

void test('a zero-size box has no geometry and missing intrinsic dimensions stay finite', () => {
  const box = { left: 0, top: 0, width: 160, height: 100 }
  const viewport = { left: 0, top: 0, width: 800, height: 600 }
  assert.equal(fitBox({ ...box, width: 0 }, 0, 0, viewport), null)
  assert.equal(fitBox({ ...box, height: 0 }, 0, 0, viewport), null)
  const fitted = fitBox(box, 0, 0, viewport)!
  assert.equal(fitted.scale, 5)
  assert(
    Number.isFinite(fitted.translateX) && Number.isFinite(fitted.translateY)
  )
})

void test('the transform applies exactly the fitted geometry, including fractional bounds', () => {
  for (const size of [80, 160.25, 800]) {
    for (const natural of [0, 400, 1_200]) {
      const layout = {
        left: -75.125,
        top: 36.75,
        width: size,
        height: size / 1.6,
      }
      const viewport = { left: 24, top: 36, width: 960, height: 640 }
      const fitted = fitBox(layout, natural, natural / 1.6, viewport)!
      const match = fitted.transform.match(
        /^scale\(([^)]+)\) translate3d\(([^p]+)px, ([^p]+)px, 0\)$/
      )!
      assert.deepEqual(match.slice(1).map(Number), [
        fitted.scale,
        fitted.translateX,
        fitted.translateY,
      ])
    }
  }
})
