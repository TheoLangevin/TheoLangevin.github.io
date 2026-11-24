/**
 * Sound effects synthesised with Web Audio: no audio files to load. The
 * context starts on the first gesture (browsers require one) and every
 * function is a no-op when audio is unavailable or muted.
 */

let context = null
let muted = false

export const setMuted = (value) => {
  muted = value
}

/** Call from a click or key handler. */
export function unlockAudio() {
  try {
    context ??= new (window.AudioContext || window.webkitAudioContext)()
    if (context.state === 'suspended') context.resume()
  } catch {
    context = null
  }
}

function tone({ freq, to = freq, duration = 0.12, type = 'square', volume = 0.08, delay = 0 }) {
  if (muted || !context || context.state !== 'running') return
  const start = context.currentTime + delay
  const osc = context.createOscillator()
  const gain = context.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  osc.frequency.exponentialRampToValueAtTime(to, start + duration)
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain).connect(context.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

function noise({ duration = 0.35, volume = 0.25 }) {
  if (muted || !context || context.state !== 'running') return
  const length = Math.floor(context.sampleRate * duration)
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2
  const source = context.createBufferSource()
  const gain = context.createGain()
  gain.gain.value = volume
  source.buffer = buffer
  source.connect(gain).connect(context.destination)
  source.start()
}

/** A little hop, higher pitched the further the hen goes. */
export const playHop = (lane = 1) => tone({ freq: 300 + lane * 28, to: 520 + lane * 32, duration: 0.09 })

export function playCrash() {
  noise({ duration: 0.4, volume: 0.3 })
  tone({ freq: 220, to: 60, duration: 0.35, type: 'sawtooth', volume: 0.08 })
}

/** A rising arpeggio, longer for bigger multipliers. */
export function playWin(multiplier = 1) {
  const notes = multiplier >= 10 ? [523, 659, 784, 1047, 1319] : multiplier >= 3 ? [523, 659, 784, 1047] : [523, 784]
  notes.forEach((freq, index) => tone({ freq, duration: 0.14, type: 'triangle', volume: 0.1, delay: index * 0.08 }))
}

export const playCoin = () => {
  tone({ freq: 988, duration: 0.07, type: 'square', volume: 0.06 })
  tone({ freq: 1319, duration: 0.2, type: 'square', volume: 0.06, delay: 0.07 })
}

export const playChime = () =>
  [784, 988, 1175].forEach((freq, index) =>
    tone({ freq, duration: 0.25, type: 'sine', volume: 0.09, delay: index * 0.1 }),
  )

export const playStart = () => tone({ freq: 440, to: 660, duration: 0.1, type: 'triangle', volume: 0.07 })

/** A little dance tune for the hidden item's party (about 2.5 s). */
export function playDance() {
  const notes = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047]
  notes.forEach((freq, index) => tone({ freq, duration: 0.16, type: 'square', volume: 0.05, delay: index * 0.2 }))
  ;[0, 0.8, 1.6].forEach((delay) => tone({ freq: 131, to: 98, duration: 0.25, type: 'triangle', volume: 0.12, delay }))
}

/** The wheel ticking as it slows down. */
export function playSpin(duration = 3.6) {
  let at = 0
  let gap = 0.05
  while (at < duration) {
    tone({ freq: 1400, duration: 0.03, type: 'square', volume: 0.03, delay: at })
    at += gap
    gap *= 1.09
  }
}

/** Wind for the tornado. */
export function playWind() {
  noise({ duration: 1.6, volume: 0.12 })
  tone({ freq: 180, to: 420, duration: 1.4, type: 'sine', volume: 0.05 })
}
