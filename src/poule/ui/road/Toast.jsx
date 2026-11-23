import { useEffect } from 'react'
import { TIMING } from '../../config/timing.js'
import { usePoule } from '../../state/usePoule.js'

/** The result of a round, over the road, for a moment. */
export default function Toast() {
  const toast = usePoule((state) => state.toast)
  const dismiss = usePoule((state) => state.dismissToast)

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => dismiss(toast.id), TIMING.toast)
    return () => clearTimeout(timer)
  }, [toast, dismiss])

  return (
    <div className={`toast${toast ? ` toast--show toast--${toast.kind}` : ''}`} role="status" aria-live="polite">
      {toast && (
        <>
          {toast.title}
          {toast.detail && <small>{toast.detail}</small>}
        </>
      )}
    </div>
  )
}
