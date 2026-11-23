import { useEffect } from 'react'
import { usePoule } from '../../state/usePoule.js'

const typing = (target) => target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable]')

/** Space plays or steps forward, C cashes out. */
export function useKeyboard() {
  useEffect(() => {
    const onKey = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || typing(event.target)) return
      const { play, cashOut } = usePoule.getState()
      // A focused button already reacts to Space with a click.
      if (event.code === 'Space' && !event.target.closest?.('button')) {
        event.preventDefault()
        play()
      } else if (event.code === 'KeyC') {
        cashOut()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
