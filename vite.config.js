import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const page = (file) => fileURLToPath(new URL(file, import.meta.url))

/**
 * GitHub Pages answers /new with a redirect to /new/ (a folder holding an
 * index.html). The Vite dev and preview servers do not, so do it for them.
 */
function folderRedirect(paths) {
  const middleware = (request, response, next) => {
    const [pathname, query] = (request.url ?? '').split('?')
    if (!paths.includes(pathname)) return next()
    response.statusCode = 301
    response.setHeader('Location', `${pathname}/${query ? `?${query}` : ''}`)
    response.end()
  }
  return {
    name: 'folder-redirect',
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  }
}

// User site (theolangevin.github.io) is served from the domain root.
// Four pages: the portfolio (/), the 3D game (/game.html), the immersive
// version of the portfolio (/new) and La Poule Traverse (/poule).
export default defineConfig({
  base: '/',
  plugins: [react(), folderRedirect(['/new', '/poule'])],
  build: {
    // three.js makes the 3D chunks big, but the portfolio never loads them.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: page('./index.html'),
        game: page('./game.html'),
        matrix: page('./new/index.html'),
        poule: page('./poule/index.html'),
      },
    },
  },
  test: {
    include: ['src/**/*.test.js'],
  },
})
