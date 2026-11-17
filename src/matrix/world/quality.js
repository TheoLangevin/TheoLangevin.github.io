/**
 * Rendering presets. The world starts on the best one the device is likely to
 * handle and steps down by itself if the frame rate suffers (see
 * fx/AdaptiveQuality.jsx).
 *
 * dpr: pixel ratio of the canvas. post: screen effects ('full' adds a touch of
 * colour fringing and grain to the glow). msaa: anti-aliasing samples.
 * rain / motes: share of the code-rain strips and floating particles drawn.
 */
const deviceRatio = () => window.devicePixelRatio || 1

export const QUALITY = Object.freeze({
  high: { dpr: () => Math.min(deviceRatio(), 1.25), post: 'full', msaa: 4, rain: 1, motes: 1 },
  medium: { dpr: () => Math.min(deviceRatio(), 1), post: 'glow', msaa: 0, rain: 0.65, motes: 0.6 },
  low: { dpr: () => Math.min(deviceRatio(), 0.75), post: null, msaa: 0, rain: 0.4, motes: 0.4 },
})

export const lowerQuality = (level) => ({ high: 'medium', medium: 'low' })[level] ?? null
