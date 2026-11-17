import { Color } from 'three'

/**
 * The colours of the world, in linear RGB. Values above 1 are "hot": brighter
 * than the screen can show, which is what makes them glow once bloom is applied.
 */
const rgb = (r, g, b) => new Color().setRGB(r, g, b)

export const PALETTE = Object.freeze({
  black: rgb(0, 0, 0),
  dark: rgb(0.0, 0.014, 0.005),
  greenDim: rgb(0.0, 0.26, 0.06),
  green: rgb(0.0, 0.85, 0.2),
  greenHot: rgb(0.1, 1.9, 0.48),
  white: rgb(0.72, 1.0, 0.78),
  whiteHot: rgb(1.5, 2.1, 1.6),
  cyan: rgb(0.05, 0.75, 0.95),
  cyanHot: rgb(0.18, 1.6, 2.1),
})

/** Colours of a sector accent ('green', 'cyan' or 'white'): [normal, hot]. */
export const ACCENT = Object.freeze({
  green: [PALETTE.green, PALETTE.greenHot],
  cyan: [PALETTE.cyan, PALETTE.cyanHot],
  white: [PALETTE.white, PALETTE.whiteHot],
})
