/**
 * Keeps bots from farming the big hen. A tap counts fully when a human
 * could have made it: at most MAX_PER_SECOND a second, not at a machine's
 * perfectly regular pace; after FATIGUE_AFTER seconds of tapping without a
 * REST, each tap lays less (down to FATIGUE_FLOOR), and a pause resets it.
 * Pure: give it the time of each tap.
 */
export const MAX_PER_SECOND = 20
export const FATIGUE_AFTER = 120
export const FATIGUE_SPAN = 240
export const FATIGUE_FLOOR = 0.1
export const REST = 5
/** Intervals this regular (standard deviation in ms) over WINDOW taps look like a bot. */
export const ROBOT_JITTER = 4
export const WINDOW = 20

export function createTapGuard() {
  let recent = []
  let intervals = []
  let start = null
  let last = null

  return {
    /** The share a tap at `now` (ms) counts for: 0 refused, 1 full, in between when tired. */
    accept(now) {
      if (last != null && now - last > REST * 1000) {
        start = null
        intervals = []
      }
      if (last != null) intervals = [...intervals.slice(-(WINDOW - 1)), now - last]
      last = now
      if (start == null) start = now
      recent = recent.filter((t) => now - t < 1000)
      if (recent.length >= MAX_PER_SECOND) return 0
      recent.push(now)
      if (intervals.length >= WINDOW - 1) {
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length
        const jitter = Math.sqrt(intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length)
        if (jitter < ROBOT_JITTER && mean < 400) return 0
      }
      return fatigue((now - start) / 1000)
    },
    /** How much a tap would count now, for display. */
    tiredness(now) {
      if (start == null || last == null || now - last > REST * 1000) return 1
      return fatigue((now - start) / 1000)
    },
  }
}

export function fatigue(seconds) {
  if (seconds <= FATIGUE_AFTER) return 1
  return Math.max(FATIGUE_FLOOR, 1 - (seconds - FATIGUE_AFTER) / FATIGUE_SPAN)
}
