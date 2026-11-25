/**
 * Progression: experience (XP) is earned for every lane crossed, whether the
 * round is won or lost, and never from the size of the bet. It sets the level
 * and the weekly score. Tokens are the only currency: every new level pays a
 * token bonus, on top of achievements, events and season rewards.
 */

/** XP per lane crossed, by mode. Harder modes cross fewer lanes. */
export const XP_PER_LANE = Object.freeze({ easy: 2, medium: 3, hard: 5, hardcore: 8, night: 6, mystery: 3 })

/** Tokens paid (in cents) when a level is reached: 20 tokens at level 2, 30 at level 3... */
export const levelUpBonus = (level) => level * 10 * 100

/** One former feather is worth this many cents of tokens (saves from before the change). */
export const FEATHER_TO_CENTS = 10 * 100

/** Experience needed to reach `level` from zero: 0, 30, 90, 180, 300... */
export const xpForLevel = (level) => 15 * level * (level - 1)

export const MAX_LEVEL = 50

/** A break reminder after this long playing without one, in minutes. */
export const BREAK_REMINDER_MINUTES = 30
