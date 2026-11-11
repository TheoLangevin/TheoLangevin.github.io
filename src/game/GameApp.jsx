import { useEffect } from 'react'
import { attachControls } from './input/controls.js'
import GameCanvas from './scene/GameCanvas.jsx'
import { useGame } from './state/useGame.js'
import ErrorBoundary from './ui/ErrorBoundary.jsx'
import GameOver from './ui/GameOver.jsx'
import Hud from './ui/Hud.jsx'
import MainMenu from './ui/MainMenu.jsx'
import PauseMenu from './ui/PauseMenu.jsx'
import TouchControls from './ui/TouchControls.jsx'
import UpgradeModal from './ui/UpgradeModal.jsx'
import { useShortcuts } from './ui/useShortcuts.js'

const SCREENS = {
  menu: MainMenu,
  paused: PauseMenu,
  levelup: UpgradeModal,
  gameover: GameOver,
}

/** The 3D canvas with the DOM interface layered on top of it. */
export default function GameApp() {
  const phase = useGame((state) => state.phase)
  const Screen = SCREENS[phase]

  useEffect(() => attachControls(), [])
  useShortcuts()

  return (
    <ErrorBoundary>
      <GameCanvas />
      {phase !== 'menu' && <Hud />}
      {phase === 'playing' && <TouchControls />}
      {Screen && <Screen />}
    </ErrorBoundary>
  )
}
