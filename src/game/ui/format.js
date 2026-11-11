const numberFormat = new Intl.NumberFormat('en-US')

export const formatNumber = (value) => numberFormat.format(value)

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}
