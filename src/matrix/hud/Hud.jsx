import { useEffect, useState } from 'react'
import { NODE_BY_ID, SECTOR_BY_ID } from '../content/world.js'
import { capturePointer } from '../input/pointerLock.js'
import { useDecode } from '../panels/useDecode.js'
import { useMatrix } from '../state/useMatrix.js'
import './hud.css'
import Minimap from './Minimap.jsx'
import Readout from './Readout.jsx'
import TouchControls from './TouchControls.jsx'

function SectorBanner({ sector }) {
  const name = useDecode(sector.name, 650)
  return (
    <div className="hud__banner" aria-hidden="true">
      <p className="hud__banner-kicker">ENTERING SECTOR</p>
      <p className="hud__banner-name">{name}</p>
      <p className="hud__banner-label">
        {sector.label} · {sector.summary}
      </p>
    </div>
  )
}

function FocusPrompt({ node, touch }) {
  const title = useDecode(node.title.toUpperCase(), 300)
  return (
    <div className="hud__prompt" role="status">
      {!touch && <kbd className="hud__key">E</kbd>}
      <span className="hud__prompt-text">
        <span className="hud__prompt-code">{node.code}</span>
        <span className="hud__prompt-title">{title}</span>
        <span className="hud__prompt-action">{node.portal ? 'OPEN LINK' : 'ACCESS'}</span>
      </span>
    </div>
  )
}

function Controls({ moveKeys }) {
  const [open, setOpen] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setOpen(false), 14000)
    const onKeyDown = (event) => {
      if (event.code === 'KeyH' && !event.repeat) setOpen((value) => !value)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  if (!open) return <p className="hud__controls hud__controls--closed">[H] CONTROLS</p>
  return (
    <dl className="hud__controls">
      {[
        [moveKeys, 'MOVE'],
        ['MOUSE', 'LOOK'],
        ['E / CLICK', 'INTERACT'],
        ['SHIFT', 'RUN'],
        ['SPACE', 'JUMP'],
        ['TAB', 'DIRECTORY'],
        ['ESC', 'MENU'],
        ['H', 'HIDE'],
      ].map(([keys, action]) => (
        <div key={action}>
          <dt>{keys}</dt>
          <dd>{action}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The interface of the world: status, position, radar, crosshair and prompts. */
export default function Hud() {
  const phase = useMatrix((state) => state.phase)
  const overlay = useMatrix((state) => state.overlay)
  const focusId = useMatrix((state) => state.focusId)
  const sectorId = useMatrix((state) => state.sectorId)
  const locked = useMatrix((state) => state.locked)
  const sound = useMatrix((state) => state.sound)
  const quality = useMatrix((state) => state.quality)
  const toast = useMatrix((state) => state.toast)
  const sweep = useMatrix((state) => state.sweep)
  const moveKeys = useMatrix((state) => state.moveKeys)
  const touch = useMatrix((state) => state.touch)
  const reducedMotion = useMatrix((state) => state.reducedMotion)

  if (phase !== 'world') return null
  const sector = sectorId ? SECTOR_BY_ID[sectorId] : null
  const focus = focusId ? NODE_BY_ID[focusId] : null
  const hidden = Boolean(overlay)

  return (
    <div className={`hud${hidden ? ' hud--dimmed' : ''}`}>
      <div className="hud__corner hud__corner--tl">
        <p className="hud__status">
          <span className="hud__dot" /> LINK STABLE // TL-NET
        </p>
        <p className="hud__sector">
          {sector ? (
            <>
              SECTOR <b>{sector.name}</b> · {sector.label}
            </>
          ) : (
            <>
              SECTOR <b>OPEN GRID</b>
            </>
          )}
        </p>
        <Readout />
        <p className="hud__meta">
          SOUND {sound ? 'ON' : 'OFF'} [M] · GFX {quality.toUpperCase()}
        </p>
      </div>

      <div className="hud__corner hud__corner--tr">
        <Minimap />
      </div>

      {!touch && !hidden && (
        <div className="hud__corner hud__corner--bl">
          <Controls moveKeys={moveKeys} />
        </div>
      )}

      {!hidden && <div className={`hud__crosshair${focus ? ' hud__crosshair--focus' : ''}`} aria-hidden="true" />}
      {!hidden && focus && <FocusPrompt key={focus.id} node={focus} touch={touch} />}

      {!touch && !locked && !hidden && (
        <button type="button" className="hud__capture" onClick={capturePointer}>
          CLICK TO LOOK AROUND · OR DRAG
        </button>
      )}

      {!hidden && sector && sweep > 0 && <SectorBanner key={`${sector.id}-${sweep}`} sector={sector} />}
      {toast && <p className="hud__toast">{toast}</p>}
      {!reducedMotion && sweep > 0 && <div key={sweep} className="hud__sweep" aria-hidden="true" />}

      {touch && !hidden && <TouchControls />}
    </div>
  )
}
