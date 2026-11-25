import { useEffect, useState } from 'react'
import { isNativeApp } from '../../platform.js'

const BUNDLE = /assets\/poule-[\w-]+\.js/
const EVERY = 5 * 60_000

/**
 * Tells the player when a newer version of the game is online (the page's
 * bundle name changed), so an installed app or an old tab never stays behind.
 */
export default function UpdateBanner() {
  const [stale, setStale] = useState(false)

  useEffect(() => {
    const mine = [...document.scripts].map((script) => script.src.match(BUNDLE)?.[0]).find(Boolean)
    if (!mine || isNativeApp()) return undefined // dev build, or the app (updated by its store)
    let last = 0
    const check = async () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 60_000) return
      last = Date.now()
      try {
        const html = await fetch(location.pathname, { cache: 'no-store' }).then((response) => response.text())
        const online = html.match(BUNDLE)?.[0]
        if (online && online !== mine) setStale(true)
      } catch {
        /* offline: try again later */
      }
    }
    const timer = setInterval(check, EVERY)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    check()
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])

  if (!stale) return null
  return (
    <div className="update-banner" role="status">
      <span>Nouvelle version du jeu disponible</span>
      <button type="button" onClick={() => location.reload()}>
        Mettre à jour
      </button>
    </div>
  )
}
