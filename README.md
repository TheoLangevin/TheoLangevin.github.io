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
    ├── config/         economy, modes, shop catalog, seasons, achievements, levels, timings (data only)
    ├── domain/         the rules: multipliers, fair draws, a round, progression, seasons, saves (pure, tested)
    ├── data/           storage: SQLite (sql.js) in the browser, saved in IndexedDB
    │   ├── store.js      the store contract the service talks to
    │   ├── sqlite/       loader, migrations, every SQL query, SqlDatabase wrapper
    │   ├── memory/       same contract in memory (tests, and fallback without SQLite)
    │   └── persistence/  IndexedDB file and debounced saver
    ├── services/       use cases: play, cash out, buy, equip, reset (the only writer)
    ├── account/        accounts: sync service, cloud contract, Firebase (auth + Firestore)
    ├── state/          zustand stores: the game's UI state, and the account's
    └── ui/             shell (top bar, tab bar, routes), screens (play, shop, ranking, profile), road, sounds
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
- **Progression.** Every lane crossed earns XP (more per lane in harder modes, never more for a bigger bet), which sets the level and the weekly score. Tokens are the only currency: each new level pays a token bonus (level × 10 tokens), achievements pay tokens once, and so do events and seasons. Upgrades change looks and handling, never the odds. A break reminder shows after 30 minutes of play. Migration 4 turned the old feathers into tokens (1 feather = 10 tokens); older saves are converted the same way when they are read.
- **Accounts (Firebase).** Players can sign in with Google to get their progress on every device, a public pseudo and a leaderboard (by level and by best multiplier). The device's SQLite database stays the one the game plays on; the account keeps a copy (a *save*, `domain/save.js`) in Firestore with a revision number. Changes go up a moment after they happen, never during a round; a newer save comes down on sign-in and when the page comes back into focus; when both sides moved since the last sync, the player chooses which to keep. `account/createSyncService.js` holds that logic and is tested against an in-memory cloud. The Firebase SDK is loaded from Google's CDN, pinned in `account/firebase/config.js` with the project's web config (public by design). What protects the data is `firestore.rules`: a save is readable and writable by its owner only, each write must be the next revision, pseudos are unique, and a leaderboard line must match its owner's pseudo and save. Publish the rules from the Firebase console or with `firebase deploy --only firestore:rules`. Without a config (`FIREBASE_CONFIG = null`) the game runs without accounts.
- **Mobile first.** The page is an app: a top bar (level, tokens, account), one screen at a time (Jouer, Boutique, Classement, Profil, kept in the URL hash so the back button works) and a tab bar at thumb height. The play screen never scrolls: figures, the road (which takes the room left), the last rounds and the controls fit one viewport down to an iPhone SE, with safe areas for notches and the home indicator. It installs on the home screen (`public/poule/manifest.webmanifest`, icons) and vibrates on Android. On a computer the same app sits in a phone-width column.
- **Shop.** 50 items, all bought with tokens (hats, neck items, plumages, trails, road themes, confetti palettes, titles shown on the leaderboard, two perks), plus exclusive season rewards. Purchases wait for the round to end. Every item is data in `config/upgrades.js`; the hen's accessories are drawn in `ui/road/sprites.jsx` and road themes are CSS variables in `ui/road/road.css`. A player with less than 200 tokens can take a free refill of 50 tokens, once every 10 minutes.
- **Random events.** After a round (even if a new round has started: an event may interrupt, it is never skipped), now and then (12 % once three rounds have passed since the last one): the wheel of fortune (a few tokens, or a double hen), a tornado that blows in tokens, or a double hen whose next round pays double XP and tokens on every lane, with a twin following on the road. Bonuses only; the odds of a round never change (`config/events.js`, `domain/events.js`, `ui/events/`).
- **Hidden item.** The traffic cone (*Ceci n’est pas un chapeau*) is not listed in the shop: tapping the dressing-room hen five times reveals it, and buying it starts a dance party.
- **Admin stats.** `poule/#admin`, linked from the profile of the admin account only (`config/admin.js`): players (accounts, active 24 h / 7 d / 30 d, sign-ups and activity per day, levels), rounds (return to players against the 95.5 % target, by mode, multipliers, bets), economy, shop, achievements, season claims, and a watch list (returns far above the target, huge wallets). It reads every save (`users/{uid}`, which `firestore.rules` opens to the admin's verified Google address, read only) and counts in the browser (`domain/adminStats.js`). Rounds are the last 1000 of each player.
- **Seasons, leagues and leaderboards.** A big season (`CURRENT_SEASON` in `config/seasons.js`, Saison 1 now) starts everyone at 1000 tokens: any save from an earlier one is reset when read (`seasonReset` in `domain/save.js`), keeping level, items and achievements; players of the beta get the exclusive "Chantier" skin (the hen becomes a traffic cone, cars become bulldozers). Every ISO week (Monday 00:00 UTC) is then settled into league points (PL): 6 × √(weekly XP), capped at 300, plus a rank bonus, minus the league's upkeep; a week without play costs points. PL place the player in 17 divisions, Bronze III to Légende; Maître needs a top-10 week and Légende a first place, whatever the points (`domain/leagues.js`). Each settled week pays the division's reward plus the rank reward (tokens, exclusive items). Boards: the week (with the rival just above you), the daily challenge, leagues, tokens, level, best multiplier. Weekly lines live in `seasons/{week}/entries/{uid}`, daily lines in `daily/{day}/entries/{uid}`.
- **Daily challenge.** Each UTC day: the day's mode (by weekday), a fixed 10-token bet, 3 tries; the best multiplier cashed out counts. The best are paid the next day (`config/daily.js`, `domain/daily.js`).
- **Missions and streak.** Three daily missions, the same for everyone (picked from the date), counted on the day's rounds and paid in tokens; a comeback bonus every day, growing with the streak up to 7 days (`config/missions.js`, `domain/missions.js`, the 🎯 button).
- **Duels.** From a player's profile: both stake the same (25, 100 or 500 tokens), 3 tries in the duel's mode within 24 h, the best multiplier takes both stakes; a tie, refusal or no answer gives stakes back. Duels live in `duels/{id}`, readable and writable by their two players only; each client pays its own side once (`config/duels.js`, `domain/duels.js`, `ui/duels/`).
- **Modes Nuit and Mystère.** Night: lower survival, higher multipliers, cars only visible near the hen. Mystery: a lane's multiplier shows once crossed. Odds are shown for both (`config/modes.js`).
- **Calendar events.** Weekends double XP in Hardcore and Night; in December, a free snowy road and limited Christmas items (`config/calendar.js`). Events never touch the odds.
- **Collection.** Completion in the profile, sets paying tokens once, and a surprise box at a fixed price that gives a cosmetic not owned yet, odds shown by rarity (`config/collection.js`, `domain/collection.js`).
- **Poulaillers and live feed.** Teams of up to 10 whose members' league points add up on their own board (`teams/{id}`), and an "En direct" feed of big cash-outs, full crossings, duel wins and promotions (`feed/{id}`), both on the ranking screen (`ui/social/`).
- **Game server.** For signed-in players, every action runs on Cloud Functions (`functions/src/index.js`): the `game` callable rebuilds the player's game from their save with the very same game service as the browser (bundled from `src/poule`), applies the action in a Firestore transaction with the server's own randomness, keeps the round in progress and its secret road in `activeRounds/{uid}`, and publishes the leaderboard lines, duel scores and big wins. Week, daily and duel results are computed there, never taken from the client. `firestore.rules` let no player write their progress. The browser keeps a copy of the save to draw the screens; guests still play on the device. Deployed by `.github/workflows/functions.yml` (needs the `FIREBASE_SERVICE_ACCOUNT` secret); until the server answers, the game falls back to syncing from the device.
- **Updates.** The game checks every few minutes whether a newer bundle is online and offers to reload (`ui/layout/UpdateBanner.jsx`).
- **All-in.** The bet goes up to the whole balance ("Tapis", cents included); the payout cap is 10 million tokens.
- **Provably fair.** The road is drawn from a secret seed whose SHA-256 is shown before the round and revealed after it (`domain/fairness.js`).
- **Tests** cover the rules, the draws and the service (`domain/__tests__`, `services/__tests__`), on the in-memory store.
