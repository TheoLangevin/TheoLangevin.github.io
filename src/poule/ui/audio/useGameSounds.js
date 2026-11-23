import { useEffect, useRef } from 'react'
import { usePoule } from '../../state/usePoule.js'
import { playChime, playCoin, playCrash, playHop, playStart, playWin, setMuted, unlockAudio } from './sfx.js'

const SOUNDS = {
  start: () => playStart(),
  hop: (fx) => playHop(fx.lane),
  crash: () => playCrash(),
  win: (fx) => playWin(fx.multiplier),
  buy: () => playCoin(),
}

/** Plays the sound of each game effect, and a chime for each new notice. */
export function useGameSounds() {
  const fx = usePoule((state) => state.fx)
  const sound = usePoule((state) => state.sound)
  const noticeCount = usePoule((state) => state.notices.length)

  useEffect(() => setMuted(!sound), [sound])

  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (fx) SOUNDS[fx.type]?.(fx)
  }, [fx])

  const lastCount = useRef(0)
  useEffect(() => {
    if (noticeCount > lastCount.current) playChime()
    lastCount.current = noticeCount
  }, [noticeCount])
}
