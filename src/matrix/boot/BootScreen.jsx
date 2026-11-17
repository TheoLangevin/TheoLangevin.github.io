import { useEffect } from 'react'
import { useMatrix } from '../state/useMatrix.js'
import './boot.css'
import NoiseCanvas from './NoiseCanvas.jsx'
import RainCanvas from './RainCanvas.jsx'
import { useBootSequence } from './useBootSequence.js'

const IGNORED_KEYS = new Set(['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'm', 'M'])

function Standby() {
  return (
    <div className="crt__standby">
      <p className="crt__dormant">SYSTEM DORMANT</p>
      <p className="crt__wake">
        <span className="crt__wake-keys">PRESS ANY KEY TO WAKE THE MACHINE</span>
        <span className="crt__wake-touch">TAP THE SCREEN TO WAKE THE MACHINE</span>
      </p>
    </div>
  )
}

function Outcome({ stage }) {
  const moveKeys = useMatrix((state) => state.moveKeys)
  const enterWorld = useMatrix((state) => state.enterWorld)
  const enterTextMode = useMatrix((state) => state.enterTextMode)

  if (stage === 'ready') {
    return (
      <div className="crt__outcome">
        <button type="button" className="crt__enter" onClick={enterWorld} autoFocus>
          ENTER THE MATRIX
        </button>
        <p className="crt__hint">
          <span className="crt__hint-keys">{moveKeys} MOVE · MOUSE LOOK · E INTERACT</span>
          <span className="crt__hint-touch">LEFT THUMB MOVES · RIGHT THUMB LOOKS</span>
        </p>
      </div>
    )
  }

  return (
    <div className="crt__outcome">
      <div className="crt__choices">
        <button type="button" className="crt__enter" onClick={enterTextMode} autoFocus>
          ENTER TEXT MODE
        </button>
        {stage === 'failed' && (
          <button type="button" className="crt__enter crt__enter--quiet" onClick={() => window.location.reload()}>
            RETRY
          </button>
        )}
      </div>
      <p className="crt__hint">
        OR OPEN <a href="/">THE CLASSIC SITE</a>
      </p>
    </div>
  )
}

/**
 * The first thing a visitor sees on /new: an old computer waking up, running
 * its self test, then connecting to "somewhere else".
 */
export default function BootScreen() {
  const { stage, screen, lines, glitch, wake, skip } = useBootSequence()
  const leavingBoot = useMatrix((state) => state.phase !== 'boot')
  const sound = useMatrix((state) => state.sound)
  const toggleSound = useMatrix((state) => state.toggleSound)

  const running = stage === 'power' || stage === 'post' || stage === 'link'
  const settled = stage === 'ready' || stage === 'unsupported' || stage === 'failed'

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === 'Escape') skip()
      else if (!IGNORED_KEYS.has(event.key)) wake()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [skip, wake])

  const classes = ['crt', `crt--${screen}`, `crt--${stage}`]
  if (glitch) classes.push('crt--glitch')
  if (leavingBoot) classes.push('crt--entering')

  return (
    <div className={classes.join(' ')} onPointerDown={stage === 'standby' ? wake : undefined}>
      {screen === 'link' && <RainCanvas className="crt__rain" speed={leavingBoot ? 2.6 : 1} />}
      <NoiseCanvas className="crt__noise" />

      <div className="crt__screen">
        {stage === 'standby' ? (
          <Standby />
        ) : (
          <>
            {/* Animated text is decoration; the buttons below are the real interface. */}
            <pre className="crt__text" aria-hidden="true">
              {lines.map((line, index) => (
                <span key={index} className={`crt__line${line.tone ? ` crt__line--${line.tone}` : ''}`}>
                  {line.text}
                  {index === lines.length - 1 && !settled && <span className="crt__cursor" />}
                  {'\n'}
                </span>
              ))}
              {settled && (
                <span className="crt__line">
                  {'> '}
                  <span className="crt__cursor" />
                </span>
              )}
            </pre>
            <p className="sr-only" role="status">
              {settled ? 'The machine has booted.' : 'The machine is booting. Press Escape to skip.'}
            </p>
            {settled && <Outcome stage={stage} />}
          </>
        )}
      </div>

      <div className="crt__flash" />
      <div className="crt__tear" />
      <div className="crt__roll" />
      <div className="crt__scanlines" />
      <div className="crt__vignette" />

      <div className="crt__bar">
        <button type="button" className="crt__tool" onClick={toggleSound} aria-pressed={sound}>
          [M] SOUND: {sound ? 'ON' : 'OFF'}
        </button>
        {running && (
          <button type="button" className="crt__tool" onClick={skip}>
            [ESC] SKIP
          </button>
        )}
        <span className="crt__led" aria-hidden="true" />
      </div>
    </div>
  )
}
