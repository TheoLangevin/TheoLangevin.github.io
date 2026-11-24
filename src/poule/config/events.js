/**
 * Random events that pop up after a round, for fun. They never touch the
 * odds of a round: they only hand out small bonuses (a few tokens, feathers,
 * or double feathers for the next round).
 */

const t = (tokens) => tokens * 100

/** Chance of an event after a finished round... */
export const EVENT_CHANCE = 0.12
/** ...once at least this many rounds were played since the last one. */
export const EVENT_MIN_GAP = 3

export const EVENTS = Object.freeze([
  { id: 'wheel', label: 'La roue de la fortune', weight: 5 },
  { id: 'double', label: 'Double poule', weight: 3 },
  { id: 'tornado', label: 'Tornade', weight: 2 },
])

/** The wheel's segments, clockwise from the top. Equal chances. */
export const WHEEL = Object.freeze([
  { id: 't10', label: '+10', detail: '+10 jetons', color: '#ffc21a', bonus: { tokens: t(10) } },
  { id: 'f15', label: '+15', detail: '+15 plumes', color: '#ffffff', bonus: { feathers: 15 } },
  { id: 'double', label: '×2', detail: 'Double poule', color: '#8e44ad', bonus: { double: true } },
  { id: 't25', label: '+25', detail: '+25 jetons', color: '#ffc21a', bonus: { tokens: t(25) } },
  { id: 'cot', label: 'Cot !', detail: 'Cot cot… rien du tout', color: '#e8392c', bonus: {} },
  { id: 'f40', label: '+40', detail: '+40 plumes', color: '#ffffff', bonus: { feathers: 40 } },
  { id: 't50', label: '+50', detail: '+50 jetons', color: '#ffc21a', bonus: { tokens: t(50) } },
  { id: 'f25', label: '+25', detail: '+25 plumes', color: '#ffffff', bonus: { feathers: 25 } },
])

/** What a tornado blows in. */
export const TORNADO_BONUS = Object.freeze({ feathers: 25, tokens: t(5) })
