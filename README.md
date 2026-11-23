# TheoLangevin.github.io

Portfolio of Théo Langevin, an immersive 3D version of it, **Shardstorm**, a 3D arena survival game, and **La Poule Traverse**, a small road-crossing game played with fake tokens (/poule/). Built with [React](https://react.dev), [Vite](https://vite.dev) and [React Three Fiber](https://r3f.docs.pmnd.rs).

## Development

```bash
npm install
npm run dev      # local dev server (portfolio on /, game on /game.html, immersive site on /new, La Poule Traverse on /poule)
npm test         # unit tests (game engine, immersive world, La Poule Traverse)
npm run build    # production build in dist/
npm run preview  # serve the production build locally
```

## Project layout

The site has four pages, each with its own entry point, so the 3D libraries are never loaded by the portfolio.

```
index.html              portfolio page
game.html               game page
new/index.html          immersive version of the portfolio (/new)
poule/index.html        La Poule Traverse (/poule)
src/
├── shared/styles/      design tokens, reset and buttons used by both pages
├── portfolio/
│   ├── main.jsx        entry point
│   ├── App.jsx         page composition
│   ├── content.js      all the text: projects, experiences, skills, links
│   ├── sections/       one component + stylesheet per section
│   ├── styles/         page-wide layout (bento tiles)
│   └── assets/         images
└── game/
    ├── main.jsx        entry point
    ├── GameApp.jsx     3D canvas + interface layered on top
    ├── config/         balance, enemies, upgrades, waves (data only)
    ├── engine/         the simulation: plain JavaScript, no React, no three.js
    │   ├── step.js     advances the world by one frame
    │   └── systems/    player, enemies, weapons, projectiles, pickups, spawner...
    ├── scene/          React Three Fiber components that draw the world
    ├── feedback/       particles, shockwaves, camera shake, event reactions
    ├── audio/          sound effects synthesised with Web Audio
    ├── input/          keyboard, mouse and touch state
    ├── state/          zustand store (screens, HUD, settings) and persistence
    └── ui/             HUD, menus, upgrade picker, touch controls
└── matrix/             the immersive version (/new)
    ├── main.jsx        entry point
    ├── MatrixApp.jsx   boot screen, then the 3D world with its interface on top
    ├── content/        the map of the world: sectors and nodes, built from portfolio/content.js
    ├── boot/           the old computer: self test, link sequence, CRT effects
    ├── world/          React Three Fiber scene (lazy-loaded while the machine boots)
    │   ├── environment/  floor grid, code rain, sky, towers, mist, particles
    │   ├── structures/   one 3D structure per section: projects, log, stack, portals...
    │   ├── player/       first-person movement (physics.js is plain, tested JavaScript)
    │   ├── interaction/  what the visitor looks at, clicks and walks through
    │   ├── shaders/      GLSL of the floor, rain, holograms and portals
    │   └── fx/           bloom and glitches, adaptive quality
    ├── panels/         holographic windows: content, directory, pause menu
    ├── hud/            heads-up display, radar, touch controls
    ├── textmode/       the same content without 3D, for devices without WebGL 2
    ├── audio/          sounds synthesised with Web Audio (no audio files)
    ├── input/          keyboard, mouse capture and touch state
    └── state/          zustand store and the visitor's body (rig)
└── poule/              La Poule Traverse (/poule)
    ├── main.jsx        entry point
    ├── PouleApp.jsx    page layout
    ├── config/         economy, modes, upgrades, achievements, levels, timings (data only)
    ├── domain/         the rules: multipliers, provably fair draws, a round, progression (pure, tested)
    ├── data/           storage: SQLite (sql.js) in the browser, saved in IndexedDB
    │   ├── store.js      the store contract the service talks to
    │   ├── sqlite/       loader, migrations, every SQL query, SqlDatabase wrapper
    │   ├── memory/       same contract in memory (tests, and fallback without SQLite)
    │   └── persistence/  IndexedDB file and debounced saver
    ├── services/       use cases: play, cash out, buy, equip, reset (the only writer)
    ├── state/          zustand store: UI state and animation timing
    └── ui/             road, controls, shop, panels, sounds, hooks, formatting
```

### How the game is wired

- **The engine knows nothing about rendering.** `engine/step.js` mutates a plain `world` object from an input (`moveX`, `moveY`, `dash`, aim). That makes it deterministic for a given seed and testable without a browser (`engine/__tests__`).
- **The engine emits events** (`hit`, `kill`, `levelUp`...) instead of playing sounds or spawning particles. `feedback/handleEvents.js` decides how each one looks and sounds.
- **The scene never re-renders during play.** Components read the world inside `useFrame` and write straight into instanced meshes; only the small HUD snapshot goes through the store, ten times a second.
- **Balance lives in `config/`.** Adding an enemy or an upgrade is a new entry in a data file.

### The immersive version (/new)

`/new` opens on an old computer booting, then drops the visitor into a 3D world where every section of the portfolio is a place: the identity core in the middle of the plaza, the projects in the Archive, the experiences in the Log, the skills in the Core, and the links as portals (contact, the game, back to the classic site). Its content comes from `src/portfolio/content.js`, so editing the portfolio updates both versions; `src/matrix/content/profile.js` repeats the few texts written inline in the portfolio's sections, and a test fails if they drift apart.

- Controls: ZQSD or WASD (key positions, so any layout works), mouse to look, E or click to interact, Shift to run, Space to jump, Tab for the directory (fast travel), Esc for the menu, M for sound. On touch screens: left thumb moves, right thumb looks, tap or ACCESS to interact.
- Without WebGL 2, or if the 3D world fails to load, the boot screen offers a text mode with the same content.
- Graphics adapt to the device and step down by themselves when the frame rate drops; the menu can pin a level.
- URL options, handy when developing: `?skipboot` skips the boot sequence, `?skipintro` skips the dive into the world, `?quality=high|medium|low` pins the graphics.

## Deployment

Every push to `main` runs the tests, builds the site and publishes it to GitHub Pages through `.github/workflows/deploy.yml`.

The repository's Pages source must be set to **GitHub Actions** (Settings → Pages → Build and deployment → Source).

### La Poule Traverse (/poule)

A road-crossing game played with fake tokens: pick a bet and a difficulty, the hen crosses lane by lane, each lane raises the multiplier, cash out before a car gets her. It returns 95.5 % of the bets on average, and the page says so, with the visitor's own observed return.

- **Layers, one direction.** `ui → state → services → domain`, and `services → data`. The domain knows nothing about React or storage; the service is the only code that writes to the database; the UI only calls the zustand store.
- **SQLite in the browser.** The database is a real SQLite file run by [sql.js](https://sql.js.org) (WebAssembly), kept in IndexedDB and saved a moment after each write. Its schema is versioned (`data/sqlite/migrations.js`, `PRAGMA user_version`): change it by adding a migration, never by editing one. All SQL lives in `data/sqlite/queries.js`. Money is stored in integer cents, and every bet or payout is written in the same transaction as its round, so a reload cannot lose a bet or pay twice; a round left in progress is resumed on the same road.
- **sql.js comes from cdnjs**, pinned in `data/sqlite/loadSqlJs.js`, so it is not an npm dependency. If it cannot load, the game runs on the in-memory store and says it will not be saved.
- **Progression.** Every lane crossed earns feathers (more per lane in harder modes, never more for a bigger bet), which are also experience for the level. Feathers buy upgrades in the hen house: hats, plumage, trails, and two perks (faster hops, auto cash-out at a chosen multiplier). Upgrades change looks and handling, never the odds. Achievements pay feathers once. A break reminder shows after 30 minutes of play. Migration 2 adds the tables and gives existing players the feathers their past rounds earned.
- **On a phone** the Play and Cash out buttons sit in a bar fixed at the bottom of the screen, and a tap on the road moves the hen.
- **Provably fair.** The road is drawn from a secret seed whose SHA-256 is shown before the round and revealed after it (`domain/fairness.js`).
- **Tests** cover the rules, the draws and the service (`domain/__tests__`, `services/__tests__`), on the in-memory store.
