import './panels.css'
import { useDecode } from './useDecode.js'
import { useDialog } from './useDialog.js'

/**
 * A holographic window: the frame every piece of content opens in. The world
 * stays visible behind it.
 */
export default function HoloPanel({ path, code, title, closeHint = 'ESC', closeCodes, onClose, wide = false, actions, children }) {
  const ref = useDialog({ onClose, closeCodes })
  const decoded = useDecode(title.toUpperCase())

  return (
    <div className="holo" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        ref={ref}
        className={`holo__window${wide ? ' holo__window--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="holo__bar">
          <span className="holo__path">{path}</span>
          <button type="button" className="holo__close" onClick={onClose}>
            [{closeHint}] CLOSE
          </button>
        </header>

        <div className="holo__scroll">
          {code && <p className="holo__code">{code}</p>}
          <h1 className="holo__title" aria-label={title}>
            <span aria-hidden="true">{decoded}</span>
          </h1>
          {children}
        </div>

        {actions && <footer className="holo__actions">{actions}</footer>}

        <span className="holo__corner holo__corner--tl" aria-hidden="true" />
        <span className="holo__corner holo__corner--tr" aria-hidden="true" />
        <span className="holo__corner holo__corner--bl" aria-hidden="true" />
        <span className="holo__corner holo__corner--br" aria-hidden="true" />
      </section>
    </div>
  )
}
