import { HenSprite } from './sprites.jsx'

const PUFFS = [0, 1, 2, 3, 4]

/** The trail a hop leaves, in the shape and colours of the worn trail. */
export function Trail({ trail, className = '' }) {
  return (
    <div className={`trail trail--${trail.shape} ${className}`} aria-hidden="true">
      {PUFFS.map((index) => (
        <span key={index} style={{ '--i': index, '--c': trail.colors[index % trail.colors.length] }}>
          {trail.shape === 'glyph' ? trail.glyph : null}
        </span>
      ))}
    </div>
  )
}

/**
 * The hen. A new `hop` value replays the jump (and the trail, if she wears
 * one); `flat` is what a car leaves; `look.fast` is the turbo perk.
 */
export default function Hen({ x, hop, flat, look }) {
  const className = ['hen', flat && 'hen--flat', look.fast && 'hen--fast'].filter(Boolean).join(' ')
  return (
    <div className={className} style={{ left: x }}>
      {look.trail && hop > 0 && !flat && <Trail key={`trail-${hop}`} trail={look.trail} />}
      <div key={hop} className={hop > 0 ? 'hen__body hen__body--hop' : 'hen__body'}>
        <HenSprite colors={look.colors} hat={look.hat} neck={look.neck} />
      </div>
    </div>
  )
}
