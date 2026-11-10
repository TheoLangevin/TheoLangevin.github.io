import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import './game.css'

/* ---------- Tuning ---------- */

const LANES = [-2.5, 0, 2.5]
const SPAWN_Z = -70
const DESPAWN_Z = 8
const MENU_SPEED = 8
const BASE_SPEED = 14
const MAX_SPEED = 34
const GRAVITY = 34
const JUMP_VELOCITY = 12
const PLAYER_RADIUS = 0.5
const START_LIVES = 3
const INVULNERABLE_SECONDS = 1.6
const BEST_KEY = 'tl-gem-dash-best'

const COLORS = {
  night: 0x0e1020,
  floor: '#141731',
  gridLine: '#3a2fa8',
  lane: 0x7a5cff,
  player: 0x8f7bff,
  playerGlow: 0x5b3df5,
  low: 0xff5a5f,
  tall: 0xff9f1c,
  gem: 0xffd84d,
  pillar: 0x1b1f45,
}

/* ---------- Helpers ---------- */

const $ = (id) => document.getElementById(id)
const rand = (min, max) => min + Math.random() * (max - min)
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function writeBest(value) {
  try {
    localStorage.setItem(BEST_KEY, String(value))
  } catch {
    /* storage unavailable: the best score just isn't remembered */
  }
}

function makeGridTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const g = canvas.getContext('2d')
  g.fillStyle = COLORS.floor
  g.fillRect(0, 0, 128, 128)
  g.strokeStyle = COLORS.gridLine
  g.lineWidth = 3
  g.strokeRect(0, 0, 128, 128)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/* ---------- Game ---------- */

function init() {
  const stage = $('stage')

  let renderer
  try {
    renderer = new WebGLRenderer({ antialias: true })
  } catch {
    $('menu').hidden = true
    $('no-webgl').hidden = false
    return
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  stage.appendChild(renderer.domElement)

  const scene = new Scene()
  scene.background = new Color(COLORS.night)
  scene.fog = new Fog(COLORS.night, 25, 85)

  const camera = new PerspectiveCamera(60, 1, 0.1, 200)
  const baseCamera = { x: 0, y: 5, z: 9 }

  scene.add(new AmbientLight(0xffffff, 1.4))
  const sun = new DirectionalLight(0xffffff, 2)
  sun.position.set(4, 10, 6)
  scene.add(sun)

  /* Ground and lane lines */
  const gridTexture = makeGridTexture()
  gridTexture.repeat.set(6, 50)
  const ground = new Mesh(new PlaneGeometry(24, 200), new MeshBasicMaterial({ map: gridTexture }))
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0, 0, -80)
  scene.add(ground)

  const laneMaterial = new MeshBasicMaterial({ color: COLORS.lane })
  for (const x of [-1.25, 1.25]) {
    const line = new Mesh(new BoxGeometry(0.08, 0.02, 200), laneMaterial)
    line.position.set(x, 0.02, -80)
    scene.add(line)
  }

  /* Side pillars: pure decoration that sells the speed */
  const pillarGeometry = new BoxGeometry(1, 1, 1)
  const pillarMaterial = new MeshStandardMaterial({
    color: COLORS.pillar,
    emissive: 0x241a7a,
    emissiveIntensity: 0.7,
  })
  const pillars = Array.from({ length: 26 }, () => {
    const mesh = new Mesh(pillarGeometry, pillarMaterial)
    placePillar(mesh, rand(-150, 5))
    scene.add(mesh)
    return mesh
  })

  function placePillar(mesh, z) {
    const height = rand(2, 9)
    const width = rand(1, 2.4)
    mesh.scale.set(width, height, width)
    mesh.position.set((Math.random() < 0.5 ? -1 : 1) * rand(9, 16), height / 2, z)
  }

  /* Player */
  const player = new Group()
  const ball = new Mesh(
    new IcosahedronGeometry(PLAYER_RADIUS, 1),
    new MeshStandardMaterial({
      color: COLORS.player,
      emissive: COLORS.playerGlow,
      emissiveIntensity: 0.8,
      flatShading: true,
    }),
  )
  player.add(ball)
  player.add(new PointLight(COLORS.player, 25, 12))
  scene.add(player)

  const shadow = new Mesh(
    new CircleGeometry(PLAYER_RADIUS, 24),
    new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.03
  scene.add(shadow)

  /* Obstacles and gems */
  const obstacleSpecs = {
    low: {
      geometry: new BoxGeometry(1.8, 1.2, 1.6),
      material: new MeshStandardMaterial({ color: COLORS.low, emissive: COLORS.low, emissiveIntensity: 0.35 }),
      height: 1.2,
    },
    tall: {
      geometry: new BoxGeometry(1.8, 2.6, 1.6),
      material: new MeshStandardMaterial({ color: COLORS.tall, emissive: COLORS.tall, emissiveIntensity: 0.35 }),
      height: 2.6,
    },
  }
  const gemGeometry = new OctahedronGeometry(0.42)
  const gemMaterial = new MeshStandardMaterial({
    color: COLORS.gem,
    emissive: COLORS.gem,
    emissiveIntensity: 0.6,
    flatShading: true,
  })

  let obstacles = []
  let gems = []

  function addObstacle(laneIndex, z, type) {
    const spec = obstacleSpecs[type]
    const mesh = new Mesh(spec.geometry, spec.material)
    mesh.position.set(LANES[laneIndex], spec.height / 2, z)
    scene.add(mesh)
    obstacles.push({ mesh, height: spec.height, halfWidth: 0.9, halfDepth: 0.8 })
  }

  function addGem(laneIndex, z) {
    const mesh = new Mesh(gemGeometry, gemMaterial)
    mesh.position.set(LANES[laneIndex], 1.1, z)
    scene.add(mesh)
    gems.push(mesh)
  }

  function clearWorld() {
    for (const o of obstacles) scene.remove(o.mesh)
    for (const g of gems) scene.remove(g)
    obstacles = []
    gems = []
  }

  function spawnRow(z = SPAWN_Z) {
    const order = [0, 1, 2].sort(() => Math.random() - 0.5)
    const hard = Math.random() < 0.3 + Math.min(0.3, state.distance / 3000)
    const blocked = order.slice(0, hard ? 2 : 1)
    const free = order.slice(hard ? 2 : 1)

    for (const lane of blocked) {
      addObstacle(lane, z, Math.random() < 0.3 ? 'tall' : 'low')
    }
    if (Math.random() < 0.85) {
      const lane = free[Math.floor(Math.random() * free.length)]
      const count = 4 + Math.floor(Math.random() * 3)
      for (let i = 0; i < count; i++) addGem(lane, z - 4 - i * 2.2)
    }
  }

  /* ---------- State ---------- */

  const state = {
    mode: 'menu', // menu | playing | over
    canRestart: true,
    speed: 0,
    distance: 0,
    gems: 0,
    lives: START_LIVES,
    lane: 1,
    x: 0,
    y: 0,
    vy: 0,
    invulnerable: 0,
    nextSpawn: 0,
    shake: 0,
    time: 0,
  }
  let best = readBest()
  let overTimer = 0

  const hud = {
    score: $('score'),
    gems: $('gems'),
    best: $('best'),
    lives: [$('life-0'), $('life-1'), $('life-2')],
  }
  const textCache = new Map()
  function setText(node, value) {
    const text = String(value)
    if (textCache.get(node) !== text) {
      node.textContent = text
      textCache.set(node, text)
    }
  }

  const getScore = () => Math.floor(state.distance / 2) + state.gems * 10

  function renderHud() {
    setText(hud.score, getScore())
    setText(hud.gems, state.gems)
    setText(hud.best, best)
    hud.lives.forEach((dot, i) => dot.classList.toggle('life--lost', i >= state.lives))
  }

  function startGame() {
    clearTimeout(overTimer)
    clearWorld()
    Object.assign(state, {
      mode: 'playing',
      canRestart: false,
      distance: 0,
      gems: 0,
      lives: START_LIVES,
      lane: 1,
      x: 0,
      y: 0,
      vy: 0,
      invulnerable: 0,
      shake: 0,
    })
    spawnRow(-45)
    state.nextSpawn = 25
    $('menu').hidden = true
    $('over').hidden = true
    renderHud()
  }

  function endGame() {
    state.mode = 'over'
    state.shake = 0.8
    const score = getScore()
    const record = score > best
    if (record) {
      best = score
      writeBest(best)
    }
    setText(hud.best, best)
    overTimer = setTimeout(() => {
      $('final-score').textContent = score
      $('final-best').textContent = best
      $('new-best').hidden = !record
      $('over').hidden = false
      state.canRestart = true
      $('retry-btn').focus({ preventScroll: true })
    }, 600)
  }

  function changeLane(direction) {
    if (state.mode !== 'playing') return
    state.lane = clamp(state.lane + direction, 0, LANES.length - 1)
  }

  function jump() {
    if (state.mode !== 'playing' || state.y > 0) return
    state.vy = JUMP_VELOCITY
  }

  function hit() {
    state.lives -= 1
    state.invulnerable = INVULNERABLE_SECONDS
    state.shake = 0.6
    if (state.lives <= 0) endGame()
  }

  /* ---------- Update ---------- */

  function update(dt) {
    state.time += dt
    const playing = state.mode === 'playing'

    const cruise =
      state.mode === 'menu'
        ? MENU_SPEED
        : state.mode === 'over'
          ? 0
          : Math.min(MAX_SPEED, BASE_SPEED + state.distance / 80)
    state.speed += (cruise - state.speed) * Math.min(1, dt * (state.mode === 'over' ? 4 : 1.5))
    const step = state.speed * dt

    /* Scenery */
    gridTexture.offset.y = (gridTexture.offset.y + step / 4) % 1
    for (const pillar of pillars) {
      pillar.position.z += step
      if (pillar.position.z > DESPAWN_Z + 6) placePillar(pillar, pillar.position.z - 160)
    }

    /* Player movement */
    state.x += (LANES[state.lane] - state.x) * Math.min(1, dt * 14)
    if (state.y > 0 || state.vy > 0) {
      state.vy -= GRAVITY * dt
      state.y += state.vy * dt
      if (state.y <= 0) {
        state.y = 0
        state.vy = 0
      }
    }
    if (state.invulnerable > 0) state.invulnerable -= dt
    const bob = state.mode === 'menu' ? Math.sin(state.time * 3) * 0.08 : 0
    player.position.set(state.x, PLAYER_RADIUS + state.y + bob, 0)
    player.visible = state.invulnerable <= 0 || Math.floor(state.time * 14) % 2 === 0
    ball.rotation.x -= step * 0.45
    ball.rotation.z = (state.x - LANES[state.lane]) * 0.3
    shadow.position.x = state.x
    shadow.scale.setScalar(1 / (1 + state.y * 0.7))

    if (playing) {
      state.distance += step
      state.nextSpawn -= step
      if (state.nextSpawn <= 0) {
        spawnRow()
        state.nextSpawn = 14 + state.speed * 0.5 + Math.random() * 6
      }
    }

    /* Obstacles */
    if (state.mode !== 'menu') {
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i]
        o.mesh.position.z += step
        if (o.mesh.position.z > DESPAWN_Z) {
          scene.remove(o.mesh)
          obstacles.splice(i, 1)
          continue
        }
        if (
          playing &&
          state.invulnerable <= 0 &&
          Math.abs(o.mesh.position.z) < o.halfDepth + PLAYER_RADIUS * 0.8 &&
          Math.abs(o.mesh.position.x - state.x) < o.halfWidth + PLAYER_RADIUS * 0.8 &&
          state.y < o.height - 0.1
        ) {
          hit()
        }
      }

      /* Gems */
      for (let i = gems.length - 1; i >= 0; i--) {
        const gem = gems[i]
        gem.position.z += step
        gem.rotation.y += dt * 3
        if (gem.position.z > DESPAWN_Z) {
          scene.remove(gem)
          gems.splice(i, 1)
          continue
        }
        if (
          playing &&
          Math.abs(gem.position.z) < 1 &&
          Math.abs(gem.position.x - state.x) < 1 &&
          Math.abs(gem.position.y - (PLAYER_RADIUS + state.y)) < 1.2
        ) {
          scene.remove(gem)
          gems.splice(i, 1)
          state.gems += 1
        }
      }
    }

    /* Camera */
    state.shake = Math.max(0, state.shake - dt * 2.5)
    camera.position.set(
      baseCamera.x + state.x * 0.3 + (Math.random() - 0.5) * state.shake * 0.6,
      baseCamera.y + (Math.random() - 0.5) * state.shake * 0.6,
      baseCamera.z,
    )
    camera.lookAt(state.x * 0.2, 1, -8)

    if (playing) renderHud()
  }

  /* ---------- Rendering loop ---------- */

  function resize() {
    const width = stage.clientWidth || window.innerWidth
    const height = stage.clientHeight || window.innerHeight
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    const portrait = camera.aspect < 0.9
    camera.fov = portrait ? 75 : 60
    baseCamera.y = portrait ? 6.5 : 5
    baseCamera.z = portrait ? 12 : 9
    camera.updateProjectionMatrix()
  }
  window.addEventListener('resize', resize)
  resize()

  let last = performance.now()
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    update(dt)
    renderer.render(scene, camera)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  /* ---------- Input ---------- */

  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
    const onControl = event.target instanceof Element && event.target.closest('button, a')

    if (state.mode !== 'playing') {
      if ((key === 'Enter' || key === ' ') && !onControl && state.canRestart) {
        event.preventDefault()
        startGame()
      }
      return
    }

    switch (key) {
      case 'ArrowLeft':
      case 'a':
        event.preventDefault()
        changeLane(-1)
        break
      case 'ArrowRight':
      case 'd':
        event.preventDefault()
        changeLane(1)
        break
      case 'ArrowUp':
      case 'w':
      case ' ':
        event.preventDefault()
        jump()
        break
      default:
    }
  })

  let swipe = null
  stage.addEventListener('pointerdown', (event) => {
    swipe = { x: event.clientX, y: event.clientY }
  })
  stage.addEventListener('pointerup', (event) => {
    if (!swipe) return
    const dx = event.clientX - swipe.x
    const dy = event.clientY - swipe.y
    swipe = null
    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) changeLane(dx > 0 ? 1 : -1)
    else if (dy < -30 || (Math.abs(dx) < 10 && Math.abs(dy) < 10)) jump()
  })
  stage.addEventListener('pointercancel', () => {
    swipe = null
  })

  $('btn-left').addEventListener('pointerdown', () => changeLane(-1))
  $('btn-right').addEventListener('pointerdown', () => changeLane(1))
  $('btn-jump').addEventListener('pointerdown', jump)
  $('start-btn').addEventListener('click', startGame)
  $('retry-btn').addEventListener('click', startGame)

  renderHud()
  $('start-btn').focus({ preventScroll: true })
}

init()
