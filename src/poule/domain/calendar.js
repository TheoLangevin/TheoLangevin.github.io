import { CALENDAR } from '../config/calendar.js'

/** Calendar events running at `date`. */
export const activeEvents = (date = new Date()) => CALENDAR.filter((event) => event.active(date))

export const isEventActive = (id, date = new Date()) => activeEvents(date).some((event) => event.id === id)

/** XP multiplier of a mode at `date` (the best running event's). */
export const xpMultiplier = (modeId, date = new Date()) =>
  activeEvents(date).reduce((best, event) => Math.max(best, event.xp?.[modeId] ?? 1), 1)
