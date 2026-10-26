import mediumZoom, { type Zoom, type ZoomOptions } from 'medium-zoom'

// The default import works when TypeScript emits its CommonJS interop helper.
const factory: (options?: ZoomOptions) => Zoom = mediumZoom
if (typeof factory !== 'function') throw new Error('CommonJS interop must load the callable UMD')

import callable = require('medium-zoom')
// @ts-expect-error v1's default-export declaration does not model callable require().
const direct: (options?: ZoomOptions) => Zoom = callable
void direct

import pure from 'medium-zoom/pure'
const pureFactory: (options?: ZoomOptions) => Zoom = pure
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
