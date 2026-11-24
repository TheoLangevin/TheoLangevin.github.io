import { Trail } from './Hen.jsx'
import { HenSprite } from './sprites.jsx'
import { lookFrom } from './useHenLook.js'

/** The hen wearing `equipped`, on a bit of pavement in the road theme. */
export default function Mannequin({ equipped, size = 'small' }) {
  const look = lookFrom(equipped)
  return (
    <div className={`mannequin mannequin--${size} road-swatch`} data-road={look.road ?? undefined}>
      {look.trail && <Trail trail={look.trail} className="trail--static" />}
      <HenSprite colors={look.colors} hat={look.hat} neck={look.neck} />
      {look.title && <span className="mannequin__title">{look.title}</span>}
    </div>
  )
}
