import { useCallback, useEffect, useRef, useState } from 'react'
import { sfx, unlockAudio } from '../audio/audio.js'
import { useMatrix, whenWorldSettles } from '../state/useMatrix.js'
import { BIOS, LINK, linkTranscript, memoryLine, outcomeLines, progressBar } from './script.js'

const ABORTED = Symbol('aborted')
/** If nobody touches anything, the machine wakes by itself (silently). */
const AUTO_WAKE_MS = 10000

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(ABORTED)
    const onAbort = () => {
      clearTimeout(timer)
      reject(ABORTED)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function abortable(promise, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(ABORTED)
    signal.addEventListener('abort', () => reject(ABORTED), { once: true })
    promise.then(resolve, reject)
  })
}

const ignoreAbort = (error) => {
  if (error !== ABORTED) throw error
}

/**
 * Plays the boot of the old machine.
 *
 * stage: standby → power → post → link → ready | unsupported | failed
 * screen: 'post' (grey self test) or 'link' (green terminal)
 */
export function useBootSequence() {
  const skipBoot = useMatrix((state) => state.skipBoot)
  const [stage, setStageState] = useState('standby')
  const [screen, setScreen] = useState('post')
  const [lines, setLines] = useState([])
  const [glitch, setGlitch] = useState(false)
  const stageRef = useRef('standby')
  const controller = useRef(null)

  const setStage = useCallback((next) => {
    stageRef.current = next
    setStageState(next)
  }, [])

  const restart = useCallback(() => {
    controller.current?.abort()
    controller.current = new AbortController()
    return controller.current.signal
  }, [])

  /** Waits for the 3D world, prints the verdict and shows the way in. */
  const conclude = useCallback(
    async (signal, typed) => {
      const status = await abortable(whenWorldSettles(), signal)
      for (const line of outcomeLines(status)) {
        if (typed) {
          setLines((previous) => [...previous, { ...line, text: '' }])
          for (let i = 1; i <= line.text.length; i++) {
            const text = line.text.slice(0, i)
            setLines((previous) => [...previous.slice(0, -1), { ...line, text }])
            if (i % 2 === 0) sfx.key()
            await sleep(22, signal)
          }
        } else {
          setLines((previous) => [...previous, line])
        }
      }
      if (status === 'ready') sfx.confirm()
      else sfx.error()
      setStage(status === 'ready' ? 'ready' : status)
    },
    [setStage],
  )

  const play = useCallback(async () => {
    const signal = restart()
    const wait = (ms) => sleep(ms, signal)
    const print = (text, tone) => setLines((previous) => [...previous, { text, tone }])
    const amend = (text) =>
      setLines((previous) => [...previous.slice(0, -1), { ...previous[previous.length - 1], text }])
    const type = async (text, tone, speed = 24) => {
      print('', tone)
      for (let i = 1; i <= text.length; i++) {
        amend(text.slice(0, i))
        if (i % 2 === 0) sfx.key()
        await wait(speed)
      }
    }

    /* Power on: the tube warms up. */
    setStage('power')
    sfx.powerOn()
    await wait(1000)

    /* Screen 1: power-on self test. */
    setStage('post')
    print(BIOS.title, 'bright')
    print(BIOS.copyright)
    await wait(480)
    print('')
    print(BIOS.cpu)
    sfx.beep()
    await wait(420)
    print(memoryLine(0))
    for (let kilobytes = 0; kilobytes <= BIOS.memory; kilobytes += 2048) {
      amend(memoryLine(kilobytes))
      sfx.tick()
      await wait(36)
    }
    amend(memoryLine(BIOS.memory, true))
    await wait(300)
    print('')
    for (const [label, device] of BIOS.devices) {
      print(label)
      sfx.disk()
      await wait(260 + Math.random() * 220)
      amend(label + device)
      await wait(110)
    }
    print('')
    await wait(350)
    print(BIOS.handover, 'warn')
    await wait(950)

    /* Something takes over the line: the picture tears, then turns green. */
    setGlitch(true)
    sfx.staticBurst()
    await wait(420)
    setGlitch(false)
    setLines([])
    setScreen('link')
    setStage('link')
    await wait(550)

    /* Screen 2: the link. */
    await type(LINK.booting, 'bright')
    for (const check of LINK.checks) {
      print(check)
      sfx.tick()
      await wait(170)
    }
    await wait(280)
    await type(LINK.connecting, 'bright')
    sfx.modem()

    // The bar follows the real download of the 3D world: it crawls while the
    // files are on their way and only completes once they have arrived.
    let loaded = false
    whenWorldSettles().then(() => (loaded = true))
    print(progressBar(0))
    let progress = 0
    while (progress < 1) {
      progress = Math.min(1, progress + (loaded ? 0.09 : progress < 0.86 ? 0.03 : 0.0015))
      amend(progressBar(progress))
      await wait(55)
    }
    await wait(250)
    await type(LINK.accessing, 'bright')
    await wait(450)
    await conclude(signal, true)
  }, [conclude, restart, setStage])

  /** Jumps straight to the end of the sequence. */
  const skip = useCallback(() => {
    if (!['power', 'post', 'link'].includes(stageRef.current)) return
    const signal = restart()
    setGlitch(false)
    setScreen('link')
    setStage('link')
    setLines(linkTranscript())
    conclude(signal, false).catch(ignoreAbort)
  }, [conclude, restart, setStage])

  /** First key or tap: the gesture that also allows sound. */
  const wake = useCallback(() => {
    if (stageRef.current !== 'standby') return
    unlockAudio()
    play().catch(ignoreAbort)
  }, [play])

  useEffect(() => {
    if (skipBoot) {
      stageRef.current = 'power'
      skip()
      return
    }
    // Only count the time the page is actually being looked at.
    let visible = 0
    const timer = setInterval(() => {
      if (document.hidden || stageRef.current !== 'standby') return
      visible += 500
      if (visible >= AUTO_WAKE_MS) play().catch(ignoreAbort)
    }, 500)
    return () => clearInterval(timer)
  }, [play, skip, skipBoot])

  useEffect(() => () => controller.current?.abort(), [])

  return { stage, screen, lines, glitch, wake, skip }
}
