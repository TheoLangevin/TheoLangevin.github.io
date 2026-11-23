import { HenSprite } from './sprites.jsx'

const PUFFS = [0, 1, 2, 3, 4]

/**
 * The hen. A new `hop` value replays the jump (and the trail, if she wears
 * one); `flat` is what a car leaves; `fast` is the turbo upgrade.
 */
export default function Hen({ x, hop, flat, fast, look }) {
  const className = ['hen', flat && 'hen--flat', fast && 'hen--fast'].filter(Boolean).join(' ')
  return (
    <div className={className} style={{ left: x }}>
      {look.trail && hop > 0 && !flat && (
        <div key={`trail-${hop}`} className={`trail trail--${look.trail}`} aria-hidden="true">
          {PUFFS.map((index) => (
            <span key={index} style={{ '--i': index }} />
          ))}
        </div>
      )}
      <div key={hop} className={hop > 0 ? 'hen__body hen__body--hop' : 'hen__body'}>
        <HenSprite plumage={look.plumage} hat={look.hat} />
      </div>
    </div>
  )
}
