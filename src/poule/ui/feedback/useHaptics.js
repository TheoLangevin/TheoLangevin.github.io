import { useEffect } from 'react'
import { usePoule } from '../../state/usePoule.js'

const PATTERNS = {
  hop: 8,
  crash: [70, 40, 120],
  win: [25, 40, 25, 40, 60],
  buy: [15, 30, 15],
}

/** Short vibrations on phones that have them (Android), unless turned off. */
export function useHaptics() {
  const fx = usePoule((state) => state.fx)
  const enabled = usePoule((state) => state.haptics)

  useEffect(() => {
    if (!fx || !enabled || !('vibrate' in navigator)) return
    const pattern = PATTERNS[fx.type]
    if (pattern) {
      try {
        navigator.vibrate(pattern)
      } catch {
        /* some browsers refuse without a recent tap */
      }
    }
  }, [fx, enabled])
}
