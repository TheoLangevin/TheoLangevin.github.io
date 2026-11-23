import { useCallback, useEffect, useRef, useState } from 'react'
import { CAR_COLORS } from '../../config/ui.js'
import { TIMING } from '../../config/timing.js'

const pick = (list) => list[Math.floor(Math.random() * list.length)]

/**
 * Decorative cars driving down the lanes the hen has not reached yet. They
 * never decide anything: the fate of a lane comes from the round's seed.
 * Lanes from `firstLane` to `lastLane` get traffic; none when the tab is
 * hidden or the visitor prefers less motion.
 */
export function useTraffic({ firstLane, lastLane }) {
  const [cars, setCars] = useState([])
  const nextId = useRef(0)
  const range = useRef({ firstLane, lastLane })
  range.current = { firstLane, lastLane }

  useEffect(() => {
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (calm) return undefined
    const timer = setInterval(() => {
      if (document.hidden) return
      const { firstLane: from, lastLane: to } = range.current
      if (from > to) return
      const lane = from + Math.floor(Math.random() * (to - from + 1))
      const car = { id: nextId.current++, lane, color: pick(CAR_COLORS), duration: 1.3 + Math.random() * 1.2 }
      setCars((list) => [...list, car])
    }, TIMING.trafficInterval)
    return () => clearInterval(timer)
  }, [])

  const remove = useCallback((id) => setCars((list) => list.filter((car) => car.id !== id)), [])

  return { cars, remove }
}
