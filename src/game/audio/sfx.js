/**
 * Sound effects synthesised with the Web Audio API: no audio files to load.
 * Each sound is a short oscillator sweep or a burst of filtered noise.
 */

const SOUNDS = {
  shoot: { wave: 'square', from: 720, to: 380, time: 0.06, gain: 0.035, gap: 0.07 },
  enemyShoot: { wave: 'sawtooth', from: 300, to: 160, time: 0.1, gain: 0.04, gap: 0.1 },
  hit: { noise: 2400, time: 0.04, gain: 0.05, gap: 0.05 },
  kill: { wave: 'triangle', from: 520, to: 110, time: 0.16, gain: 0.09, gap: 0.04 },
  explosion: { noise: 600, time: 0.22, gain: 0.1, gap: 0.08 },
  pickup: { wave: 'sine', from: 880, to: 1320, time: 0.07, gain: 0.05, gap: 0.04 },
  heal: { wave: 'sine', from: 520, to: 1040, time: 0.25, gain: 0.09 },
  hurt: { wave: 'sawtooth', from: 220, to: 60, time: 0.3, gain: 0.14 },
  dash: { noise: 1400, time: 0.16, gain: 0.07 },
  shieldUp: { wave: 'sine', from: 440, to: 880, time: 0.2, gain: 0.05 },
  shieldBreak: { wave: 'triangle', from: 1200, to: 300, time: 0.2, gain: 0.1 },
  levelUp: { wave: 'triangle', notes: [523, 659, 784, 1047], time: 0.09, gain: 0.09 },
  upgrade: { wave: 'sine', notes: [784, 1175], time: 0.08, gain: 0.07 },
  waveStart: { wave: 'triangle', notes: [392, 523], time: 0.12, gain: 0.07 },
  waveClear: { wave: 'triangle', notes: [523, 659, 784], time: 0.1, gain: 0.07 },
  bossSpawn: { wave: 'sawtooth', from: 110, to: 55, time: 0.9, gain: 0.14 },
  bossAttack: { wave: 'square', from: 180, to: 90, time: 0.18, gain: 0.05 },
  bossDown: { noise: 400, time: 0.8, gain: 0.16 },
  gameOver: { wave: 'sawtooth', notes: [392, 330, 262, 196], time: 0.18, gain: 0.1 },
}

let context = null
let master = null
let noiseBuffer = null
let muted = false
const lastPlayed = {}

/** Must be called from a user gesture (browsers block audio otherwise). */
export function unlockAudio() {
  if (context) {
    if (context.state === 'suspended') context.resume()
    return
  }
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
  if (!AudioContextClass) return
  try {
    context = new AudioContextClass()
  } catch {
    return
  }
  master = context.createGain()
  master.gain.value = muted ? 0 : 1
  master.connect(context.destination)

  noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
  const samples = noiseBuffer.getChannelData(0)
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
}

export function setMuted(value) {
  muted = value
  if (master) master.gain.value = muted ? 0 : 1
}

function envelope(gainValue, start, duration) {
  const gain = context.createGain()
  gain.gain.setValueAtTime(gainValue, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  gain.connect(master)
  return gain
}

function tone(wave, from, to, start, duration, gainValue) {
  const oscillator = context.createOscillator()
  oscillator.type = wave
  oscillator.frequency.setValueAtTime(from, start)
  if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(to, start + duration)
  oscillator.connect(envelope(gainValue, start, duration))
  oscillator.start(start)
  oscillator.stop(start + duration)
}

function noise(cutoff, start, duration, gainValue) {
  const source = context.createBufferSource()
  source.buffer = noiseBuffer
  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = cutoff
  source.connect(filter)
  filter.connect(envelope(gainValue, start, duration))
  source.start(start)
  source.stop(start + duration)
}

export function playSfx(name) {
  const sound = SOUNDS[name]
  if (!sound || !context || muted || context.state !== 'running') return

  const now = context.currentTime
  if (sound.gap && now - (lastPlayed[name] ?? -1) < sound.gap) return
  lastPlayed[name] = now

  if (sound.noise) {
    noise(sound.noise, now, sound.time, sound.gain)
  } else if (sound.notes) {
    sound.notes.forEach((frequency, i) => {
      tone(sound.wave, frequency, frequency, now + i * sound.time, sound.time * 1.6, sound.gain)
    })
  } else {
    tone(sound.wave, sound.from, sound.to, now, sound.time, sound.gain)
  }
}
