# TheoLangevin.github.io

Portfolio of Théo Langevin, built with [React](https://react.dev) and [Vite](https://vite.dev).

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
npm run preview  # serve the production build locally
```

Content (projects, experiences, skills, navigation) lives in `src/data.js`; each page section is a component in `src/components/`.

## Deployment

Every push to `main` builds the site and publishes it to GitHub Pages through `.github/workflows/deploy.yml`.

The repository's Pages source must be set to **GitHub Actions** (Settings → Pages → Build and deployment → Source).
