import mediumZoom, { type Zoom, type ZoomOptions } from 'medium-zoom'
import pureZoom from 'medium-zoom/dist/pure/index.js'

// Known v1 limitation: these .d.ts files are interpreted as CommonJS namespaces.
// Keep the failure explicit; runtime.mjs separately verifies the callable root.
// @ts-expect-error Node ESM sees a namespace rather than the callable default.
const factory: (options?: ZoomOptions) => Zoom = mediumZoom
// @ts-expect-error The pure ESM path shares the legacy declaration format.
const pure: (options?: ZoomOptions) => Zoom = pureZoom
void factory
void pure

import fullPure from 'medium-zoom/pure'
const pureFactory: (options?: ZoomOptions) => Zoom = fullPure
void pureFactory

import type { Zoom as PureZoom, ZoomOptions as PureOptions } from 'medium-zoom/pure'
const typedPureFactory: (options?: PureOptions) => PureZoom = pureFactory
void typedPureFactory

import compat from 'medium-zoom/compat'
import compatPure from 'medium-zoom/compat/pure'
import modern from 'medium-zoom/modern'
import type { Zoom as ModernZoom } from 'medium-zoom/modern'
const profileFactories: ((options?: ZoomOptions) => ModernZoom)[] = [compat, compatPure, modern]
void profileFactories
