import { useMatrix } from '../state/useMatrix.js'
import './system.css'

/** Shown when the 3D scene stops working after the visitor has entered. */
export default function SignalLost() {
  const enterTextMode = useMatrix((state) => state.enterTextMode)

  return (
    <div className="signal" role="alertdialog" aria-modal="true" aria-labelledby="signal-title">
      <div className="signal__box">
        <p className="signal__code">// ERROR 0x3D</p>
        <h1 id="signal-title" className="signal__title">
          SIGNAL LOST
        </h1>
        <p>The 3D link dropped: your browser stopped rendering the world.</p>
        <div className="signal__actions">
          <button type="button" className="signal__button" onClick={() => window.location.reload()} autoFocus>
            RECONNECT
          </button>
          <button type="button" className="signal__button" onClick={enterTextMode}>
            TEXT MODE
          </button>
          <a className="signal__button" href="/">
            CLASSIC SITE
          </a>
        </div>
      </div>
    </div>
  )
}
