import { useEffect } from 'react'
import { usePoule } from '../../state/usePoule.js'

const PATTERNS = {
  start: [12, 40, 12],
  // Stronger the further the hen goes.
  hop: (fx) => Math.min(30, 6 + 2 * (fx.lane ?? 1)),
  crash: [90, 50, 40, 30, 160],
  // Longer celebration for bigger wins.
  win: (fx) => ((fx.multiplier ?? 1) >= 10 ? [30, 40, 30, 40, 30, 40, 120] : [25, 40, 25, 40, 60]),
  buy: [15, 30, 15],
}

/** Short vibrations on phones that have them (Android), unless turned off. */
export function useHaptics() {
  const fx = usePoule((state) => state.fx)
  const enabled = usePoule((state) => state.haptics)

  useEffect(() => {
    if (!fx || !enabled || !('vibrate' in navigator)) return
    const entry = PATTERNS[fx.type]
    const pattern = typeof entry === 'function' ? entry(fx) : entry
    if (pattern) {
      try {
        navigator.vibrate(pattern)
      } catch {
        /* some browsers refuse without a recent tap */
      }
    }
  }, [fx, enabled])
}
