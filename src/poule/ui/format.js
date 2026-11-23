import { CENTS } from '../config/economy.js'

const whole = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const twoDecimals = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const oneDecimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

/** "1 040" for whole tokens, "10,40" otherwise. */
export function tokens(cents) {
  const value = cents / CENTS
  return Number.isInteger(value) ? whole.format(value) : twoDecimals.format(value)
}

/** "x1,04", or "x2 030" once the decimals no longer matter. */
export const multiplierLabel = (multiplier) =>
  `x${multiplier >= 100 ? whole.format(Math.floor(multiplier)) : twoDecimals.format(multiplier)}`

export const percent = (ratio) => `${oneDecimal.format(ratio * 100)} %`

export const count = (n) => whole.format(n)

/** "+120", "−35,50" or "0". */
export function signedTokens(cents) {
  if (cents === 0) return '0'
  return `${cents > 0 ? '+' : '−'}${tokens(Math.abs(cents))}`
}
