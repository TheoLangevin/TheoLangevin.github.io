/**
 * Difficulty modes. `survival` is the chance to cross one lane; `lanes` the
 * width of the road. Multipliers are derived from these (domain/multiplier.js),
 * so a mode is tuned here and nowhere else.
 */
export const MODES = Object.freeze([
  Object.freeze({ id: 'easy', label: 'Facile', survival: 0.92, lanes: 24 }),
  Object.freeze({ id: 'medium', label: 'Moyen', survival: 0.84, lanes: 22 }),
  Object.freeze({ id: 'hard', label: 'Difficile', survival: 0.72, lanes: 20 }),
  Object.freeze({ id: 'hardcore', label: 'Hardcore', survival: 0.6, lanes: 15 }),
])

export const DEFAULT_MODE_ID = 'easy'

const BY_ID = Object.freeze(Object.fromEntries(MODES.map((mode) => [mode.id, mode])))

/** The mode with this id, or the default one for an unknown id. */
export const modeById = (id) => BY_ID[id] ?? BY_ID[DEFAULT_MODE_ID]
