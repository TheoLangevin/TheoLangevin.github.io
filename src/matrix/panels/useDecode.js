import { useEffect, useState } from 'react'
import { useMatrix } from '../state/useMatrix.js'

const NOISE = '01<>/\\[]{}#%&$*+=-_'

/**
 * "Decodes" a text: it first appears as random signs that resolve into the
 * real characters from left to right.
 */
export function useDecode(text, duration = 520) {
  const reducedMotion = useMatrix((state) => state.reducedMotion)
  const [output, setOutput] = useState(reducedMotion ? text : '')

  useEffect(() => {
    if (reducedMotion) {
      setOutput(text)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      const resolved = Math.floor(progress * text.length)
      let next = text.slice(0, resolved)
      for (let i = resolved; i < text.length; i++) {
        next += text[i] === ' ' ? ' ' : NOISE[Math.floor(Math.random() * NOISE.length)]
      }
      setOutput(next)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [text, duration, reducedMotion])

  return output
}
