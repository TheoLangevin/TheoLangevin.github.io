import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { TORNADO_BONUS, WHEEL } from '../../config/events.js'
import { spinWheel, wheelRotation } from '../../domain/events.js'
import { usePoule } from '../../state/usePoule.js'
import Dialog from '../account/Dialog.jsx'
import { playSpin, playWind } from '../audio/sfx.js'
import { HenSprite } from '../road/sprites.jsx'
import { useHenLook } from '../road/useHenLook.js'
import './events.css'

const SPIN_SECONDS = 3.6

/** The wheel of fortune, drawn as eight slices with their prize. */
function WheelDrawing({ rotation }) {
  const slice = 360 / WHEEL.length
  const point = (angle, radius) => {
    const rad = ((angle - 90) * Math.PI) / 180
    return [100 + radius * Math.cos(rad), 100 + radius * Math.sin(rad)]
  }
  return (
    <svg
      viewBox="0 0 200 200"
      className="wheel__disc"
      style={{ transform: `rotate(${rotation}deg)` }}
      aria-hidden="true"
    >
      {WHEEL.map((segment, index) => {
        const start = index * slice - slice / 2
        const [x1, y1] = point(start, 96)
        const [x2, y2] = point(start + slice, 96)
        const [tx, ty] = point(index * slice, 66)
        const dark = segment.color !== '#ffffff' && segment.color !== '#ffc21a'
        return (
          <g key={segment.id}>
            <path
              d={`M100 100L${x1} ${y1}A96 96 0 0 1 ${x2} ${y2}Z`}
              fill={segment.color}
              stroke="#2a2c35"
              strokeWidth="2"
            />
            <text
              x={tx}
              y={ty}
              transform={`rotate(${index * slice} ${tx} ${ty})`}
              textAnchor="middle"
              dominantBaseline="middle"
              className="wheel__label"
              fill={dark ? '#fff' : '#2b1f00'}
            >
              {segment.label}
            </text>
          </g>
        )
      })}
      <circle cx="100" cy="100" r="16" fill="#2a2c35" />
      <circle cx="100" cy="100" r="7" fill="#ffc21a" />
    </svg>
  )
}

function Wheel({ resolve, dismiss }) {
  const [landed, setLanded] = useState(null)
  const [target, setTarget] = useState(null)
  const [rotation, setRotation] = useState(0)

  function spin() {
    if (target !== null) return
    const index = spinWheel(Math.random)
    setTarget(index)
    setRotation(wheelRotation(index))
    playSpin(SPIN_SECONDS)
    setTimeout(() => setLanded(WHEEL[index]), SPIN_SECONDS * 1000 + 150)
  }

  const actions = landed ? (
    <button
      type="button"
      className="big big--buy"
      onClick={() => resolve(landed.bonus, { title: 'La roue', detail: landed.detail })}
    >
      {landed.id === 'cot' ? 'Dommage !' : 'Récupérer'}
      <small>{landed.detail}</small>
    </button>
  ) : (
    <button type="button" className="big big--play" onClick={spin} disabled={target !== null}>
      {target === null ? 'Tourner la roue' : 'Ça tourne…'}
    </button>
  )

  return (
    <Dialog
      title="La roue de la fortune !"
      onClose={target === null ? dismiss : undefined}
      locked={target !== null}
      actions={actions}
    >
      <p className="muted">Elle apparaît au hasard entre deux parties. Un tour gratuit, juste pour rire.</p>
      <div className="wheel">
        <span className="wheel__pointer" aria-hidden="true" />
        <WheelDrawing rotation={rotation} />
      </div>
      <p className="wheel__result" aria-live="polite">
        {landed ? landed.detail : ' '}
      </p>
    </Dialog>
  )
}

/** A tornado sweeps across the screen and blows a few tokens in (and feathers fly for the show). */
function Tornado({ resolve }) {
  useEffect(() => {
    playWind()
    const timer = setTimeout(
      () =>
        resolve(TORNADO_BONUS, {
          title: 'Tornade !',
          detail: `Le vent a apporté ${TORNADO_BONUS.tokens / 100} jetons`,
        }),
      2600,
    )
    return () => clearTimeout(timer)
  }, [resolve])

  const feathers = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ key: i, delay: Math.random() * 1.2, top: 15 + Math.random() * 65 })),
    [],
  )

  return createPortal(
    <div className="tornado" role="status" aria-label="Une tornade traverse la route">
      <svg viewBox="0 0 120 200" className="tornado__funnel" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <ellipse
            key={i}
            cx={60 + (i % 2 ? 6 : -6)}
            cy={20 + i * 26}
            rx={52 - i * 6.5}
            ry={9 - i * 0.6}
            fill="none"
            stroke="#c9d2dc"
            strokeWidth={6 - i * 0.5}
            style={{ animationDelay: `${i * 0.07}s` }}
          />
        ))}
      </svg>
      {feathers.map((feather) => (
        <span
          key={feather.key}
          className="tornado__bit"
          style={{ top: `${feather.top}%`, animationDelay: `${feather.delay}s` }}
        />
      ))}
      <p className="tornado__text">Tornade !</p>
    </div>,
    document.body,
  )
}

/** Two hens: the next round pays double XP and tokens per lane. */
function DoubleHen({ resolve }) {
  const look = useHenLook()
  const actions = (
    <button
      type="button"
      className="big big--play"
      onClick={() => resolve({ double: true }, { title: 'Double poule !', detail: 'Prochaine partie : XP ×2 et des jetons à chaque voie' })}
    >
      Cot cot !
    </button>
  )
  return (
    <Dialog title="Double poule !" onClose={actions.props.onClick} actions={actions}>
      <div className="double" aria-hidden="true">
        <HenSprite colors={look.colors} hat={look.hat} neck={look.neck} />
        <HenSprite colors={look.colors} hat={look.hat} neck={look.neck} />
      </div>
      <p>
        Une jumelle vous accompagne : à la prochaine partie, vous gagnez deux fois plus d’XP et chaque voie franchie rapporte des jetons en plus.
      </p>
    </Dialog>
  )
}

/** Whichever random event is happening (config/events.js). */
export default function EventLayer() {
  const event = usePoule((state) => state.event)
  const resolve = usePoule((state) => state.resolveEvent)
  const dismiss = usePoule((state) => state.dismissEvent)
  if (!event) return null
  if (event.id === 'wheel') return <Wheel key={event.key} resolve={resolve} dismiss={dismiss} />
  if (event.id === 'tornado') return <Tornado key={event.key} resolve={resolve} />
  if (event.id === 'double') return <DoubleHen key={event.key} resolve={resolve} />
  return null
}
