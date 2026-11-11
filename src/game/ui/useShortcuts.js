import { useEffect } from 'react'
import { useGame } from '../state/useGame.js'

/** Keyboard shortcuts outside of ship controls, and auto-pause when the tab is hidden. */
export function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (event) => {
      const game = useGame.getState()

      if (event.code === 'Escape' || event.code === 'KeyP') {
        if (game.phase === 'playing') game.pause()
        else if (game.phase === 'paused') game.resume()
        return
      }

      // Enter starts a run from the menu or the game over screen (unless a
      // focused button is about to handle it).
      const onControl = event.target instanceof Element && event.target.closest('button, a')
      if (event.code === 'Enter' && !onControl && (game.phase === 'menu' || game.phase === 'gameover')) {
        game.start()
        return
      }

      if (game.phase === 'levelup') {
        const index = ['Digit1', 'Digit2', 'Digit3'].indexOf(event.code)
        const choice = game.choices[index]
        if (choice) game.choose(choice.id)
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) useGame.getState().pause()
    }

    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])
}
