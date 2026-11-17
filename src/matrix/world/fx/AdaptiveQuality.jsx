import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { rig } from '../../state/rig.js'
import { useMatrix } from '../../state/useMatrix.js'
import { lowerQuality } from '../quality.js'

const WINDOW = 3
const TOO_SLOW = 38

/**
 * Watches the frame rate. In automatic mode, steps the graphics down when the
 * device struggles, so the world stays fluid on a modest laptop.
 */
export default function AdaptiveQuality() {
  const sample = useRef({ time: 0, frames: 0, display: 0, displayFrames: 0, grace: 2 })

  useFrame((_, delta) => {
    const s = sample.current
    s.display += delta
    s.displayFrames++
    if (s.display >= 0.5) {
      rig.fps = Math.round(s.displayFrames / s.display)
      s.display = s.displayFrames = 0
    }

    const game = useMatrix.getState()
    if (game.phase !== 'world' || game.qualityMode !== 'auto' || document.hidden) {
      s.time = s.frames = 0
      return
    }
    // Give a new setting a moment to settle before judging it.
    if (s.grace > 0) {
      s.grace -= delta
      return
    }
    s.time += Math.min(delta, 0.25)
    s.frames++
    if (s.time < WINDOW) return
    const fps = s.frames / s.time
    s.time = s.frames = 0
    const lower = fps < TOO_SLOW ? lowerQuality(game.quality) : null
    if (lower) {
      game.setQuality(lower, 'auto')
      game.showToast(`GRAPHICS ADJUSTED: ${lower.toUpperCase()}`)
      s.grace = 2
    }
  })

  return null
}
