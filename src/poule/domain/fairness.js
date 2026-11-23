/**
 * Provably fair draws. Before a round the game picks a secret seed and shows
 * SHA-256(seed). Lane `n` is crossed when the first 8 hex digits of
 * SHA-256(`${seed}:${n}`), read as a number and divided by 2^32, are below the
 * mode's survival chance. Revealing the seed at the end lets anyone redo the
 * maths and check the outcome was fixed before the first step.
 */

const encoder = new TextEncoder()

const toHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

export async function sha256Hex(text) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(text))
  return toHex(new Uint8Array(digest))
}

/** 128 random bits, as 32 hex digits. */
export const randomSeed = () => toHex(globalThis.crypto.getRandomValues(new Uint8Array(16)))

/** A number in [0, 1) read from the first 32 bits of a hex digest. */
export const rollFromHash = (hash) => parseInt(hash.slice(0, 8), 16) / 2 ** 32

export async function laneRoll(seed, lane) {
  return rollFromHash(await sha256Hex(`${seed}:${lane}`))
}

/**
 * Outcome of every lane of the mode: `outcomes[n - 1]` is true when lane n is
 * crossed safely.
 */
export async function drawOutcomes(seed, mode) {
  const lanes = Array.from({ length: mode.lanes }, (_, index) => index + 1)
  const rolls = await Promise.all(lanes.map((lane) => laneRoll(seed, lane)))
  return rolls.map((roll) => roll < mode.survival)
}

/** First lane that runs the hen over (1-based), or null if none does. */
export function firstFatalLane(outcomes) {
  const index = outcomes.indexOf(false)
  return index === -1 ? null : index + 1
}

/** Everything a player needs to check a finished round. */
export async function verifyRound({ seed, seedHash, mode }) {
  const [hash, outcomes] = await Promise.all([sha256Hex(seed), drawOutcomes(seed, mode)])
  return { hashMatches: hash === seedHash, fatalLane: firstFatalLane(outcomes) }
}
