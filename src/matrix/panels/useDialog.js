import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keyboard behaviour of a window opened over the world: focus moves into it
 * and stays there, the given keys close it, and arrow keys step through
 * elements marked `data-row`.
 */
export function useDialog({ onClose, closeCodes = ['Escape'] }) {
  const ref = useRef(null)
  const latest = useRef({ onClose, closeCodes })
  latest.current = { onClose, closeCodes }

  useEffect(() => {
    const dialog = ref.current
    const opened = performance.now()
    const focusables = () => [...dialog.querySelectorAll(FOCUSABLE)]
    ;(dialog.querySelector('[data-autofocus]') ?? dialog).focus({ preventScroll: true })

    const onKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return

      if (latest.current.closeCodes.includes(event.code)) {
        // The key press that opened the window must not close it again.
        if (performance.now() - opened < 180) return
        event.preventDefault()
        latest.current.onClose()
        return
      }

      if (event.code === 'Tab') {
        const items = focusables()
        if (items.length === 0) return event.preventDefault()
        const first = items[0]
        const last = items[items.length - 1]
        const inside = dialog.contains(document.activeElement) && document.activeElement !== dialog
        if (event.shiftKey && (!inside || document.activeElement === first)) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
          event.preventDefault()
          first.focus()
        }
        return
      }

      if (event.code === 'ArrowDown' || event.code === 'ArrowUp') {
        const rows = [...dialog.querySelectorAll('[data-row]')]
        if (rows.length === 0) return
        event.preventDefault()
        const index = rows.indexOf(document.activeElement)
        const step = event.code === 'ArrowDown' ? 1 : -1
        rows[(index + step + rows.length) % rows.length].focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return ref
}
