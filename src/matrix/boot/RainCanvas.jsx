import { useEffect, useRef } from 'react'
import { useMatrix } from '../state/useMatrix.js'
import { RAIN_GLYPHS } from './glyphs.js'

const FRAME_MS = 1000 / 30
const FONT = 'ui-monospace, Menlo, Consolas, "DejaVu Sans Mono", monospace'

/**
 * Classic 2D "digital rain" on a canvas: one falling head per column, and a
 * translucent black wash each frame that turns older glyphs into a fading trail.
 */
export default function RainCanvas({ className, speed = 1 }) {
  const ref = useRef(null)
  const speedRef = useRef(speed)
  speedRef.current = speed
  const reducedMotion = useMatrix((state) => state.reducedMotion)

  useEffect(() => {
    const canvas = ref.current
    const context = canvas.getContext('2d')
    let cell = 18
    let heads = []
    let previous = []
    let frame = 0
    let last = 0

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.floor(canvas.clientWidth * ratio)
      canvas.height = Math.floor(canvas.clientHeight * ratio)
      cell = Math.round(18 * ratio)
      const columns = Math.ceil(canvas.width / cell)
      heads = Array.from({ length: columns }, () => -Math.random() * canvas.height)
      previous = new Array(columns).fill('')
      context.fillStyle = '#000'
      context.fillRect(0, 0, canvas.width, canvas.height)
    }

    const draw = (now) => {
      frame = requestAnimationFrame(draw)
      if (now - last < FRAME_MS) return
      last = now
      context.fillStyle = 'rgba(0, 0, 0, 0.11)'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.font = `${cell}px ${FONT}`
      context.textBaseline = 'top'

      for (let column = 0; column < heads.length; column++) {
        const x = column * cell
        const y = heads[column]
        // The glyph that was the head becomes green; the new head is white.
        context.fillStyle = '#00d53a'
        context.fillText(previous[column], x, y - cell)
        const glyph = RAIN_GLYPHS[Math.floor(Math.random() * RAIN_GLYPHS.length)]
        context.fillStyle = '#e4ffe9'
        context.fillText(glyph, x, y)
        previous[column] = glyph
        heads[column] = y > canvas.height + Math.random() * canvas.height ? -cell : y + cell * speedRef.current
      }
    }

    resize()
    window.addEventListener('resize', resize)
    if (reducedMotion) {
      // A still frame instead of an animation.
      for (let i = 0; i < 60; i++) draw(i * FRAME_MS + FRAME_MS)
      cancelAnimationFrame(frame)
    } else {
      frame = requestAnimationFrame(draw)
    }
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [reducedMotion])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}
