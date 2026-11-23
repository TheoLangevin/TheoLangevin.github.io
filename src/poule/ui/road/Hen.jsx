import { HenSprite } from './sprites.jsx'

/** The hen. A new `hop` value replays the jump; `flat` is what a car leaves. */
export default function Hen({ x, hop, flat }) {
  return (
    <div className={`hen${flat ? ' hen--flat' : ''}`} style={{ left: x }}>
      <div key={hop} className={hop > 0 ? 'hen__body hen__body--hop' : 'hen__body'}>
        <HenSprite />
      </div>
    </div>
  )
}
