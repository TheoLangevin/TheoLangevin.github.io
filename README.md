# TheoLangevin.github.io

Portfolio of Théo Langevin, plus **Shardstorm**, a 3D arena survival game. Built with [React](https://react.dev), [Vite](https://vite.dev) and [React Three Fiber](https://r3f.docs.pmnd.rs).

## Development

```bash
npm install
npm run dev      # local dev server (portfolio on /, game on /game.html)
npm test         # unit tests of the game engine
npm run build    # production build in dist/
npm run preview  # serve the production build locally
```

## Project layout

The site has two pages, each with its own entry point, so the game's 3D libraries are never loaded by the portfolio.

```
index.html              portfolio page
game.html               game page
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
```

### How the game is wired

- **The engine knows nothing about rendering.** `engine/step.js` mutates a plain `world` object from an input (`moveX`, `moveY`, `dash`, aim). That makes it deterministic for a given seed and testable without a browser (`engine/__tests__`).
- **The engine emits events** (`hit`, `kill`, `levelUp`...) instead of playing sounds or spawning particles. `feedback/handleEvents.js` decides how each one looks and sounds.
- **The scene never re-renders during play.** Components read the world inside `useFrame` and write straight into instanced meshes; only the small HUD snapshot goes through the store, ten times a second.
- **Balance lives in `config/`.** Adding an enemy or an upgrade is a new entry in a data file.

## Deployment

Every push to `main` runs the tests, builds the site and publishes it to GitHub Pages through `.github/workflows/deploy.yml`.

The repository's Pages source must be set to **GitHub Actions** (Settings → Pages → Build and deployment → Source).
