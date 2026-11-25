/**
 * Events of the calendar (UTC): bonuses and themes that switch on by
 * themselves. They never change the odds: only XP, gifts and limited items.
 */
export const CALENDAR = Object.freeze([
  {
    id: 'weekend',
    label: 'Week-end Hardcore : XP ×2 en Hardcore et en Nuit',
    active: (date) => [0, 6].includes(date.getUTCDay()),
    xp: { hardcore: 2, night: 2 },
  },
  {
    id: 'christmas',
    label: 'Noël : route enneigée offerte, objets en édition limitée',
    active: (date) => date.getUTCMonth() === 11,
    gift: 'snow',
    until: '31/12',
  },
])
