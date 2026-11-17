/**
 * All the sound of the experience, synthesised with the Web Audio API: there
 * are no audio files to download. Effects are short oscillator sweeps and
 * bursts of filtered noise; the ambience is a slow drone with a hiss of "rain".
 *
 * Browsers only allow sound after a user gesture, so nothing plays until
 * `unlockAudio()` has been called from one.
 */

const VOLUME = 0.8

let context = null
let master = null
let noiseBuffer = null
let muted = false
let ambience = null
const lastPlayed = new Map()

export function unlockAudio() {
  if (!context) {
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
    if (!AudioContextClass) return
    try {
      context = new AudioContextClass()
    } catch {
      return
    }
    master = context.createGain()
    master.gain.value = muted ? 0 : VOLUME
    master.connect(context.destination)

    noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
    const samples = noiseBuffer.getChannelData(0)
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
  }
  if (context.state === 'suspended') context.resume().catch(() => {})
}

export function setMuted(value) {
  muted = value
  if (master) master.gain.setTargetAtTime(muted ? 0 : VOLUME, context.currentTime, 0.04)
}

/** Silences everything while the tab is in the background. */
export function suspendAudio() {
  if (context?.state === 'running') context.suspend().catch(() => {})
}

export function resumeAudio() {
  if (context?.state === 'suspended') context.resume().catch(() => {})
}

const audible = () => context !== null && context.state === 'running' && !muted

/* ---------- Building blocks ---------- */

function envelope(gain, start, duration, attack = 0.004, destination = master) {
  const node = context.createGain()
  node.gain.setValueAtTime(0.0001, start)
  node.gain.exponentialRampToValueAtTime(gain, start + attack)
  node.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  node.connect(destination)
  return node
}

function tone({ wave = 'sine', from, to = from, duration, gain, delay = 0, attack }) {
  const start = context.currentTime + delay
  const oscillator = context.createOscillator()
  oscillator.type = wave
  oscillator.frequency.setValueAtTime(from, start)
  if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(to, start + duration)
  oscillator.connect(envelope(gain, start, duration, attack))
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

function noise({ duration, gain, filter = 'bandpass', from, to = from, q = 1, delay = 0, attack }) {
  const start = context.currentTime + delay
  const source = context.createBufferSource()
  source.buffer = noiseBuffer
  source.loop = true
  const biquad = context.createBiquadFilter()
  biquad.type = filter
  biquad.Q.value = q
  biquad.frequency.setValueAtTime(from, start)
  if (to !== from) biquad.frequency.exponentialRampToValueAtTime(to, start + duration)
  source.connect(biquad)
  biquad.connect(envelope(gain, start, duration, attack))
  source.start(start, Math.random() * 1.5)
  source.stop(start + duration + 0.02)
}

/** Wraps a sound so it stays silent when muted, and optionally rate-limits it. */
function sound(name, gap, play) {
  return () => {
    if (!audible()) return
    if (gap > 0) {
      const now = context.currentTime
      if (now - (lastPlayed.get(name) ?? -1) < gap) return
      lastPlayed.set(name, now)
    }
    play()
  }
}

/* ---------- Effects ---------- */

export const sfx = {
  /* The old machine */
  key: sound('key', 0.035, () => noise({ duration: 0.02, gain: 0.022, filter: 'highpass', from: 2400 })),
  tick: sound('tick', 0.025, () => tone({ wave: 'square', from: 1300, duration: 0.014, gain: 0.012 })),
  beep: sound('beep', 0, () => tone({ wave: 'square', from: 880, duration: 0.15, gain: 0.03 })),
  disk: sound('disk', 0, () => {
    for (let i = 0; i < 5; i++) {
      noise({ duration: 0.022, gain: 0.03, from: 1400 + Math.random() * 900, q: 4, delay: i * 0.04 + Math.random() * 0.02 })
    }
  }),
  powerOn: sound('powerOn', 0, () => {
    tone({ from: 95, to: 38, duration: 0.22, gain: 0.22 }) // the relay thunk
    noise({ duration: 0.07, gain: 0.12, filter: 'lowpass', from: 500 })
    noise({ duration: 0.55, gain: 0.016, filter: 'highpass', from: 5200, delay: 0.05 }) // static crackle
    tone({ wave: 'triangle', from: 5200, to: 10500, duration: 0.9, gain: 0.0035, delay: 0.05, attack: 0.3 }) // tube whine
    tone({ from: 60, to: 120, duration: 0.9, gain: 0.035, delay: 0.1, attack: 0.35 }) // degauss hum
  }),
  staticBurst: sound('static', 0, () => {
    noise({ duration: 0.38, gain: 0.07, filter: 'highpass', from: 1800, to: 6000 })
    tone({ wave: 'sawtooth', from: 110, to: 55, duration: 0.3, gain: 0.04 })
  }),
  modem: sound('modem', 0, () => {
    const notes = [1070, 1270, 2025, 2225, 1650, 980, 1850, 1300, 2100, 1180]
    notes.forEach((frequency, i) => tone({ from: frequency, duration: 0.07, gain: 0.016, delay: i * 0.075 }))
    noise({ duration: 0.8, gain: 0.012, from: 2400, q: 0.6, delay: 0.75, attack: 0.1 })
  }),
  confirm: sound('confirm', 0, () => {
    tone({ wave: 'triangle', from: 660, duration: 0.11, gain: 0.05 })
    tone({ wave: 'triangle', from: 990, duration: 0.22, gain: 0.05, delay: 0.1 })
  }),
  error: sound('error', 0, () => {
    tone({ wave: 'square', from: 196, to: 147, duration: 0.24, gain: 0.04 })
    tone({ wave: 'square', from: 147, duration: 0.24, gain: 0.04, delay: 0.26 })
  }),

  /* Crossing over */
  enter: sound('enter', 0, () => {
    tone({ wave: 'sawtooth', from: 48, to: 420, duration: 1.5, gain: 0.07, attack: 0.5 })
    noise({ duration: 1.7, gain: 0.09, from: 250, to: 6500, q: 0.8, attack: 0.9 })
    tone({ from: 140, to: 28, duration: 1.3, gain: 0.22, delay: 1.35, attack: 0.02 }) // the drop
    noise({ duration: 0.9, gain: 0.05, filter: 'highpass', from: 4200, delay: 1.35 })
  }),
  powerOff: sound('powerOff', 0, () => {
    tone({ from: 420, to: 28, duration: 0.34, gain: 0.12 })
    noise({ duration: 0.09, gain: 0.07, filter: 'lowpass', from: 900 })
  }),

  /* Inside the world */
  step: sound('step', 0.12, () => {
    noise({ duration: 0.05, gain: 0.03, filter: 'lowpass', from: 420 })
    tone({ from: 74, to: 52, duration: 0.07, gain: 0.035 })
  }),
  land: sound('land', 0.1, () => {
    noise({ duration: 0.09, gain: 0.05, filter: 'lowpass', from: 320 })
    tone({ from: 90, to: 40, duration: 0.14, gain: 0.07 })
  }),
  focus: sound('focus', 0.08, () => tone({ from: 1320, to: 1760, duration: 0.05, gain: 0.02 })),
  open: sound('open', 0, () => {
    tone({ from: 260, to: 1180, duration: 0.2, gain: 0.05 })
    noise({ duration: 0.25, gain: 0.02, filter: 'highpass', from: 3600 })
  }),
  close: sound('close', 0, () => tone({ from: 940, to: 230, duration: 0.16, gain: 0.04 })),
  teleport: sound('teleport', 0, () => {
    noise({ duration: 0.5, gain: 0.07, from: 500, to: 7000, q: 1.2 })
    tone({ wave: 'sawtooth', from: 110, to: 880, duration: 0.3, gain: 0.03 })
    tone({ from: 1760, to: 440, duration: 0.3, gain: 0.03, delay: 0.25 })
  }),
  sector: sound('sector', 0.4, () => {
    tone({ wave: 'triangle', from: 110, duration: 0.6, gain: 0.05, attack: 0.05 })
    tone({ wave: 'triangle', from: 165.5, duration: 0.6, gain: 0.035, attack: 0.05 })
    tone({ from: 1320, duration: 0.09, gain: 0.014, delay: 0.05 })
  }),
  deny: sound('deny', 0.2, () => {
    tone({ wave: 'square', from: 220, duration: 0.07, gain: 0.03 })
    tone({ wave: 'square', from: 196, duration: 0.09, gain: 0.03, delay: 0.09 })
  }),
}

/* ---------- Ambience ---------- */

/** Starts the background of the world: a low drone, a hiss, and stray blips. */
export function startAmbience() {
  if (!context || ambience) return
  const now = context.currentTime

  const output = context.createGain()
  output.gain.setValueAtTime(0.0001, now)
  output.gain.exponentialRampToValueAtTime(1, now + 4)
  output.connect(master)

  const lowpass = context.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 190
  lowpass.Q.value = 2.5
  lowpass.connect(output)

  const voices = [
    ['sawtooth', 55, 0.05],
    ['sawtooth', 55.45, 0.05],
    ['sine', 82.6, 0.035],
    ['sine', 110.3, 0.014],
  ]
  const sources = voices.map(([wave, frequency, gain]) => {
    const oscillator = context.createOscillator()
    oscillator.type = wave
    oscillator.frequency.value = frequency
    const level = context.createGain()
    level.gain.value = gain
    oscillator.connect(level)
    level.connect(lowpass)
    oscillator.start()
    return oscillator
  })

  // The filter breathes slowly, so the drone never sits still.
  const breath = context.createOscillator()
  breath.frequency.value = 0.06
  const depth = context.createGain()
  depth.gain.value = 70
  breath.connect(depth)
  depth.connect(lowpass.frequency)
  breath.start()
  sources.push(breath)

  const hiss = context.createBufferSource()
  hiss.buffer = noiseBuffer
  hiss.loop = true
  const hissFilter = context.createBiquadFilter()
  hissFilter.type = 'bandpass'
  hissFilter.frequency.value = 6200
  hissFilter.Q.value = 0.7
  const hissLevel = context.createGain()
  hissLevel.gain.value = 0.0045
  hiss.connect(hissFilter)
  hissFilter.connect(hissLevel)
  hissLevel.connect(output)
  hiss.start()
  sources.push(hiss)

  const blip = () => {
    if (audible()) tone({ from: 1500 + Math.random() * 1900, duration: 0.04, gain: 0.006 + Math.random() * 0.006 })
    ambience.timer = setTimeout(blip, 2500 + Math.random() * 6000)
  }
  ambience = { output, sources, timer: setTimeout(blip, 3000) }
}

export function stopAmbience() {
  if (!ambience) return
  clearTimeout(ambience.timer)
  const { output, sources } = ambience
  ambience = null
  output.gain.setTargetAtTime(0.0001, context.currentTime, 0.2)
  setTimeout(() => {
    for (const source of sources) source.stop()
    output.disconnect()
  }, 900)
}
