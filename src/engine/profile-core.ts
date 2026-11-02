/** Composed production instances expose strategies, not legacy options or adapter registration. */
export const extendedFrames = true
export const legacyPolicy = false
export const customTargets = false
export { targetResolver } from '../targets'
export * from './frame-ops'
