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

function tone({ freq, to = freq, duration = 0.12, type = 'square', volume = 0.08, delay = 0, out = null }) {
  if (muted || !context || context.state !== 'running') return
  const start = context.currentTime + delay
  const osc = context.createOscillator()
  const gain = context.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  osc.frequency.exponentialRampToValueAtTime(to, start + duration)
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain).connect(out ?? context.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

function noise({ duration = 0.35, volume = 0.25, delay = 0, highpass = 0 }) {
  if (muted || !context || context.state !== 'running') return
  const length = Math.floor(context.sampleRate * duration)
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2
  const source = context.createBufferSource()
  const gain = context.createGain()
  gain.gain.value = volume
  source.buffer = buffer
  if (highpass) {
    const filter = context.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = highpass
    source.connect(filter).connect(gain).connect(context.destination)
  } else source.connect(gain).connect(context.destination)
  source.start(context.currentTime + delay)
}

/**
 * A little hop, higher pitched the further the hen goes, with a soft cluck;
 * past a few lanes a low heartbeat adds tension.
 */
export function playHop(lane = 1) {
  tone({ freq: 300 + lane * 28, to: 520 + lane * 32, duration: 0.09 })
  tone({ freq: 900, to: 650, duration: 0.04, type: 'triangle', volume: 0.05, delay: 0.09 })
  if (lane >= 5) {
    const beat = Math.min(0.12, 0.04 + lane * 0.005)
    tone({ freq: 70, to: 45, duration: 0.09, type: 'sine', volume: beat, delay: 0.16 })
    tone({ freq: 70, to: 45, duration: 0.09, type: 'sine', volume: beat * 0.7, delay: 0.3 })
  }
}

/** Horn, tyres screeching, then the impact. */
export function playCrash() {
  tone({ freq: 440, duration: 0.14, type: 'sawtooth', volume: 0.05 })
  tone({ freq: 554, duration: 0.14, type: 'sawtooth', volume: 0.05 })
  noise({ duration: 0.18, volume: 0.12, highpass: 2500 })
  noise({ duration: 0.45, volume: 0.32, delay: 0.12 })
  tone({ freq: 220, to: 55, duration: 0.4, type: 'sawtooth', volume: 0.09, delay: 0.12 })
}

/** Ka-ching, then a rising arpeggio, longer for bigger multipliers. */
export function playWin(multiplier = 1) {
  tone({ freq: 1568, duration: 0.05, type: 'square', volume: 0.05 })
  tone({ freq: 2093, duration: 0.18, type: 'square', volume: 0.05, delay: 0.05 })
  const notes = multiplier >= 10 ? [523, 659, 784, 1047, 1319, 1568] : multiplier >= 3 ? [523, 659, 784, 1047] : [523, 784]
  notes.forEach((freq, index) => tone({ freq, duration: 0.16, type: 'triangle', volume: 0.1, delay: 0.15 + index * 0.08 }))
  if (multiplier >= 10) noise({ duration: 0.8, volume: 0.06, delay: 0.2, highpass: 6000 })
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

/**
 * Background music: a small chiptune loop (bass, chords, a light melody),
 * scheduled a little ahead with Web Audio. Quiet, and silent when muted.
 */
const BPM = 112
const STEP = 60 / BPM / 2 // eighth notes
// A–F–C–G, two bars each, in eighths: bass root, arpeggio, sparse melody.
const PROGRESSION = [
  [110, [440, 523, 659]],
  [87.3, [349, 440, 523]],
  [130.8, [392, 523, 659]],
  [98, [392, 494, 587]],
]
const MELODY = [659, 0, 784, 0, 659, 587, 523, 0, 587, 0, 523, 0, 440, 0, 0, 0]
let musicGain = null
let musicTimer = null
let musicStep = 0
let musicAt = 0

function scheduleMusic() {
  while (musicAt < context.currentTime + 0.3) {
    const bar = Math.floor(musicStep / 16) % PROGRESSION.length
    const [bass, chord] = PROGRESSION[bar]
    const step = musicStep % 16
    const delay = Math.max(0, musicAt - context.currentTime)
    if (step % 4 === 0) tone({ freq: bass, duration: STEP * 1.8, type: 'triangle', volume: 0.5, delay, out: musicGain })
    tone({ freq: chord[step % 3], duration: STEP * 0.6, type: 'square', volume: 0.12, delay, out: musicGain })
    const note = MELODY[(musicStep + bar * 4) % MELODY.length]
    if (note && bar % 2 === 1) tone({ freq: note, duration: STEP * 1.5, type: 'triangle', volume: 0.22, delay, out: musicGain })
    musicStep++
    musicAt += STEP
  }
}

export function startMusic() {
  if (musicTimer || !context || context.state !== 'running') return
  musicGain = context.createGain()
  musicGain.gain.value = 0.12
  musicGain.connect(context.destination)
  musicAt = context.currentTime + 0.05
  musicTimer = setInterval(() => !muted && scheduleMusic(), 100)
}

export function stopMusic() {
  clearInterval(musicTimer)
  musicTimer = null
  musicGain?.disconnect()
  musicGain = null
}
