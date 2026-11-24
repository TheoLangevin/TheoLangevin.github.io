import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { usePoule } from '../../state/usePoule.js'
import { playDance } from '../audio/sfx.js'
import { HenSprite } from '../road/sprites.jsx'
import { useHenLook } from '../road/useHenLook.js'
import './events.css'

const NOTES = ['♪', '♫', '♪', '♬', '♫', '♪']
const COLORS = ['#ff7a1a', '#ffc21a', '#ffffff', '#e8392c', '#8fd3ff']

/** The hidden item was bought: the hen dances with the cone on her head. */
export default function ConeParty() {
  const celebration = usePoule((state) => state.celebration)
  const close = usePoule((state) => state.closeCelebration)
  const look = useHenLook()
  const confetti = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        key: i,
        style: {
          left: `${Math.random() * 100}%`,
          background: COLORS[i % COLORS.length],
          animationDelay: `${Math.random() * 2}s`,
          animationDuration: `${2 + Math.random() * 2}s`,
        },
      })),
    [],
  )

  useEffect(() => {
    if (celebration !== 'cone') return undefined
    playDance()
    const onKey = (event) => event.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [celebration, close])

  if (celebration !== 'cone') return null
  return createPortal(
    <div className="party" role="dialog" aria-modal="true" aria-label="Ceci n’est pas un chapeau" onClick={close}>
      <div className="party__lights" aria-hidden="true" />
      {confetti.map((piece) => (
        <i key={piece.key} className="party__confetti" style={piece.style} aria-hidden="true" />
      ))}
      <div className="party__stage">
        {NOTES.map((note, i) => (
          <span key={i} className="party__note" style={{ '--i': i }} aria-hidden="true">
            {note}
          </span>
        ))}
        <div className="party__hen">
          <HenSprite colors={look.colors} hat="cone" neck={look.neck} />
        </div>
        <div className="party__floor" aria-hidden="true" />
      </div>
      <p className="party__title">Ceci n’est pas un chapeau.</p>
      <p className="party__sub">Vous avez trouvé l’objet caché. La poule ne s’en remet pas.</p>
      <button type="button" className="big big--buy party__close" onClick={close}>
        Trop stylé
      </button>
    </div>,
    document.body,
  )
}
