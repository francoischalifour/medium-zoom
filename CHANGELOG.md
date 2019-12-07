## [1.0.5](https://github.com/francoischalifour/medium-zoom/compare/1.0.4...1.0.5) (2019-12-07)

### Fixed

- Give zoom transition higher priority ([#148](https://github.com/francoischalifour/medium-zoom/issues/148)) ([25b3524](https://github.com/francoischalifour/medium-zoom/commit/25b3524bb76e19a5e8dc46e32cadca3db7fedbef)), closes [#110](https://github.com/francoischalifour/medium-zoom/issues/110)

## [1.0.4](https://github.com/francoischalifour/medium-zoom/compare/1.0.3...1.0.4) (2019-04-06)

### Fixed

- Bring SSR compatibility by not using window outside of main function ([#95](https://github.com/francoischalifour/medium-zoom/issues/95)) ([541e8f0](https://github.com/francoischalifour/medium-zoom/commit/541e8f0f9fb06cf9c72bb92541b87a5153a15d18)), closes [#94](https://github.com/francoischalifour/medium-zoom/issues/94)

## [1.0.3](https://github.com/francoischalifour/medium-zoom/compare/1.0.2...1.0.3) (2019-01-20)

### Changed

- Export default export type as ESM module ([#82](https://github.com/francoischalifour/medium-zoom/issues/82)) ([ed45fcb](https://github.com/francoischalifour/medium-zoom/commit/ed45fcbe0ae318f70411d8975c0c557ccf81f92b))

### Fixed

- Use document viewport size ([#78](https://github.com/francoischalifour/medium-zoom/issues/78)) ([9a06f9b](https://github.com/francoischalifour/medium-zoom/commit/9a06f9b41d644b3d8b17c0782518036620f31a11)), closes [#75](https://github.com/francoischalifour/medium-zoom/issues/75)
- Improve type definitions ([#85](https://github.com/francoischalifour/medium-zoom/issues/85)) ([702a767](https://github.com/francoischalifour/medium-zoom/commit/702a7670fa8f5a680c5d0abd1f2ea308f97ad395))

## [1.0.2](https://github.com/francoischalifour/medium-zoom/compare/1.0.1...1.0.2) (2018-09-05)

### Added

- Improve TypeScript definition (#73)

## [1.0.1](https://github.com/francoischalifour/medium-zoom/compare/1.0.0...1.0.1) (2018-08-29)

### Fixed

- Don't prevent behavior of all clicks ([#72](https://github.com/francoischalifour/medium-zoom/issues/72)) ([71eebf9](https://github.com/francoischalifour/medium-zoom/commit/71eebf90f09a81c013731871b8cab92a4243a557)), closes [#71](https://github.com/francoischalifour/medium-zoom/issues/71)

# [1.0.0](https://github.com/francoischalifour/medium-zoom/compare/v0.4.0...1.0.0) (2018-08-28)

### Added

- **Methods become chainable**. All methods except getters and animation methods (`open()`, `close()` and `toggle()`) return the zoom object to allow method calls to be chained.

```js
const zoom = mediumZoom()

zoom
  .attach('#image-1', '#image-2')
  .on('open', () => zoom.update({ background: 'yellow' }))
  .open()
```

- **Animation methods return promises**. `open()`, `close()` and `toggle()` return promises resolving with the zoom for acting accordingly when the animation is completed. To remain compatible with IE10, promises are converted to no-operation functions if unavailable.

```js
const zoom = mediumZoom('[data-zoom]')

zoom.open().then(() => zoom.update({ background: 'yellow' }))
```

- **Options**

  - `background` supports the [`background` CSS property](https://developer.mozilla.org/en-US/docs/Web/CSS/background) (not only `background-color`)

- **Methods**

  - `attach(...selectors: string[]|Element[]|NodeList[]|Array[]) => Zoom`
  - `clone(options?: object) => Zoom`
  - `getOptions() => object`
  - `getImages() => Element[]`
  - `getZoomedImage() => Element`

- **Events**

  - "update" is fired when the `update` method is called

- Add **TypeScript definitions**

- Improve **documentation**

### Fixed

- HD image scales the first time on Firefox (264c81f9d54b7272fa260616f117c3149be89123)
- Support `srcset` attribute (#51)
- Support SVG sources (#56)

### Breaking changes

- **Imports**. If you're using CommonJS, you'll need to change the require statement:

```diff
- const mediumZoom = require('medium-zoom')
+ const mediumZoom = require('medium-zoom').default
```

- **No images selected by default**. Prior to version 1, all scaled images (via HTML or CSS properties) were added to the zoom when calling `mediumZoom()`. Now, calling `mediumZoom()` without selector does not attach any images to the zoom. This change is necessary for having a more predictable behavior and a more composable API.

- **Options**

  - `metaClick` was removed

- **Methods**

  - `show() => void` → `open({ target?: Element }) => Promise<Zoom>`
  - `hide() => void` → `close() => Promise<Zoom>`
  - `toggle() => void` → `toggle({ target?: Element }) => Promise<Zoom>`
  - `detach() => void` → `detach(...selectors: string[]|Element[]|NodeList[]|Array[]) => Zoom`
  - `update(options: object) => void` → `update(options: object) => Zoom`
  - `addEventListeners(type: string, listener: Function) => void` → `on(type: string, listener: Function, options?: object) => Zoom`
  - `removeEventListeners(type: string, listener: Function) => void` → `off(type: string, listener: Function, options?: object) => Zoom`

- **Attributes**

  - `data-zoom-target` → `data-zoom-src`

- **Events**
  - "show" → "open"
  - "shown" → "opened"
  - "hide" → "close"
  - "hidden" → "closed"

# [0.4.0](https://github.com/francoischalifour/medium-zoom/compare/v0.3.0...v0.4.0) (2018-03-09)

### Added

- Support for IE ([#35](https://github.com/francoischalifour/medium-zoom/issues/35)) ([bd485fc](https://github.com/francoischalifour/medium-zoom/commit/bd485fc0416b4d3f8d7d1b6fd4e523f42ca2d8d8)), closes [#34](https://github.com/francoischalifour/medium-zoom/issues/34)

### Fixed

- Calling `.detach()` when having a zoomed image: 9fa798d3fe96ae7060f316995b84eaacf3ce8a11

# [0.3.0](https://github.com/francoischalifour/medium-zoom/compare/v0.2.0...v0.3.0) (2017-12-07)

### Added

- Add support for `template`s and `container`s: d0d1ec141ffe744d059dddcfc08b6e830b7c17c9

# [0.2.0](https://github.com/francoischalifour/medium-zoom/compare/v0.1.8...v0.2.0) (2017-10-01)

### Added

- Add HD support: 1db9607dce2aa348d9be465208395d125b16e728

### Changed

- Rewrite core implementation: 5158cace958acee0e89a4c9358704ed504756254
- Update library description: a6f424bae2da534563154c26b49046367d7db215
- Use less restrictive CSS rules: acaeba4bf96576b65867c3effc2710bd9d029dc0
- Reduce latency on click to unzoom: 3c4c2fef2c2fca2ce542e57e13ce3198fe7ba2bb

### Fixed

- Fix `hide` event being thrown multiple times on scroll: 3c4c2fef2c2fca2ce542e57e13ce3198fe7ba2bb

## [0.1.8](https://github.com/francoischalifour/medium-zoom/compare/v0.1.7...v0.1.8) (2017-09-17)

### Fixed

- Do not trigger the zoom when target is `null` (can happen on fast double click): 3f795b44877af341ed65ae7c1bc764cc5122cdfb

## [0.1.7](https://github.com/francoischalifour/medium-zoom/compare/v0.1.6...v0.1.7) (2017-07-21)

### Fixed

- Don't ignore margin on floating images: 384f0b1576e66f16844e0482eb1653a0c9479ad2

## [0.1.6](https://github.com/francoischalifour/medium-zoom/compare/v0.1.5...v0.1.6) (2017-07-19)

### Fixed

- Support `scrollTop` position on Firefox: ee13718c38a7a4ba486cacfb50f2861dd1adb8ad

## [0.1.5](https://github.com/francoischalifour/medium-zoom/compare/v0.1.4...v0.1.5) (2017-06-10)

### Changed

- Wrong selector trows a `TypeError` instead of a `SyntaxError`: 38e6292ce83d1b54f4fd80cce03d737c3872a58f
- Library now fully exported by webpack: 5c7944b5e2de19828c8f9298fdc7a03a9146e42b
- Production version is used when importing the library: 3a7d8ebc0ddd2cb142ccb8519de6fc57e8e8ba3e

## [0.1.4](https://github.com/francoischalifour/medium-zoom/compare/v0.1.3...v0.1.4) (2017-05-31)

### Added

- Support NodeLists, HTMLCollections and Nodes (#8): aa8ff0ff6743e0bc011ea162ff068a2ddbb0f9ab

### Changed

- Apply the default selector only when the plugin is given none (#7): aa8ff0ff6743e0bc011ea162ff068a2ddbb0f9ab

## [0.1.3](https://github.com/francoischalifour/medium-zoom/compare/v0.1.2...v0.1.3) (2017-04-01)

### Fixed

- Center image when the doctype is not declared (#4): 95be45a63837bcd282433728f8db8759bd5777cb
- Ignore zero-pixel scroll offset: 3cd34640ab26b04b802ce39ce74f092180e3cb00

## [0.1.2](https://github.com/francoischalifour/medium-zoom/compare/v0.1.1...v0.1.2) (2017-03-04)

### Added

- `.detach()` method that unsubscribe images from the zoom (#2): 2ceb5120ebc35bb457a08474e0d39430e253ab08

## [0.1.1](https://github.com/francoischalifour/medium-zoom/compare/v0.1.0...v0.1.1) (2016-10-06)

### Fixed

- Export the plugin for npm usage (#1): affca211ac6999f1d2c554205d5b216c37fc7c1c

# 0.1.0 (2016-07-28)

Initial release.
