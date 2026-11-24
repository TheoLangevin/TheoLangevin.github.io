import { useCallback, useEffect, useState } from 'react'

/** The app's screens, by the hash that opens them (#boutique...). `admin` has no tab: it is opened from the profile. */
export const ROUTES = Object.freeze(['jouer', 'boutique', 'classement', 'profil', 'admin'])

const read = () => {
  const hash = location.hash.slice(1)
  return ROUTES.includes(hash) ? hash : 'jouer'
}

/**
 * The open screen, kept in the URL hash so the browser's back button and a
 * shared link work. Returns [route, go].
 */
export function useRoute() {
  const [route, setRoute] = useState(read)

  useEffect(() => {
    const onChange = () => setRoute(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const go = useCallback((next) => {
    if (next === read()) return
    if (next === 'jouer') history.pushState(null, '', location.pathname + location.search)
    else location.hash = next
    setRoute(next)
  }, [])

  return [route, go]
}
