const whole = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const short = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
const UNITS = [
  [1e18, 'Tn'],
  [1e15, 'Bd'],
  [1e12, 'Bn'],
  [1e9, 'Md'],
  [1e6, 'M'],
]

/** "12", "4,5", "12 345", "1,2 M", "3,4 Md", "5 Bn"… */
export function eggs(n) {
  if (!Number.isFinite(n)) return '∞'
  for (const [size, unit] of UNITS) if (n >= size) return `${short.format(Math.floor((n / size) * 10) / 10)} ${unit}`
  if (n < 10) return short.format(Math.floor(n * 10) / 10)
  return whole.format(Math.floor(n))
}

/** "2 h 05", "12 min", "40 s". */
export function duration(seconds) {
  const s = Math.floor(seconds)
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`
  if (s >= 60) return `${Math.floor(s / 60)} min`
  return `${s} s`
}
