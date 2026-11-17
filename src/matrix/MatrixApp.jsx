import { lazy, Suspense, useEffect, useState } from 'react'
import { resumeAudio, suspendAudio } from './audio/audio.js'
import BootScreen from './boot/BootScreen.jsx'
import Hud from './hud/Hud.jsx'
import { detectMoveKeys } from './input/keyboardLayout.js'
import Overlays from './panels/Overlays.jsx'
import { useMatrix } from './state/useMatrix.js'
import TextMode from './textmode/TextMode.jsx'
import ErrorBoundary from './ui/ErrorBoundary.jsx'
import Leaving from './ui/Leaving.jsx'
import SignalLost from './ui/SignalLost.jsx'
import { detectWebGL2, importWorld } from './world/loader.js'

const World = lazy(importWorld)

/** How long the boot screen takes to dissolve once the visitor has entered. */
const BOOT_EXIT_MS = 1750

/**
 * The whole experience: the boot screen on top, the 3D world loading
 * underneath it, then the interface (HUD and holographic windows) over the world.
 */
export default function MatrixApp() {
  const phase = useMatrix((state) => state.phase)
  const worldStatus = useMatrix((state) => state.worldStatus)
  const signalLost = useMatrix((state) => state.signalLost)
  const [bootVisible, setBootVisible] = useState(true)

  // Fetch the 3D world right away, so it is ready by the time the boot ends.
  useEffect(() => {
    const { setWorldStatus, setMoveKeys } = useMatrix.getState()
    if (detectWebGL2()) importWorld().catch(() => setWorldStatus('failed'))
    else setWorldStatus('unsupported')
    detectMoveKeys().then(setMoveKeys)
  }, [])

  useEffect(() => {
    if (phase === 'boot') return
    const timer = setTimeout(() => setBootVisible(false), BOOT_EXIT_MS)
    return () => clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    // M toggles the sound everywhere, from the boot screen to the world.
    const onKeyDown = (event) => {
      if (event.code !== 'KeyM' || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return
      useMatrix.getState().toggleSound()
    }
    const onVisibilityChange = () => (document.hidden ? suspendAudio() : resumeAudio())
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const worldPossible = worldStatus === 'loading' || worldStatus === 'ready'
  const inWorld = phase === 'entering' || phase === 'world'

  return (
    <>
      {worldPossible && phase !== 'textmode' && (
        <ErrorBoundary onError={() => useMatrix.getState().setWorldStatus('failed')}>
          <Suspense fallback={null}>
            <World />
          </Suspense>
        </ErrorBoundary>
      )}
      {phase === 'textmode' && <TextMode />}
      {inWorld && <Hud />}
      {inWorld && <Overlays />}
      {inWorld && (signalLost || !worldPossible) && <SignalLost />}
      {bootVisible && <BootScreen />}
      <Leaving />
    </>
  )
}
