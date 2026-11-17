import { useEffect } from 'react'
import { useMatrix } from '../state/useMatrix.js'
import './system.css'

/** The screen switches off, like a tube, before a link takes the visitor elsewhere. */
export default function Leaving() {
  const leaving = useMatrix((state) => state.leaving)

  // Coming back with the browser's Back button can restore the page as it was
  // left: switched off. Turn it back on.
  useEffect(() => {
    const onPageShow = (event) => {
      if (event.persisted) useMatrix.getState().stay()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  return leaving ? <div className="leaving" aria-hidden="true" /> : null
}
