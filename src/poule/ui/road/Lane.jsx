import { memo } from 'react'
import { LANE_WIDTH } from '../../config/ui.js'
import { multiplierLabel } from '../format.js'
import Car from './Car.jsx'

/** One lane: its manhole cover with the multiplier, a barrier once crossed, its cars. */
function Lane({ multiplier, state, cars, skin, onCarGone }) {
  return (
    <div className={`lane lane--${state}`} style={{ width: LANE_WIDTH }}>
      <div className="lane__barrier" />
      <div className="lane__cover">{multiplierLabel(multiplier)}</div>
      {cars.map((car) => (
        <Car key={car.id} {...car} skin={skin} onGone={onCarGone} />
      ))}
    </div>
  )
}

export default memo(Lane)
