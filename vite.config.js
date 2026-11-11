import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const page = (file) => fileURLToPath(new URL(file, import.meta.url))

// User site (theolangevin.github.io) is served from the domain root.
// Two pages: the portfolio (index.html) and the 3D game (game.html).
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    // three.js makes the game chunk big, but it only loads on /game.html.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: page('./index.html'),
        game: page('./game.html'),
      },
    },
  },
  test: {
    include: ['src/**/*.test.js'],
  },
})
