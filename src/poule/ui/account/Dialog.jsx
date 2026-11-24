import { useEffect, useId, useRef } from 'react'

/**
 * A modal dialog: traps nothing fancy, but takes focus, closes on Escape and
 * on a click outside (unless `locked`), and gives focus back when it closes.
 */
export default function Dialog({ title, onClose, locked = false, children, wide = false }) {
  const titleId = useId()
  const panel = useRef(null)

  useEffect(() => {
    const previous = document.activeElement
    // Focus the dialog itself (not its first button), so a tap does not leave a focus ring on an action.
    panel.current?.focus({ preventScroll: true })
    const onKey = (event) => {
      if (event.key === 'Escape' && !locked) onClose?.()
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('has-dialog')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('has-dialog')
      previous?.focus?.()
    }
  }, [locked, onClose])

  return (
    <div className="dialog" onMouseDown={(event) => event.target === event.currentTarget && !locked && onClose?.()}>
      <div
        ref={panel}
        className={`dialog__panel${wide ? ' dialog__panel--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby={titleId}
      >
        <div className="dialog__head">
          <h2 id={titleId}>{title}</h2>
          {!locked && (
            <button type="button" className="dialog__close" data-close onClick={onClose} aria-label="Fermer">
              ×
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
