import { memo } from 'react'
import { CarSprite } from './sprites.jsx'

/** A car crossing its lane once, then removed. */
function Car({ id, color, duration, delay = 0, skin = null, onGone }) {
  return (
    <div
      className="car"
      style={{ animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
      onAnimationEnd={() => onGone?.(id)}
    >
      <CarSprite color={color} skin={skin} />
    </div>
  )
}

export default memo(Car)
