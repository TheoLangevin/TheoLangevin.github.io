/**
 * Progression: feathers (plumes) are earned for every lane crossed, whether the
 * round is won or lost, and never from the size of the bet. They buy upgrades;
 * every feather ever earned also counts as experience for the level.
 */

/** Feathers per lane crossed, by mode. Harder modes cross fewer lanes. */
export const FEATHERS_PER_LANE = Object.freeze({ easy: 2, medium: 3, hard: 5, hardcore: 8 })

/** Experience needed to reach `level` from zero: 0, 30, 90, 180, 300... */
export const xpForLevel = (level) => 15 * level * (level - 1)

export const MAX_LEVEL = 50

/** A break reminder after this long playing without one, in minutes. */
export const BREAK_REMINDER_MINUTES = 30
